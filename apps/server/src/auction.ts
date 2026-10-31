import { BUY_NOW_CUTOFF } from '@food-auction/shared';
import type { PoolClient } from 'pg';
import { config } from './config.js';
import { pool, tx } from './db.js';
import { broadcast, sendToUser } from './hub.js';
import { payments } from './payments.js';

export class AuctionError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
  }
}

interface ListingRow {
  id: string;
  title: string;
  status: string;
  round: number;
  reserve_cents: number;
  increment_cents: number;
  buy_now_cents: number | null;
  current_bid_cents: number | null;
  high_bidder_id: string | null;
  restaurant_id: string;
  ends_at: Date;
  expires_at: Date;
}

const lockListing = async (client: PoolClient, id: string) => {
  const { rows } = await client.query<ListingRow>('SELECT * FROM listings WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw new AuctionError('Listing not found', 404);
  return rows[0];
};

async function assertCanBuy(client: PoolClient, listing: ListingRow, userId: string) {
  const { rows } = await client.query(
    'SELECT role, payment_method_id FROM users WHERE id = $1',
    [userId],
  );
  if (rows[0]?.role !== 'customer') throw new AuctionError('Only customers can buy food', 403);
  if (!rows[0].payment_method_id) throw new AuctionError('Add a card before bidding', 402);
  const noShow = await client.query(
    `SELECT 1 FROM orders WHERE listing_id = $1 AND user_id = $2 AND status = 'no_show'`,
    [listing.id, userId],
  );
  if (noShow.rowCount) throw new AuctionError('You missed the pickup for this item', 403);
}

export async function placeBid(listingId: string, userId: string, amountCents: number) {
  let outbidUser: string | null = null;
  let title = '';
  await tx(async (client) => {
    const listing = await lockListing(client, listingId);
    title = listing.title;
    if (listing.status !== 'active' || listing.ends_at.getTime() <= Date.now()) {
      throw new AuctionError('This auction has ended');
    }
    await assertCanBuy(client, listing, userId);
    if (listing.high_bidder_id === userId) throw new AuctionError('You are already the highest bidder');

    const minimum = listing.current_bid_cents === null
      ? listing.reserve_cents
      : listing.current_bid_cents + listing.increment_cents;
    if (amountCents < minimum) throw new AuctionError(`Bid must be at least ${minimum} cents`);
    if (listing.buy_now_cents !== null && amountCents >= listing.buy_now_cents) {
      throw new AuctionError('Use Buy Now instead');
    }

    await client.query(
      'INSERT INTO bids (listing_id, user_id, amount_cents, round) VALUES ($1, $2, $3, $4)',
      [listingId, userId, amountCents, listing.round],
    );
    // Late bids push the end back, but never past the food's time limit.
    await client.query(
      `UPDATE listings SET
         current_bid_cents = $2,
         high_bidder_id = $3,
         ends_at = CASE
           WHEN ends_at < now() + make_interval(secs => $4)
           THEN LEAST(now() + make_interval(secs => $4), expires_at)
           ELSE ends_at END
       WHERE id = $1`,
      [listingId, amountCents, userId, config.extensionSeconds],
    );
    outbidUser = listing.high_bidder_id;
  });
  if (outbidUser) sendToUser(outbidUser, { type: 'bid.outbid', listingId, title });
  broadcast({ type: 'listing.updated', listingId });
}

async function chargeUser(userId: string, amountCents: number, key: string) {
  const { rows } = await pool.query(
    'SELECT stripe_customer_id, payment_method_id FROM users WHERE id = $1',
    [userId],
  );
  return payments.charge(
    { stripeCustomerId: rows[0].stripe_customer_id, paymentMethodId: rows[0].payment_method_id },
    amountCents,
    key,
  );
}

async function recordSale(
  listingId: string,
  round: number,
  userId: string,
  amountCents: number,
  kind: 'auction' | 'buy_now',
  paymentId: string,
) {
  await tx(async (client) => {
    await client.query(
      `INSERT INTO orders (listing_id, user_id, amount_cents, kind, status, payment_id, round, pickup_deadline)
       VALUES ($1, $2, $3, $4, 'awaiting_pickup', $5, $6, now() + make_interval(secs => $7))`,
      [listingId, userId, amountCents, kind, paymentId, round, config.pickupSeconds],
    );
    await client.query(
      `UPDATE listings SET status = 'sold', current_bid_cents = $2, high_bidder_id = $3 WHERE id = $1`,
      [listingId, amountCents, userId],
    );
  });
  if (round > 0) await refundNoShow(listingId, round, amountCents);
}

// A resold item must not stay paid for twice, so the no-show gets the resale amount back.
async function refundNoShow(listingId: string, round: number, resaleCents: number) {
  const { rows } = await pool.query(
    `SELECT id, amount_cents, payment_id FROM orders
     WHERE listing_id = $1 AND round = $2 AND status = 'no_show'`,
    [listingId, round - 1],
  );
  const original = rows[0];
  if (!original) return;
  const amount = Math.min(resaleCents, original.amount_cents);
  const refundId = await payments.refund(original.payment_id, amount);
  await pool.query(
    `INSERT INTO refunds (order_id, amount_cents, refund_id, reason) VALUES ($1, $2, $3, 'resold_after_no_show')`,
    [original.id, amount, refundId],
  );
}

async function settleAuction(listing: ListingRow) {
  const { rows: bidders } = await pool.query<{ user_id: string; amount_cents: number }>(
    `SELECT DISTINCT ON (user_id) user_id, amount_cents FROM bids
     WHERE listing_id = $1 AND round = $2
     ORDER BY user_id, amount_cents DESC`,
    [listing.id, listing.round],
  );
  bidders.sort((a, b) => b.amount_cents - a.amount_cents);

  for (const bidder of bidders) {
    const charge = await chargeUser(
      bidder.user_id,
      bidder.amount_cents,
      `listing-${listing.id}-${listing.round}-${bidder.user_id}`,
    );
    if (charge.ok) {
      await recordSale(listing.id, listing.round, bidder.user_id, bidder.amount_cents, 'auction', charge.paymentId!);
      sendToUser(bidder.user_id, {
        type: 'auction.won',
        listingId: listing.id,
        title: listing.title,
        amountCents: bidder.amount_cents,
      });
      return;
    }
    await pool.query(
      `INSERT INTO orders (listing_id, user_id, amount_cents, kind, status, round)
       VALUES ($1, $2, $3, 'auction', 'payment_failed', $4)`,
      [listing.id, bidder.user_id, bidder.amount_cents, listing.round],
    );
    sendToUser(bidder.user_id, { type: 'payment.failed', listingId: listing.id, title: listing.title });
  }
  await pool.query(`UPDATE listings SET status = 'unsold' WHERE id = $1`, [listing.id]);
}

export async function buyNow(listingId: string, userId: string) {
  const listing = await tx(async (client) => {
    const row = await lockListing(client, listingId);
    if (row.status !== 'active' || row.ends_at.getTime() <= Date.now()) {
      throw new AuctionError('This auction has ended');
    }
    await assertCanBuy(client, row, userId);
    if (row.buy_now_cents === null) throw new AuctionError('Buy Now is not offered on this item');
    if ((row.current_bid_cents ?? 0) >= row.buy_now_cents * BUY_NOW_CUTOFF) {
      throw new AuctionError('Buy Now is no longer available');
    }
    await client.query(`UPDATE listings SET status = 'closing' WHERE id = $1`, [listingId]);
    return row;
  });

  const amount = listing.buy_now_cents!;
  const charge = await chargeUser(userId, amount, `buynow-${listingId}-${listing.round}-${userId}`);
  if (!charge.ok) {
    await pool.query(`UPDATE listings SET status = 'active' WHERE id = $1`, [listingId]);
    broadcast({ type: 'listing.updated', listingId });
    throw new AuctionError(charge.error ?? 'Card declined', 402);
  }
  await recordSale(listingId, listing.round, userId, amount, 'buy_now', charge.paymentId!);
  broadcast({ type: 'listing.updated', listingId });
}

export async function closeDueAuctions() {
  const { rows } = await pool.query<ListingRow>(
    `UPDATE listings SET status = 'closing'
     WHERE status = 'active' AND ends_at <= now() RETURNING *`,
  );
  for (const listing of rows) {
    await settleAuction(listing);
    broadcast({ type: 'listing.updated', listingId: listing.id });
  }
  return rows.length;
}

export async function markNoShows() {
  const { rows } = await pool.query<{ listing_id: string; user_id: string }>(
    `UPDATE orders SET status = 'no_show'
     WHERE status = 'awaiting_pickup' AND pickup_deadline <= now()
     RETURNING listing_id, user_id`,
  );
  for (const order of rows) {
    await pool.query('UPDATE users SET no_show_count = no_show_count + 1 WHERE id = $1', [order.user_id]);
    await pool.query(`UPDATE listings SET status = 'no_show_review' WHERE id = $1`, [order.listing_id]);
    broadcast({ type: 'listing.updated', listingId: order.listing_id });
  }
  return rows.length;
}

export async function reviewNoShow(listingId: string, restaurantId: string, stillSafe: boolean) {
  const reopened = await tx(async (client) => {
    const listing = await lockListing(client, listingId);
    if (listing.restaurant_id !== restaurantId) throw new AuctionError('Not your listing', 403);
    if (listing.status !== 'no_show_review') throw new AuctionError('Nothing to review');

    const endsAt = new Date(Math.min(
      Date.now() + config.auctionSeconds * 1000,
      listing.expires_at.getTime(),
    ));
    const canRelist = stillSafe && listing.round === 0 && listing.expires_at.getTime() > Date.now();
    if (!canRelist) {
      await client.query(`UPDATE listings SET status = 'closed' WHERE id = $1`, [listingId]);
      return false;
    }
    await client.query(
      `UPDATE listings SET status = 'active', round = round + 1, current_bid_cents = NULL,
         high_bidder_id = NULL, ends_at = $2 WHERE id = $1`,
      [listingId, endsAt],
    );
    return true;
  });
  broadcast({ type: 'listing.updated', listingId });
  return reopened;
}

export async function confirmPickup(userId: string, pickupToken: string) {
  const { rows } = await pool.query<{ id: string; title: string }>(
    `SELECT o.id, l.title FROM orders o
     JOIN listings l ON l.id = o.listing_id
     JOIN restaurants r ON r.id = l.restaurant_id
     WHERE o.user_id = $1 AND r.pickup_token = $2
       AND o.status = 'awaiting_pickup' AND o.pickup_deadline > now()`,
    [userId, pickupToken],
  );
  if (!rows.length) throw new AuctionError('No order ready for pickup here', 404);
  for (const order of rows) {
    await pool.query(`UPDATE orders SET status = 'picked_up' WHERE id = $1`, [order.id]);
    await pool.query('INSERT INTO pickup_events (order_id) VALUES ($1)', [order.id]);
  }
  return rows;
}

// Runs at startup so a crash mid-close can't strand a listing; charge keys prevent double billing.
export async function recoverClosing() {
  await pool.query(`UPDATE listings SET status = 'active' WHERE status = 'closing'`);
}

export function startAuctionLoop() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await closeDueAuctions();
      await markNoShows();
    } catch (error) {
      console.error('Auction loop failed', error);
    } finally {
      running = false;
    }
  }, 1000);
  return () => clearInterval(timer);
}

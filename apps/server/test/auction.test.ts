import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  buyNow,
  closeDueAuctions,
  confirmPickup,
  markNoShows,
  placeBid,
  reviewNoShow,
} from '../src/auction.js';
import { pool } from '../src/db.js';
import { startEmbedded } from '../src/embedded.js';
import { migrate } from '../src/migrate.js';

let database: Awaited<ReturnType<typeof startEmbedded>>;
let restaurantId: string;
let pickupToken: string;

const user = async (email: string, card: string | null = 'mock_card') => {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, payment_method_id)
     VALUES ($1, 'x', $1, 'customer', $2) RETURNING id`,
    [email, card],
  );
  return rows[0].id as string;
};

const listing = async (overrides: { buyNow?: number | null; endsIn?: number; expiresIn?: number } = {}) => {
  const { rows } = await pool.query(
    `INSERT INTO listings (restaurant_id, title, allergens, source, reserve_cents, increment_cents,
       buy_now_cents, ends_at, expires_at)
     VALUES ($1, 'Pizza', ARRAY['wheat'], 'surplus', 500, 50, $2,
       now() + make_interval(secs => $3), now() + make_interval(secs => $4))
     RETURNING id`,
    [restaurantId, overrides.buyNow === undefined ? 1000 : overrides.buyNow, overrides.endsIn ?? 300, overrides.expiresIn ?? 600],
  );
  return rows[0].id as string;
};

const row = async (id: string) => (await pool.query('SELECT * FROM listings WHERE id = $1', [id])).rows[0];
const orders = async (id: string) =>
  (await pool.query('SELECT * FROM orders WHERE listing_id = $1 ORDER BY created_at', [id])).rows;
const endNow = (id: string) => pool.query(`UPDATE listings SET ends_at = now() - interval '1 second' WHERE id = $1`, [id]);
const missPickup = (id: string) =>
  pool.query(`UPDATE orders SET pickup_deadline = now() - interval '1 second' WHERE listing_id = $1`, [id]);

beforeAll(async () => {
  database = await startEmbedded('.pgdata-test', 54330, 'food_auction_test');
  await migrate();
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, restaurants, listings, bids, orders, pickup_events, refunds CASCADE');
  const { rows: owner } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ('r@test', 'x', 'r', 'restaurant') RETURNING id`,
  );
  const { rows } = await pool.query(
    `INSERT INTO restaurants (owner_id, name) VALUES ($1, 'Test Pizza') RETURNING id, pickup_token`,
    [owner[0].id],
  );
  restaurantId = rows[0].id;
  pickupToken = rows[0].pickup_token;
});

afterAll(async () => {
  await pool.end();
  await database.stop();
});

describe('bidding', () => {
  it('requires a saved card', async () => {
    const id = await listing();
    const noCard = await user('a@test', null);
    await expect(placeBid(id, noCard, 500)).rejects.toThrow('Add a card');
  });

  it('enforces the opening and increment minimums', async () => {
    const id = await listing();
    const a = await user('a@test');
    const b = await user('b@test');
    await expect(placeBid(id, a, 499)).rejects.toThrow('at least 500');
    await placeBid(id, a, 500);
    await expect(placeBid(id, b, 549)).rejects.toThrow('at least 550');
    await placeBid(id, b, 550);
    expect((await row(id)).high_bidder_id).toBe(b);
  });

  it('accepts exactly one of many simultaneous equal bids', async () => {
    const id = await listing();
    const users = await Promise.all(Array.from({ length: 10 }, (_, i) => user(`u${i}@test`)));
    const results = await Promise.allSettled(users.map((u) => placeBid(id, u, 500)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM bids WHERE listing_id = $1', [id]);
    expect(rows[0].n).toBe(1);
  });

  it('extends a late bid, capped at the food time limit', async () => {
    const a = await user('a@test');
    const extended = await listing({ endsIn: 5, expiresIn: 600 });
    await placeBid(extended, a, 500);
    const seconds = ((await row(extended)).ends_at.getTime() - Date.now()) / 1000;
    expect(seconds).toBeGreaterThan(25);

    const capped = await listing({ endsIn: 5, expiresIn: 10 });
    await placeBid(capped, a, 500);
    const updated = await row(capped);
    expect(updated.ends_at.getTime()).toBe(updated.expires_at.getTime());
  });
});

describe('closing', () => {
  it('marks a listing with no bids as unsold', async () => {
    const id = await listing();
    await endNow(id);
    await closeDueAuctions();
    expect((await row(id)).status).toBe('unsold');
    expect(await orders(id)).toHaveLength(0);
  });

  it('falls back to the next bidder when a charge fails', async () => {
    const id = await listing();
    const low = await user('low@test');
    const high = await user('high@test', 'mock_declined');
    await placeBid(id, low, 500);
    await placeBid(id, high, 700);
    await endNow(id);
    await closeDueAuctions();

    const all = await orders(id);
    expect(all.map((o) => o.status)).toEqual(['payment_failed', 'awaiting_pickup']);
    expect(all[1].user_id).toBe(low);
    expect((await row(id)).current_bid_cents).toBe(500);
  });

  it('is unsold when every charge fails', async () => {
    const id = await listing();
    await placeBid(id, await user('bad@test', 'mock_declined'), 500);
    await endNow(id);
    await closeDueAuctions();
    expect((await row(id)).status).toBe('unsold');
  });
});

describe('buy now', () => {
  it('ends the auction immediately', async () => {
    const id = await listing();
    await buyNow(id, await user('a@test'));
    expect((await row(id)).status).toBe('sold');
    expect((await orders(id))[0].amount_cents).toBe(1000);
  });

  it('disappears at 80% of the Buy Now price', async () => {
    const id = await listing();
    const a = await user('a@test');
    await placeBid(id, a, 800);
    await expect(buyNow(id, await user('b@test'))).rejects.toThrow('no longer available');
  });

  it('reopens the listing when the card is declined', async () => {
    const id = await listing();
    await expect(buyNow(id, await user('bad@test', 'mock_declined'))).rejects.toThrow('declined');
    expect((await row(id)).status).toBe('active');
  });

  it('sells to only one of two simultaneous buyers', async () => {
    const id = await listing();
    const buyers = [await user('a@test'), await user('b@test')];
    const results = await Promise.allSettled(buyers.map((b) => buyNow(id, b)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await orders(id)).toHaveLength(1);
  });
});

describe('pickup and no-shows', () => {
  const sell = async (id: string, buyer: string) => {
    await placeBid(id, buyer, 600);
    await endNow(id);
    await closeDueAuctions();
  };

  it('confirms pickup with the right QR token only', async () => {
    const id = await listing();
    const a = await user('a@test');
    await sell(id, a);
    await expect(confirmPickup(a, 'wrong')).rejects.toThrow('No order');
    await expect(confirmPickup(await user('b@test'), pickupToken)).rejects.toThrow('No order');
    await confirmPickup(a, pickupToken);
    expect((await orders(id))[0].status).toBe('picked_up');
  });

  it('rejects a pickup after the deadline', async () => {
    const id = await listing();
    const a = await user('a@test');
    await sell(id, a);
    await missPickup(id);
    await expect(confirmPickup(a, pickupToken)).rejects.toThrow('No order');
  });

  it('re-auctions a no-show and refunds the resale amount', async () => {
    const id = await listing();
    const first = await user('first@test');
    await sell(id, first);
    await missPickup(id);
    await markNoShows();
    expect((await row(id)).status).toBe('no_show_review');

    expect(await reviewNoShow(id, restaurantId, true)).toBe(true);
    const reopened = await row(id);
    expect(reopened).toMatchObject({ status: 'active', round: 1, current_bid_cents: null });

    await expect(placeBid(id, first, 500)).rejects.toThrow('missed the pickup');
    const second = await user('second@test');
    await placeBid(id, second, 500);
    await endNow(id);
    await closeDueAuctions();

    const all = await orders(id);
    expect(all.map((o) => o.status)).toEqual(['no_show', 'awaiting_pickup']);
    const { rows: refunds } = await pool.query('SELECT * FROM refunds');
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({ order_id: all[0].id, amount_cents: 500 });
  });

  it('caps the refund at what the no-show paid', async () => {
    const id = await listing();
    await sell(id, await user('first@test'));
    await missPickup(id);
    await markNoShows();
    await reviewNoShow(id, restaurantId, true);
    await buyNow(id, await user('second@test'));
    const { rows } = await pool.query('SELECT amount_cents FROM refunds');
    expect(rows[0].amount_cents).toBe(600);
  });

  it('closes the item when staff say it is unsafe, without a refund', async () => {
    const id = await listing();
    await sell(id, await user('first@test'));
    await missPickup(id);
    await markNoShows();
    expect(await reviewNoShow(id, restaurantId, false)).toBe(false);
    expect((await row(id)).status).toBe('closed');
    expect((await pool.query('SELECT 1 FROM refunds')).rowCount).toBe(0);
  });

  it('only re-auctions once', async () => {
    const id = await listing();
    await sell(id, await user('first@test'));
    await missPickup(id);
    await markNoShows();
    await reviewNoShow(id, restaurantId, true);
    await placeBid(id, await user('second@test'), 600);
    await endNow(id);
    await closeDueAuctions();
    await missPickup(id);
    await markNoShows();
    expect(await reviewNoShow(id, restaurantId, true)).toBe(false);
  });
});

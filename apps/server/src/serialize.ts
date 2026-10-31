import type { Listing, Order, User } from '@food-auction/shared';

export const listingSql = `SELECT l.*, r.name AS restaurant_name
  FROM listings l JOIN restaurants r ON r.id = l.restaurant_id`;

export const orderSql = `SELECT o.*, l.title, r.name AS restaurant_name,
    COALESCE((SELECT sum(amount_cents) FROM refunds WHERE order_id = o.id), 0)::int AS refunded_cents
  FROM orders o
  JOIN listings l ON l.id = o.listing_id
  JOIN restaurants r ON r.id = l.restaurant_id`;

export const toUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  cardLast4: row.card_last4,
});

export const toListing = (row: any): Listing => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  restaurantName: row.restaurant_name,
  title: row.title,
  description: row.description,
  category: row.category,
  allergens: row.allergens,
  quantity: row.quantity,
  source: row.source,
  photoUrl: row.photo_url,
  reserveCents: row.reserve_cents,
  incrementCents: row.increment_cents,
  buyNowCents: row.buy_now_cents,
  currentBidCents: row.current_bid_cents,
  highBidderId: row.high_bidder_id,
  endsAt: row.ends_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  status: row.status,
  round: row.round,
});

export const toOrder = (row: any): Order => ({
  id: row.id,
  listingId: row.listing_id,
  title: row.title,
  restaurantName: row.restaurant_name,
  amountCents: row.amount_cents,
  kind: row.kind,
  status: row.status,
  pickupDeadline: row.pickup_deadline?.toISOString() ?? null,
  refundedCents: row.refunded_cents,
});

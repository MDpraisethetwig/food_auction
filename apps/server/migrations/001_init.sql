CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'restaurant')),
  stripe_customer_id text,
  payment_method_id text,
  card_last4 text,
  no_show_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES users (id),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  pickup_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex')
);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants (id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  allergens text[] NOT NULL CHECK (cardinality(allergens) > 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source text NOT NULL CHECK (source IN ('cancelled', 'surplus')),
  photo_url text,
  reserve_cents integer NOT NULL CHECK (reserve_cents > 0),
  increment_cents integer NOT NULL CHECK (increment_cents > 0),
  buy_now_cents integer CHECK (buy_now_cents > 0),
  current_bid_cents integer,
  high_bidder_id uuid REFERENCES users (id),
  ends_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closing', 'sold', 'unsold', 'no_show_review', 'closed')),
  round integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_active_idx ON listings (status, ends_at);

CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings (id),
  user_id uuid NOT NULL REFERENCES users (id),
  amount_cents integer NOT NULL,
  round integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bids_listing_idx ON bids (listing_id, round, amount_cents DESC);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings (id),
  user_id uuid NOT NULL REFERENCES users (id),
  amount_cents integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('auction', 'buy_now')),
  status text NOT NULL
    CHECK (status IN ('awaiting_pickup', 'picked_up', 'no_show', 'payment_failed')),
  payment_id text,
  round integer NOT NULL,
  pickup_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX orders_one_sale_per_round
  ON orders (listing_id, round) WHERE status <> 'payment_failed';

CREATE TABLE pickup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id),
  amount_cents integer NOT NULL,
  refund_id text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { pool } from './db.js';
import { migrate } from './migrate.js';

const PASSWORD = 'demo1234';

const history = [
  { title: 'Pepperoni pizza slices', category: 'pizza', allergens: ['milk', 'wheat'], sellRate: 0.85, value: 700 },
  { title: 'Margherita pizza', category: 'pizza', allergens: ['milk', 'wheat'], sellRate: 0.75, value: 1100 },
  { title: 'Chicken shawarma wrap', category: 'sandwich', allergens: ['wheat', 'sesame'], sellRate: 0.8, value: 800 },
  { title: 'Butter chicken bowl', category: 'hot meal', allergens: ['milk'], sellRate: 0.7, value: 1200 },
  { title: 'Garden salad', category: 'salad', allergens: ['none'], sellRate: 0.3, value: 650 },
  { title: 'Day-old muffins', category: 'bakery', allergens: ['eggs', 'milk', 'wheat'], sellRate: 0.45, value: 450 },
];

// Small repeatable generator, so every reset shows the same charts.
let state = 42;
const random = () => {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
};

async function createUser(email: string, name: string, role: string, card?: { id: string; last4: string }) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, payment_method_id, card_last4)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [email, hash, name, role, config.stripeSecretKey ? null : card?.id, config.stripeSecretKey ? null : card?.last4],
  );
  return rows[0].id as string;
}

await migrate();
await pool.query('TRUNCATE users, restaurants, listings, bids, orders, pickup_events, refunds CASCADE');

const owner = await createUser('owner@demo.test', 'Priya (owner)', 'restaurant');
const alex = await createUser('alex@demo.test', 'Alex', 'customer', { id: 'mock_card', last4: '4242' });
const sam = await createUser('sam@demo.test', 'Sam', 'customer', { id: 'mock_card', last4: '4242' });
await createUser('casey@demo.test', 'Casey (declined card)', 'customer', { id: 'mock_declined', last4: '0341' });

const { rows: [restaurant] } = await pool.query(
  `INSERT INTO restaurants (owner_id, name, address) VALUES ($1, 'Westdale Slice House', 'King St W, Hamilton') RETURNING id`,
  [owner],
);

for (let day = 30; day >= 1; day -= 1) {
  const count = 3 + Math.floor(random() * 4);
  for (let index = 0; index < count; index += 1) {
    const item = history[Math.floor(random() * history.length)]!;
    const sold = random() < item.sellRate;
    const endedAt = new Date(Date.now() - day * 86400000);
    endedAt.setHours(14 + Math.floor(random() * 8), Math.floor(random() * 60));
    const price = Math.round((item.value * (0.5 + random() * 0.3)) / 25) * 25;

    const { rows: [listing] } = await pool.query(
      `INSERT INTO listings (restaurant_id, title, category, allergens, source, reserve_cents, increment_cents,
         buy_now_cents, current_bid_cents, ends_at, expires_at, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 50, $7, $8, $9, $9, $10, $9) RETURNING id`,
      [
        restaurant.id, item.title, item.category, item.allergens,
        random() < 0.35 ? 'cancelled' : 'surplus',
        Math.round(item.value * 0.4), item.value,
        sold ? price : null, endedAt, sold ? 'sold' : 'unsold',
      ],
    );
    if (sold) {
      await pool.query(
        `INSERT INTO orders (listing_id, user_id, amount_cents, kind, status, payment_id, round, pickup_deadline, created_at)
         VALUES ($1, $2, $3, 'auction', 'picked_up', 'seed', 0, $4, $4)`,
        [listing.id, random() < 0.5 ? alex : sam, price, endedAt],
      );
    }
  }
}

const live = [
  { title: 'Pepperoni pizza (6 slices)', description: 'Made this afternoon, untouched.', category: 'pizza', allergens: ['milk', 'wheat'], source: 'surplus', reserve: 500, buyNow: 1000 },
  { title: 'Chicken shawarma plate', description: 'Cancelled delivery order, freshly made.', category: 'hot meal', allergens: ['sesame'], source: 'cancelled', reserve: 700, buyNow: 1400 },
];
for (const item of live) {
  await pool.query(
    `INSERT INTO listings (restaurant_id, title, description, category, allergens, source, reserve_cents,
       increment_cents, buy_now_cents, ends_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 50, $8, now() + interval '20 minutes', now() + interval '40 minutes')`,
    [restaurant.id, item.title, item.description, item.category, item.allergens, item.source, item.reserve, item.buyNow],
  );
}

await pool.end();
console.log(`Seeded. Sign in with owner@, alex@, sam@ or casey@demo.test, password: ${PASSWORD}`);

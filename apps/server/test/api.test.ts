import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db.js';
import { startEmbedded } from '../src/embedded.js';
import { migrate } from '../src/migrate.js';

let database: Awaited<ReturnType<typeof startEmbedded>>;
let app: Awaited<ReturnType<typeof buildApp>>;

const call = async (method: 'GET' | 'POST', url: string, token?: string, payload?: object) => {
  const response = await app.inject({
    method,
    url,
    payload,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.json() };
};

const register = async (email: string, role: 'customer' | 'restaurant') => {
  const { body } = await call('POST', '/auth/register', undefined, {
    email,
    password: 'password1',
    name: email,
    role,
    restaurantName: role === 'restaurant' ? 'Spot' : undefined,
  });
  return body.token as string;
};

const validListing = {
  title: 'Pizza',
  allergens: ['wheat'],
  source: 'surplus',
  reserveCents: 500,
  incrementCents: 50,
  buyNowCents: 1000,
  timeLimitMinutes: 10,
};

beforeAll(async () => {
  database = await startEmbedded('.pgdata-test', 54330, 'food_auction_test');
  await migrate();
  app = await buildApp();
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, restaurants, listings, bids, orders, pickup_events, refunds CASCADE');
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await database.stop();
});

describe('accounts', () => {
  it('registers, signs in and rejects bad passwords', async () => {
    await register('a@test.com', 'customer');
    const good = await call('POST', '/auth/login', undefined, { email: 'A@test.com', password: 'password1' });
    expect(good.status).toBe(200);
    const bad = await call('POST', '/auth/login', undefined, { email: 'a@test.com', password: 'nope' });
    expect(bad.status).toBe(401);
  });

  it('rejects a duplicate email', async () => {
    await register('a@test.com', 'customer');
    const again = await call('POST', '/auth/register', undefined, {
      email: 'a@test.com', password: 'password1', name: 'x', role: 'customer',
    });
    expect(again.status).toBe(409);
  });

  it('requires sign-in', async () => {
    expect((await call('GET', '/me')).status).toBe(401);
    expect((await call('GET', '/me', 'bad-token')).status).toBe(401);
  });
});

describe('listings', () => {
  it('refuses a listing without allergens', async () => {
    const token = await register('r@test.com', 'restaurant');
    const { status } = await call('POST', '/listings', token, { ...validListing, allergens: [] });
    expect(status).toBe(400);
  });

  it('refuses "none" combined with an allergen', async () => {
    const token = await register('r@test.com', 'restaurant');
    const { status } = await call('POST', '/listings', token, { ...validListing, allergens: ['none', 'milk'] });
    expect(status).toBe(400);
  });

  it('only lets restaurants publish', async () => {
    const token = await register('c@test.com', 'customer');
    const { status } = await call('POST', '/listings', token, validListing);
    expect(status).toBe(403);
  });

  it('runs bid to dashboard through the API', async () => {
    const owner = await register('r@test.com', 'restaurant');
    const buyer = await register('c@test.com', 'customer');
    const { body: { id } } = await call('POST', '/listings', owner, validListing);

    expect((await call('POST', `/listings/${id}/bids`, buyer, { amountCents: 500 })).status).toBe(402);
    await call('POST', '/me/card/confirm', buyer, {});
    expect((await call('POST', `/listings/${id}/bids`, buyer, { amountCents: 500 })).status).toBe(200);
    expect((await call('POST', `/listings/${id}/buy-now`, buyer)).status).toBe(200);

    const dashboard = await call('GET', '/restaurant/dashboard', owner);
    expect(dashboard.body.orders).toHaveLength(1);
    expect(dashboard.body.analytics).toMatchObject({ sold: 1, recoveredCents: 1000 });

    const { pickupToken } = dashboard.body.restaurant;
    expect((await call('POST', '/pickup', buyer, { token: pickupToken })).status).toBe(200);
    expect((await call('GET', '/orders', buyer)).body[0].status).toBe('picked_up');
  });

  it('keeps one restaurant out of another\'s no-show review', async () => {
    const owner = await register('r@test.com', 'restaurant');
    const other = await register('r2@test.com', 'restaurant');
    const { body: { id } } = await call('POST', '/listings', owner, validListing);
    await pool.query(`UPDATE listings SET status = 'no_show_review' WHERE id = $1`, [id]);
    expect((await call('POST', `/listings/${id}/review`, other, { stillSafe: true })).status).toBe(403);
  });
});

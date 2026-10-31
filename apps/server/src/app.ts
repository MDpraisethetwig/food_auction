import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { ALLERGENS } from '@food-auction/shared';
import bcrypt from 'bcryptjs';
import Fastify, { type FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { z, ZodError } from 'zod';
import { draftListing } from './ai.js';
import { restaurantAnalytics } from './analytics.js';
import { AuctionError, buyNow, confirmPickup, placeBid, reviewNoShow } from './auction.js';
import { config } from './config.js';
import { pool, tx } from './db.js';
import { addSocket, broadcast } from './hub.js';
import { payments, stripe } from './payments.js';
import { listingSql, orderSql, toListing, toOrder, toUser } from './serialize.js';

const imageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const sign = (userId: string) => jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' });

function verify(token: string | undefined) {
  if (!token) return null;
  try {
    return (jwt.verify(token, config.jwtSecret) as { sub: string }).sub;
  } catch {
    return null;
  }
}

function userId(request: FastifyRequest) {
  const id = verify(request.headers.authorization?.replace('Bearer ', ''));
  if (!id) throw new AuctionError('Please sign in', 401);
  return id;
}

async function restaurantFor(request: FastifyRequest) {
  const { rows } = await pool.query('SELECT * FROM restaurants WHERE owner_id = $1', [userId(request)]);
  if (!rows[0]) throw new AuctionError('Restaurant account required', 403);
  return rows[0];
}

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['customer', 'restaurant']),
  restaurantName: z.string().min(1).optional(),
});

const listingBody = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(300).default(''),
  category: z.string().default('other'),
  allergens: z.array(z.enum(ALLERGENS)).min(1),
  quantity: z.number().int().positive().default(1),
  source: z.enum(['cancelled', 'surplus']),
  photoUrl: z.string().regex(/^\/uploads\/[\w-]+\.(jpg|png|webp)$/).nullable().default(null),
  reserveCents: z.number().int().positive(),
  incrementCents: z.number().int().positive(),
  buyNowCents: z.number().int().positive().nullable().default(null),
  timeLimitMinutes: z.number().int().positive().max(24 * 60),
}).refine((body) => !(body.allergens.includes('none') && body.allergens.length > 1), {
  message: '"none" cannot be combined with other allergens',
}).refine((body) => body.buyNowCents === null || body.buyNowCents > body.reserveCents, {
  message: 'Buy Now must be above the starting price',
});

export async function buildApp() {
  const app = Fastify({ logger: false });
  mkdirSync(config.uploadsDir, { recursive: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  await app.register(fastifyStatic, { root: config.uploadsDir, prefix: '/uploads/' });
  await app.register(websocket);

  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: error.issues[0]?.message ?? 'Invalid request' });
    }
    if (error instanceof AuctionError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    console.error(error);
    return reply.status(500).send({ error: 'Something went wrong' });
  });

  app.get('/ws', { websocket: true }, (socket, request) => {
    addSocket(socket, verify((request.query as { token?: string }).token));
  });

  app.get('/config', async () => ({
    paymentsMode: payments.mode,
    stripePublishableKey: config.stripePublishableKey,
    demoMode: config.demoMode,
  }));

  app.post('/auth/register', async (request) => {
    const body = registerBody.parse(request.body);
    if (body.role === 'restaurant' && !body.restaurantName) {
      throw new AuctionError('Restaurant name is required');
    }
    const hash = await bcrypt.hash(body.password, 10);
    const user = await tx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES (lower($1), $2, $3, $4)
         ON CONFLICT (email) DO NOTHING RETURNING *`,
        [body.email, hash, body.name, body.role],
      );
      if (!rows[0]) throw new AuctionError('That email is already registered', 409);
      if (body.role === 'restaurant') {
        await client.query('INSERT INTO restaurants (owner_id, name) VALUES ($1, $2)', [rows[0].id, body.restaurantName]);
      }
      return rows[0];
    });
    return { token: sign(user.id), user: toUser(user) };
  });

  app.post('/auth/login', async (request) => {
    const body = z.object({ email: z.string(), password: z.string() }).parse(request.body);
    const { rows } = await pool.query('SELECT * FROM users WHERE email = lower($1)', [body.email]);
    if (!rows[0] || !(await bcrypt.compare(body.password, rows[0].password_hash))) {
      throw new AuctionError('Wrong email or password', 401);
    }
    return { token: sign(rows[0].id), user: toUser(rows[0]) };
  });

  app.get('/me', async (request) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId(request)]);
    if (!rows[0]) throw new AuctionError('Please sign in', 401);
    return toUser(rows[0]);
  });

  app.post('/me/card/setup', async (request) => {
    const id = userId(request);
    if (!stripe) return { mode: 'mock' };
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    let customerId: string = rows[0].stripe_customer_id;
    if (!customerId) {
      customerId = (await stripe.customers.create({ email: rows[0].email })).id;
      await pool.query('UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [id, customerId]);
    }
    const setup = await stripe.setupIntents.create({ customer: customerId, usage: 'off_session' });
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2024-06-20' },
    );
    return {
      mode: 'stripe',
      customerId,
      setupIntentClientSecret: setup.client_secret,
      ephemeralKey: ephemeralKey.secret,
    };
  });

  app.post('/me/card/confirm', async (request) => {
    const id = userId(request);
    const body = z.object({ declined: z.boolean().default(false) }).parse(request.body ?? {});
    let paymentMethodId = body.declined ? 'mock_declined' : 'mock_card';
    let last4 = body.declined ? '0341' : '4242';
    if (stripe) {
      const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [id]);
      const cards = await stripe.paymentMethods.list({ customer: rows[0].stripe_customer_id, type: 'card' });
      const card = cards.data[0];
      if (!card) throw new AuctionError('No card was saved');
      paymentMethodId = card.id;
      last4 = card.card?.last4 ?? '';
    }
    const { rows } = await pool.query(
      'UPDATE users SET payment_method_id = $2, card_last4 = $3 WHERE id = $1 RETURNING *',
      [id, paymentMethodId, last4],
    );
    return toUser(rows[0]);
  });

  app.get('/listings', async () => {
    const { rows } = await pool.query(`${listingSql} WHERE l.status = 'active' ORDER BY l.ends_at`);
    return rows.map(toListing);
  });

  app.get('/listings/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { rows } = await pool.query(`${listingSql} WHERE l.id = $1`, [id]);
    if (!rows[0]) throw new AuctionError('Listing not found', 404);
    return toListing(rows[0]);
  });

  app.post('/listings/draft', async (request) => {
    await restaurantFor(request);
    const file = await request.file();
    const extension = file && imageTypes[file.mimetype];
    if (!file || !extension) throw new AuctionError('Upload a JPEG, PNG or WebP photo');
    const image = await file.toBuffer();
    const filename = `${randomUUID()}.${extension}`;
    writeFileSync(resolve(config.uploadsDir, filename), image);
    return { photoUrl: `/uploads/${filename}`, draft: await draftListing(image, file.mimetype) };
  });

  app.post('/listings', async (request) => {
    const restaurant = await restaurantFor(request);
    const body = listingBody.parse(request.body);
    const expiresAt = Date.now() + body.timeLimitMinutes * 60 * 1000;
    // Outside demo mode the auction stops early enough to leave time for pickup.
    const endsAt = config.demoMode
      ? Math.min(Date.now() + config.auctionSeconds * 1000, expiresAt)
      : expiresAt - config.pickupSeconds * 1000;
    if (endsAt <= Date.now()) throw new AuctionError('Time limit is too short to allow for pickup');

    const { rows } = await pool.query(
      `INSERT INTO listings (restaurant_id, title, description, category, allergens, quantity, source,
         photo_url, reserve_cents, increment_cents, buy_now_cents, ends_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [
        restaurant.id, body.title, body.description, body.category, body.allergens, body.quantity, body.source,
        body.photoUrl, body.reserveCents, body.incrementCents, body.buyNowCents,
        new Date(endsAt), new Date(expiresAt),
      ],
    );
    broadcast({ type: 'listing.updated', listingId: rows[0].id });
    return { id: rows[0].id };
  });

  app.post('/listings/:id/bids', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { amountCents } = z.object({ amountCents: z.number().int().positive() }).parse(request.body);
    await placeBid(id, userId(request), amountCents);
    return { ok: true };
  });

  app.post('/listings/:id/buy-now', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await buyNow(id, userId(request));
    return { ok: true };
  });

  app.post('/listings/:id/review', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { stillSafe } = z.object({ stillSafe: z.boolean() }).parse(request.body);
    const restaurant = await restaurantFor(request);
    return { reopened: await reviewNoShow(id, restaurant.id, stillSafe) };
  });

  app.get('/orders', async (request) => {
    const { rows } = await pool.query(
      `${orderSql} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
      [userId(request)],
    );
    return rows.map(toOrder);
  });

  app.post('/pickup', async (request) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(request.body);
    return { orders: await confirmPickup(userId(request), token) };
  });

  app.get('/restaurant/dashboard', async (request) => {
    const restaurant = await restaurantFor(request);
    const listings = await pool.query(
      `${listingSql} WHERE l.restaurant_id = $1 AND l.status IN ('active', 'closing', 'no_show_review')
       ORDER BY l.ends_at`,
      [restaurant.id],
    );
    const orders = await pool.query(
      `${orderSql} WHERE l.restaurant_id = $1 AND o.status <> 'payment_failed'
       ORDER BY o.created_at DESC LIMIT 25`,
      [restaurant.id],
    );
    return {
      restaurant: { id: restaurant.id, name: restaurant.name, pickupToken: restaurant.pickup_token },
      listings: listings.rows.map(toListing),
      orders: orders.rows.map(toOrder),
      analytics: await restaurantAnalytics(restaurant.id),
    };
  });

  return app;
}

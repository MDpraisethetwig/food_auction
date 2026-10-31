import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));
export const serverRoot = resolve(here, '..');

dotenv.config({ path: resolve(serverRoot, '../../.env') });

const demoMode = (process.env.DEMO_MODE ?? 'true') === 'true';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:4000',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:54329/food_auction',
  jwtSecret: process.env.JWT_SECRET ?? 'local-demo-secret',
  demoMode,
  auctionSeconds: demoMode ? 60 : 30 * 60,
  pickupSeconds: demoMode ? 30 : 30 * 60,
  extensionSeconds: 30,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  uploadsDir: resolve(serverRoot, 'uploads'),
};

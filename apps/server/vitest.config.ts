import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:54330/food_auction_test',
      DEMO_MODE: 'true',
      STRIPE_SECRET_KEY: '',
      GEMINI_API_KEY: '',
    },
  },
});

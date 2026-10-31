import { startEmbedded } from './embedded.js';

const server = await startEmbedded('.pgdata', 54329, 'food_auction');
console.log('PostgreSQL running on localhost:54329 (database: food_auction). Ctrl+C to stop.');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}

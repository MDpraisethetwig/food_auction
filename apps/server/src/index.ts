import { buildApp } from './app.js';
import { recoverClosing, startAuctionLoop } from './auction.js';
import { config } from './config.js';
import { migrate } from './migrate.js';
import { payments } from './payments.js';

await migrate();
await recoverClosing();

const app = await buildApp();
await app.listen({ port: config.port, host: '127.0.0.1' });
startAuctionLoop();

console.log(`API on http://localhost:${config.port}`);
console.log(`Payments: ${payments.mode}. AI drafts: ${config.geminiApiKey ? 'on' : 'off (manual entry)'}.`);
console.log(`Demo timers: ${config.demoMode ? 'on' : 'off'}.`);

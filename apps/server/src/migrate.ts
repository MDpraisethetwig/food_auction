import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serverRoot } from './config.js';
import { pool } from './db.js';

export async function migrate() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const folder = resolve(serverRoot, 'migrations');
  for (const name of readdirSync(folder).filter((file) => file.endsWith('.sql')).sort()) {
    const { rowCount } = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (rowCount) continue;
    await pool.query(readFileSync(resolve(folder, name), 'utf8'));
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate();
  await pool.end();
  console.log('Migrations applied.');
}

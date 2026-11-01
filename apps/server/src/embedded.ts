import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import pg from 'pg';
import { serverRoot } from './config.js';

const packageDir = resolve(serverRoot, '../../node_modules/@embedded-postgres/darwin-arm64');
const bin = (name: string) => join(packageDir, 'native', 'bin', name);

async function waitForServer(port: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const client = new pg.Client({
      connectionString: `postgres://postgres:postgres@localhost:${port}/postgres`,
    });
    try {
      await client.connect();
      return client;
    } catch {
      await client.end().catch(() => {});
      await new Promise((done) => setTimeout(done, 200));
    }
  }
  throw new Error(`PostgreSQL did not start on port ${port}`);
}

export async function startEmbedded(folder: string, port: number, database: string) {
  const dataDir = resolve(serverRoot, folder);
  if (!existsSync(join(dataDir, 'PG_VERSION'))) {
    mkdirSync(dataDir, { recursive: true });
    const passwordFile = join(tmpdir(), `food-auction-pg-${process.pid}`);
    writeFileSync(passwordFile, 'postgres');
    execFileSync(bin('initdb'), [
      '-D', dataDir,
      '-U', 'postgres',
      '-A', 'password',
      '-E', 'UTF8',
      '--locale=C',
      `--pwfile=${passwordFile}`,
    ], { stdio: 'ignore' });
  }

  const child = spawn(bin('postgres'), ['-D', dataDir, '-p', String(port)], { stdio: 'ignore' });
  const admin = await waitForServer(port);
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
  if (!rowCount) await admin.query(`CREATE DATABASE ${database}`);
  await admin.end();

  return {
    stop: () =>
      new Promise<void>((done) => {
        if (child.exitCode !== null || child.signalCode !== null) return done();
        child.once('exit', () => done());
        try {
          execFileSync(bin('pg_ctl'), ['stop', '-D', dataDir, '-m', 'fast'], { stdio: 'ignore' });
        } catch {
          // Ctrl+C also reaches PostgreSQL directly, so it may already be shutting down.
        }
      }),
  };
}

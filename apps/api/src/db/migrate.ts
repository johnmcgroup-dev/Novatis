import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDbPool, withTransaction } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../migrations');

const pool = createDbPool();
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
for (const file of files) {
  const version = file.split('_')[0];
  const exists = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
  if (exists.rowCount) continue;
  const sql = await readFile(path.join(migrationsDir, file), 'utf8');
  await withTransaction(pool, async (client) => {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
  });
  console.log(`Applied ${file}`);
}
await pool.end();

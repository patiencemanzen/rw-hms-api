import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  if (existsSync('.env.test')) process.loadEnvFile('.env.test');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.includes('test')) {
    throw new Error(
      'E2E tests must run against a dedicated test database (DATABASE_URL in .env.test)',
    );
  }

  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, '../../src/database/migrations'),
    });
  } finally {
    await pool.end();
  }
}

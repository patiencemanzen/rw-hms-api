import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../schema';
import type { SeedDatabase } from './types/seed.types';

export async function resetDatabase(db: SeedDatabase): Promise<void> {
  const tableNames = Object.values(schema as Record<string, unknown>)
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => `"${getTableName(table)}"`);

  // TRUNCATE bypasses the row-level append-only trigger on audit_logs, which is intended for dev reseeding.
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`));
}

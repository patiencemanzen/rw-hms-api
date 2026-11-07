import { hash } from 'argon2';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { seedActivity } from './activity.seed';
import { seedClinicalRecords } from './clinical.seed';
import { USERS } from './data/users.data';
import { seedFacilities } from './facilities.seed';
import { seedPatients } from './patients.seed';
import { SeededRandom } from './random';
import { seedReferenceData } from './reference.seed';
import { resetDatabase } from './reset.seed';
import { loadSeedEnv } from './seed-env';
import { seedTransfers } from './transfers.seed';
import { seedUsers } from './users.seed';
import type { SeedContext } from './types/seed.types';
import { seedWards } from './wards.seed';

const RANDOM_SEED = 20261030;

async function main(): Promise<void> {
  const env = loadSeedEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    console.log('Resetting database...');
    await resetDatabase(db);

    const ctx: SeedContext = {
      db,
      random: new SeededRandom(RANDOM_SEED),
      passwordHash: await hash(env.SEED_DEFAULT_PASSWORD),
    };

    console.log('Seeding...');
    await seedReferenceData(db);
    const facilityIds = await seedFacilities(db);
    const userIds = await seedUsers(ctx, facilityIds);
    const patients = await seedPatients(ctx, facilityIds, userIds);
    await seedClinicalRecords(ctx, facilityIds, userIds, patients);
    const availableBeds = await seedWards(ctx, facilityIds, userIds, patients);
    await seedTransfers(ctx, facilityIds, userIds, patients, availableBeds);
    await seedActivity(ctx, facilityIds, userIds, patients);

    console.log('\nSeed complete. Development accounts (password = SEED_DEFAULT_PASSWORD):');
    for (const user of USERS) {
      const roles = user.roles.map((r) => `${r.role}@${r.facilityCode}`).join(', ');
      console.log(`  ${user.email.padEnd(32)} ${roles}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

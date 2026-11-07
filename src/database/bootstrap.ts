import { randomBytes } from 'node:crypto';
import { hash } from 'argon2';
import { count, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';
import * as schema from './schema';
import { auditLogs, facilities, icd10Codes, userFacilityRoles, users } from './schema';
import { facilityLevelEnum, provinceEnum } from './schema/enums';
import { seedReferenceData } from './seed/reference.seed';

/**
 * Prepares an empty production database: one facility and the first Super Admin. Safe to re-run;
 * it only creates what is missing. The admin gets a random password nobody knows and sets their
 * own with "Forgot password", so no credential is ever printed or stored in logs.
 */
const envSchema = z.object({
  DATABASE_URL: z.url(),
  FRONTEND_ORIGIN: z.url(),
  BOOTSTRAP_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(3),
  BOOTSTRAP_FACILITY_CODE: z.string().trim().min(2).max(20),
  BOOTSTRAP_FACILITY_NAME: z.string().trim().min(3),
  BOOTSTRAP_FACILITY_LEVEL: z.enum(facilityLevelEnum.enumValues),
  BOOTSTRAP_FACILITY_PROVINCE: z.enum(provinceEnum.enumValues),
  BOOTSTRAP_FACILITY_DISTRICT: z.string().trim().min(2),
  /** Loads the starter admin-area and ICD-10 lists if those tables are empty. */
  BOOTSTRAP_REFERENCE_DATA: z.enum(['true', 'false']).default('false'),
});

async function main(): Promise<void> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid bootstrap environment:\n${problems.join('\n')}`);
  }
  const env = parsed.data;
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema });

  try {
    if (env.BOOTSTRAP_REFERENCE_DATA === 'true') {
      const [{ value: codes }] = await db.select({ value: count() }).from(icd10Codes);
      if (codes === 0) await seedReferenceData(db);
      else console.log('Reference data already present, skipped');
    }

    const passwordHash = await hash(randomBytes(32).toString('base64url'));

    await db.transaction(async (tx) => {
      let [facility] = await tx
        .select({ id: facilities.id })
        .from(facilities)
        .where(eq(facilities.code, env.BOOTSTRAP_FACILITY_CODE));
      if (!facility) {
        [facility] = await tx
          .insert(facilities)
          .values({
            code: env.BOOTSTRAP_FACILITY_CODE,
            name: env.BOOTSTRAP_FACILITY_NAME,
            level: env.BOOTSTRAP_FACILITY_LEVEL,
            province: env.BOOTSTRAP_FACILITY_PROVINCE,
            district: env.BOOTSTRAP_FACILITY_DISTRICT,
          })
          .returning({ id: facilities.id });
        await tx.insert(auditLogs).values({
          action: 'FACILITY_CREATE',
          facilityId: facility.id,
          entityType: 'facility',
          entityId: facility.id,
          metadata: { source: 'bootstrap' },
        });
        console.log(`Facility created: ${env.BOOTSTRAP_FACILITY_CODE}`);
      } else {
        console.log(`Facility ${env.BOOTSTRAP_FACILITY_CODE} already exists`);
      }

      let [admin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${env.BOOTSTRAP_ADMIN_EMAIL}`);
      if (!admin) {
        [admin] = await tx
          .insert(users)
          .values({
            name: env.BOOTSTRAP_ADMIN_NAME,
            email: env.BOOTSTRAP_ADMIN_EMAIL,
            passwordHash,
          })
          .returning({ id: users.id });
        await tx.insert(auditLogs).values({
          action: 'STAFF_INVITE',
          facilityId: facility.id,
          entityType: 'user',
          entityId: admin.id,
          metadata: { source: 'bootstrap', role: 'SUPER_ADMIN' },
        });
        console.log(`Super Admin created: ${env.BOOTSTRAP_ADMIN_EMAIL}`);
      } else {
        console.log(`User ${env.BOOTSTRAP_ADMIN_EMAIL} already exists`);
      }

      await tx
        .insert(userFacilityRoles)
        .values({ userId: admin.id, facilityId: facility.id, role: 'SUPER_ADMIN' })
        .onConflictDoNothing();
    });

    console.log(
      `\nNext: open ${env.FRONTEND_ORIGIN}/en/forgot-password and request a reset link for ` +
        `${env.BOOTSTRAP_ADMIN_EMAIL} to set the admin password.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

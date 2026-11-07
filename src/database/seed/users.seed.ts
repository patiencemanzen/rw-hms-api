import { userFacilityRoles, users } from '../schema';
import { USERS } from './data/users.data';
import { requireId } from './seed-helpers';
import type { FacilityIdsByCode, SeedContext, UserIdsByKey } from './types/seed.types';

export async function seedUsers(
  { db, passwordHash }: SeedContext,
  facilityIds: FacilityIdsByCode,
): Promise<UserIdsByKey> {
  const userIds: UserIdsByKey = new Map();

  for (const user of USERS) {
    const [row] = await db
      .insert(users)
      .values({
        name: user.name,
        email: user.email,
        passwordHash,
        phone: user.phone,
        title: user.title,
        specialty: user.specialty,
        licenseId: user.licenseId,
        passwordChangedAt: new Date(),
      })
      .returning({ id: users.id });
    userIds.set(user.key, row.id);

    await db.insert(userFacilityRoles).values(
      user.roles.map(({ facilityCode, role }) => ({
        userId: row.id,
        facilityId: requireId(facilityIds, facilityCode),
        role,
      })),
    );
  }

  console.log(`  Users: ${userIds.size}`);
  return userIds;
}

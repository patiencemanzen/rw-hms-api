import { facilities } from '../schema';
import { FACILITIES } from './data/facilities.data';
import type { FacilityIdsByCode, SeedDatabase } from './types/seed.types';

export async function seedFacilities(db: SeedDatabase): Promise<FacilityIdsByCode> {
  const rows = await db
    .insert(facilities)
    .values(FACILITIES)
    .returning({ id: facilities.id, code: facilities.code });

  console.log(`  Facilities: ${rows.length}`);
  return new Map(rows.map((row) => [row.code, row.id]));
}

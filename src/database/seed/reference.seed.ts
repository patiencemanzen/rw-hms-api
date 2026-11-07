import { adminAreas, icd10Codes, type AdminAreaLevel } from '../schema';
import { ADMIN_AREAS } from './data/admin-areas.data';
import { ICD10_CODES } from './data/icd10.data';
import type { AdminAreaSeed, SeedDatabase } from './types/seed.types';

const CHILD_LEVEL: Partial<Record<AdminAreaLevel, AdminAreaLevel>> = {
  PROVINCE: 'DISTRICT',
  DISTRICT: 'SECTOR',
  SECTOR: 'CELL',
  CELL: 'VILLAGE',
};

async function insertAreaTree(
  db: SeedDatabase,
  nodes: AdminAreaSeed[],
  level: AdminAreaLevel,
  parentId: string,
): Promise<number> {
  let count = 0;
  for (const node of nodes) {
    const [row] = await db
      .insert(adminAreas)
      .values({ level, name: node.name, parentId })
      .returning({ id: adminAreas.id });
    count += 1;
    const childLevel = CHILD_LEVEL[level];
    if (node.children && childLevel) {
      count += await insertAreaTree(db, node.children, childLevel, row.id);
    }
  }
  return count;
}

export async function seedReferenceData(db: SeedDatabase): Promise<void> {
  await db.insert(icd10Codes).values(ICD10_CODES);

  let areaCount = 0;
  for (const province of ADMIN_AREAS) {
    const [row] = await db
      .insert(adminAreas)
      .values({ level: 'PROVINCE', name: province.name })
      .returning({ id: adminAreas.id });
    areaCount += 1 + (await insertAreaTree(db, province.districts, 'DISTRICT', row.id));
  }

  console.log(`  ICD-10 codes: ${ICD10_CODES.length}, administrative areas: ${areaCount}`);
}

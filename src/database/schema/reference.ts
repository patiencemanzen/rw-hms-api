import { index, pgTable, text, unique, uuid, varchar, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { id } from './columns';
import { adminAreaLevelEnum } from './enums';

export const icd10Codes = pgTable(
  'icd10_codes',
  {
    code: varchar('code', { length: 10 }).primaryKey(),
    title: text('title').notNull(),
  },
  (t) => [index('icd10_codes_title_idx').on(t.title)],
);

export const adminAreas = pgTable(
  'admin_areas',
  {
    id: id(),
    level: adminAreaLevelEnum('level').notNull(),
    name: text('name').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => adminAreas.id, {
      onDelete: 'cascade',
    }),
  },
  (t) => [
    unique('admin_areas_parent_name_unique').on(t.parentId, t.level, t.name).nullsNotDistinct(),
    index('admin_areas_parent_idx').on(t.parentId),
  ],
);

export type Icd10Code = typeof icd10Codes.$inferSelect;
export type AdminArea = typeof adminAreas.$inferSelect;
export type NewAdminArea = typeof adminAreas.$inferInsert;

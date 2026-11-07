import { boolean, index, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns';
import { facilityLevelEnum, provinceEnum } from './enums';

export const facilities = pgTable(
  'facilities',
  {
    id: id(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: text('name').notNull(),
    shortName: varchar('short_name', { length: 20 }),
    level: facilityLevelEnum('level').notNull(),
    province: provinceEnum('province').notNull(),
    district: text('district').notNull(),
    phone: varchar('phone', { length: 20 }),
    active: boolean('active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('facilities_level_province_idx').on(t.level, t.province),
    index('facilities_name_idx').on(t.name),
  ],
);

export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;

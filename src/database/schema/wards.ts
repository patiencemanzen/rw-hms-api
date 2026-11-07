import { index, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { encounters } from './clinical';
import { id, timestamps, tstz } from './columns';
import { bedStatusEnum, wardTypeEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

export const wards = pgTable(
  'wards',
  {
    id: id(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: wardTypeEnum('type').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('wards_facility_name_unique').on(t.facilityId, t.name)],
);

export const beds = pgTable(
  'beds',
  {
    id: id(),
    wardId: uuid('ward_id')
      .notNull()
      .references(() => wards.id, { onDelete: 'cascade' }),
    number: varchar('number', { length: 20 }).notNull(),
    status: bedStatusEnum('status').notNull().default('AVAILABLE'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('beds_ward_number_unique').on(t.wardId, t.number),
    index('beds_ward_status_idx').on(t.wardId, t.status),
  ],
);

export const admissions = pgTable(
  'admissions',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    bedId: uuid('bed_id')
      .notNull()
      .references(() => beds.id, { onDelete: 'restrict' }),
    reason: text('reason').notNull(),
    admittedById: uuid('admitted_by_id').references(() => users.id, { onDelete: 'set null' }),
    admittedAt: tstz('admitted_at').notNull().defaultNow(),
    dischargedAt: tstz('discharged_at'),
    dischargedById: uuid('discharged_by_id').references(() => users.id, { onDelete: 'set null' }),
    dischargeSummary: text('discharge_summary'),
    ...timestamps,
  },
  (t) => [
    index('admissions_patient_idx').on(t.patientId),
    index('admissions_bed_open_idx').on(t.bedId, t.dischargedAt),
  ],
);

export type Ward = typeof wards.$inferSelect;
export type NewWard = typeof wards.$inferInsert;
export type Bed = typeof beds.$inferSelect;
export type NewBed = typeof beds.$inferInsert;
export type Admission = typeof admissions.$inferSelect;
export type NewAdmission = typeof admissions.$inferInsert;

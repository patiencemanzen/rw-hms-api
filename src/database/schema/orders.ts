import { boolean, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { encounters } from './clinical';
import { id, timestamps, tstz } from './columns';
import { labStatusEnum, prescriptionStatusEnum } from './enums';
import { users } from './users';

export const prescriptions = pgTable(
  'prescriptions',
  {
    id: id(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    prescriberId: uuid('prescriber_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('prescriptions_encounter_idx').on(t.encounterId)],
);

export const prescriptionItems = pgTable(
  'prescription_items',
  {
    id: id(),
    prescriptionId: uuid('prescription_id')
      .notNull()
      .references(() => prescriptions.id, { onDelete: 'cascade' }),
    drugName: text('drug_name').notNull(),
    dose: varchar('dose', { length: 50 }).notNull(),
    route: varchar('route', { length: 30 }).notNull(),
    frequency: varchar('frequency', { length: 50 }).notNull(),
    duration: varchar('duration', { length: 50 }).notNull(),
    instructions: text('instructions'),
    status: prescriptionStatusEnum('status').notNull().default('ACTIVE'),
    dispensedAt: tstz('dispensed_at'),
    dispensedById: uuid('dispensed_by_id').references(() => users.id, { onDelete: 'set null' }),
    stoppedAt: tstz('stopped_at'),
    stoppedReason: text('stopped_reason'),
    ...timestamps,
  },
  (t) => [
    index('prescription_items_prescription_idx').on(t.prescriptionId),
    index('prescription_items_status_idx').on(t.status),
  ],
);

export const labOrders = pgTable(
  'lab_orders',
  {
    id: id(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    orderedById: uuid('ordered_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    testName: text('test_name').notNull(),
    loincCode: varchar('loinc_code', { length: 20 }),
    status: labStatusEnum('status').notNull().default('ORDERED'),
    collectedAt: tstz('collected_at'),
    ...timestamps,
  },
  (t) => [
    index('lab_orders_encounter_idx').on(t.encounterId),
    index('lab_orders_status_idx').on(t.status),
  ],
);

export const labResults = pgTable(
  'lab_results',
  {
    id: id(),
    labOrderId: uuid('lab_order_id')
      .notNull()
      .references(() => labOrders.id, { onDelete: 'restrict' }),
    analyte: text('analyte').notNull(),
    value: text('value').notNull(),
    unit: varchar('unit', { length: 30 }),
    referenceRange: varchar('reference_range', { length: 60 }),
    isAbnormal: boolean('is_abnormal').notNull().default(false),
    resultedById: uuid('resulted_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    resultedAt: tstz('resulted_at').notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('lab_results_order_idx').on(t.labOrderId)],
);

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
export type LabOrder = typeof labOrders.$inferSelect;
export type NewLabOrder = typeof labOrders.$inferInsert;
export type LabResult = typeof labResults.$inferSelect;
export type NewLabResult = typeof labResults.$inferInsert;

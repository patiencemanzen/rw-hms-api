import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import { transferStatusEnum, transferUrgencyEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';
import { beds } from './wards';

export const transfers = pgTable(
  'transfers',
  {
    id: id(),
    referenceCode: varchar('reference_code', { length: 20 }).notNull().unique(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    fromFacilityId: uuid('from_facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    toFacilityId: uuid('to_facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    requestedById: uuid('requested_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    respondedById: uuid('responded_by_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    urgency: transferUrgencyEnum('urgency').notNull(),
    clinicalSummary: text('clinical_summary').notNull(),
    ambulanceRequired: boolean('ambulance_required').notNull().default(false),
    status: transferStatusEnum('status').notNull().default('REQUESTED'),
    rejectionReason: text('rejection_reason'),
    reservedBedId: uuid('reserved_bed_id').references(() => beds.id, { onDelete: 'set null' }),
    requestedAt: tstz('requested_at').notNull().defaultNow(),
    acceptedAt: tstz('accepted_at'),
    rejectedAt: tstz('rejected_at'),
    inTransitAt: tstz('in_transit_at'),
    arrivedAt: tstz('arrived_at'),
    cancelledAt: tstz('cancelled_at'),
    ...timestamps,
  },
  (t) => [
    index('transfers_to_status_idx').on(t.toFacilityId, t.status),
    index('transfers_from_status_idx').on(t.fromFacilityId, t.status),
    index('transfers_patient_idx').on(t.patientId),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: id(),
    key: varchar('key', { length: 100 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    route: varchar('route', { length: 200 }).notNull(),
    statusCode: integer('status_code').notNull(),
    responseBody: jsonb('response_body').notNull(),
    expiresAt: tstz('expires_at').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('idempotency_keys_unique').on(t.userId, t.route, t.key)],
);

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;

import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import { grantReasonEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

export const recordAccessGrants = pgTable(
  'record_access_grants',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    reason: grantReasonEnum('reason').notNull(),
    includesSensitive: boolean('includes_sensitive').notNull().default(false),
    justification: text('justification'),
    grantedById: uuid('granted_by_id').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: tstz('expires_at'),
    revokedAt: tstz('revoked_at'),
    revokedById: uuid('revoked_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('record_access_grants_lookup_idx').on(t.patientId, t.facilityId),
    index('record_access_grants_expiry_idx').on(t.expiresAt),
  ],
);

export type RecordAccessGrant = typeof recordAccessGrants.$inferSelect;
export type NewRecordAccessGrant = typeof recordAccessGrants.$inferInsert;

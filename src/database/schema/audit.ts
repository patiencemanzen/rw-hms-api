import { index, jsonb, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { id, tstz } from './columns';
import { auditActionEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

// Append-only: a trigger added in the initial migration rejects UPDATE and DELETE on this table.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'restrict' }),
    action: auditActionEnum('action').notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'restrict' }),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ip: varchar('ip', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_created_at_idx').on(t.createdAt),
    index('audit_logs_actor_idx').on(t.actorUserId, t.createdAt),
    index('audit_logs_patient_idx').on(t.patientId, t.createdAt),
    index('audit_logs_facility_idx').on(t.facilityId, t.createdAt),
    index('audit_logs_action_idx').on(t.action, t.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

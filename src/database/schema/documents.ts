import { index, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { encounters } from './clinical';
import { id, timestamps } from './columns';
import { documentTypeEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

export const documents = pgTable(
  'documents',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    encounterId: uuid('encounter_id').references(() => encounters.id, { onDelete: 'set null' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    type: documentTypeEnum('type').notNull(),
    title: text('title').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('documents_patient_idx').on(t.patientId)],
);

export type PatientDocument = typeof documents.$inferSelect;
export type NewPatientDocument = typeof documents.$inferInsert;

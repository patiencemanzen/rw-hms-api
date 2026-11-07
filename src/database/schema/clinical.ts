import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import { encounterStatusEnum, encounterTypeEnum, noteTypeEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

export const encounters = pgTable(
  'encounters',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'restrict' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    type: encounterTypeEnum('type').notNull(),
    status: encounterStatusEnum('status').notNull().default('OPEN'),
    referenceCode: varchar('reference_code', { length: 30 }).notNull().unique(),
    attendingDoctorId: uuid('attending_doctor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    startedAt: tstz('started_at').notNull().defaultNow(),
    endedAt: tstz('ended_at'),
    ...timestamps,
  },
  (t) => [
    index('encounters_patient_idx').on(t.patientId, t.startedAt),
    index('encounters_facility_status_idx').on(t.facilityId, t.status),
  ],
);

export const clinicalNotes = pgTable(
  'clinical_notes',
  {
    id: id(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    type: noteTypeEnum('type').notNull(),
    subjective: text('subjective'),
    objective: text('objective'),
    assessment: text('assessment'),
    plan: text('plan'),
    primaryDiagnosis: text('primary_diagnosis'),
    icd10Codes: text('icd10_codes').array().notNull().default([]),
    followUpItems: text('follow_up_items').array().notNull().default([]),
    isSensitive: boolean('is_sensitive').notNull().default(false),
    signedAt: tstz('signed_at'),
    enteredInError: boolean('entered_in_error').notNull().default(false),
    enteredInErrorReason: text('entered_in_error_reason'),
    enteredInErrorAt: tstz('entered_in_error_at'),
    ...timestamps,
  },
  (t) => [
    index('clinical_notes_encounter_idx').on(t.encounterId),
    index('clinical_notes_author_idx').on(t.authorId),
  ],
);

export const noteAddenda = pgTable(
  'note_addenda',
  {
    id: id(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => clinicalNotes.id, { onDelete: 'restrict' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    text: text('text').notNull(),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [index('note_addenda_note_idx').on(t.noteId)],
);

export const vitals = pgTable(
  'vitals',
  {
    id: id(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'restrict' }),
    recordedById: uuid('recorded_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    temperatureC: numeric('temperature_c', { precision: 4, scale: 1, mode: 'number' }),
    systolic: integer('systolic'),
    diastolic: integer('diastolic'),
    pulse: integer('pulse'),
    respiratoryRate: integer('respiratory_rate'),
    spo2: integer('spo2'),
    weightKg: numeric('weight_kg', { precision: 5, scale: 1, mode: 'number' }),
    heightCm: numeric('height_cm', { precision: 5, scale: 1, mode: 'number' }),
    glucoseMmolL: numeric('glucose_mmol_l', { precision: 4, scale: 1, mode: 'number' }),
    recordedAt: tstz('recorded_at').notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [index('vitals_encounter_idx').on(t.encounterId, t.recordedAt)],
);

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type ClinicalNote = typeof clinicalNotes.$inferSelect;
export type NewClinicalNote = typeof clinicalNotes.$inferInsert;
export type NoteAddendum = typeof noteAddenda.$inferSelect;
export type NewNoteAddendum = typeof noteAddenda.$inferInsert;
export type Vitals = typeof vitals.$inferSelect;
export type NewVitals = typeof vitals.$inferInsert;

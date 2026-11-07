import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import {
  allergySeverityEnum,
  bloodTypeEnum,
  conditionStatusEnum,
  insuranceTypeEnum,
  provinceEnum,
  sexEnum,
} from './enums';
import { facilities } from './facilities';
import { users } from './users';

export const patients = pgTable(
  'patients',
  {
    id: id(),
    nationalId: varchar('national_id', { length: 16 }).unique(),
    temporaryId: varchar('temporary_id', { length: 20 }).unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
    sex: sexEnum('sex').notNull(),
    phone: varchar('phone', { length: 20 }),
    province: provinceEnum('province'),
    district: text('district'),
    sector: text('sector'),
    cell: text('cell'),
    village: text('village'),
    bloodType: bloodTypeEnum('blood_type').notNull().default('UNKNOWN'),
    insuranceType: insuranceTypeEnum('insurance_type').notNull().default('NONE'),
    insuranceNumber: varchar('insurance_number', { length: 50 }),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
    guardianPatientId: uuid('guardian_patient_id').references((): AnyPgColumn => patients.id, {
      onDelete: 'set null',
    }),
    registeredAtFacilityId: uuid('registered_at_facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    registeredById: uuid('registered_by_id').references(() => users.id, { onDelete: 'set null' }),
    photoUrl: text('photo_url'),
    mergedIntoId: uuid('merged_into_id').references((): AnyPgColumn => patients.id, {
      onDelete: 'restrict',
    }),
    deceasedAt: tstz('deceased_at'),
    ...timestamps,
  },
  (t) => [
    check(
      'patients_identifier_present',
      sql`${t.nationalId} IS NOT NULL OR ${t.temporaryId} IS NOT NULL`,
    ),
    check(
      'patients_national_id_format',
      sql`${t.nationalId} IS NULL OR ${t.nationalId} ~ '^[0-9]{16}$'`,
    ),
    index('patients_name_idx').on(t.lastName, t.firstName),
    index('patients_dob_idx').on(t.dateOfBirth),
    index('patients_phone_idx').on(t.phone),
  ],
);

export const allergies = pgTable(
  'allergies',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    substance: text('substance').notNull(),
    reaction: text('reaction'),
    severity: allergySeverityEnum('severity').notNull(),
    recordedById: uuid('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [index('allergies_patient_idx').on(t.patientId)],
);

export const conditions = pgTable(
  'conditions',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    icd10Code: varchar('icd10_code', { length: 10 }),
    name: text('name').notNull(),
    status: conditionStatusEnum('status').notNull().default('ACTIVE'),
    onsetDate: date('onset_date', { mode: 'string' }),
    isSensitive: boolean('is_sensitive').notNull().default(false),
    recordedById: uuid('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [index('conditions_patient_idx').on(t.patientId, t.status)],
);

export const immunizations = pgTable(
  'immunizations',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    vaccine: text('vaccine').notNull(),
    doseNumber: integer('dose_number').notNull(),
    administeredOn: date('administered_on', { mode: 'string' }).notNull(),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'restrict' }),
    recordedById: uuid('recorded_by_id').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('immunizations_patient_idx').on(t.patientId)],
);

export const recentPatientViews = pgTable(
  'recent_patient_views',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    viewedAt: tstz('viewed_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('recent_patient_views_unique').on(t.userId, t.patientId),
    index('recent_patient_views_user_idx').on(t.userId, t.viewedAt),
  ],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Allergy = typeof allergies.$inferSelect;
export type NewAllergy = typeof allergies.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type NewCondition = typeof conditions.$inferInsert;
export type Immunization = typeof immunizations.$inferSelect;
export type NewImmunization = typeof immunizations.$inferInsert;
export type RecentPatientView = typeof recentPatientViews.$inferSelect;

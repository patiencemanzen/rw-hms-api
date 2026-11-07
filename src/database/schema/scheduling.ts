import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import { appointmentStatusEnum } from './enums';
import { facilities } from './facilities';
import { patients } from './patients';
import { users } from './users';

export const appointments = pgTable(
  'appointments',
  {
    id: id(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    doctorId: uuid('doctor_id').references(() => users.id, { onDelete: 'set null' }),
    scheduledAt: tstz('scheduled_at').notNull(),
    status: appointmentStatusEnum('status').notNull().default('SCHEDULED'),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => [
    index('appointments_facility_time_idx').on(t.facilityId, t.scheduledAt),
    index('appointments_doctor_time_idx').on(t.doctorId, t.scheduledAt),
    index('appointments_patient_idx').on(t.patientId),
  ],
);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

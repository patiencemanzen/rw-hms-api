import { relations } from 'drizzle-orm';
import { recordAccessGrants } from './access';
import { auditLogs } from './audit';
import { clinicalNotes, encounters, noteAddenda, vitals } from './clinical';
import { documents } from './documents';
import { facilities } from './facilities';
import { notifications } from './notifications';
import { labOrders, labResults, prescriptionItems, prescriptions } from './orders';
import { allergies, conditions, immunizations, patients, recentPatientViews } from './patients';
import { adminAreas } from './reference';
import { appointments } from './scheduling';
import { transfers } from './transfers';
import { passwordResetTokens, sessions, staffShifts, userFacilityRoles, users } from './users';
import { admissions, beds, wards } from './wards';

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  userRoles: many(userFacilityRoles),
  wards: many(wards),
  encounters: many(encounters),
}));

export const usersRelations = relations(users, ({ many }) => ({
  facilityRoles: many(userFacilityRoles),
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  notifications: many(notifications),
  shifts: many(staffShifts),
}));

export const userFacilityRolesRelations = relations(userFacilityRoles, ({ one }) => ({
  user: one(users, { fields: [userFacilityRoles.userId], references: [users.id] }),
  facility: one(facilities, {
    fields: [userFacilityRoles.facilityId],
    references: [facilities.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const staffShiftsRelations = relations(staffShifts, ({ one }) => ({
  user: one(users, { fields: [staffShifts.userId], references: [users.id] }),
  facility: one(facilities, { fields: [staffShifts.facilityId], references: [facilities.id] }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  registeredAtFacility: one(facilities, {
    fields: [patients.registeredAtFacilityId],
    references: [facilities.id],
  }),
  guardian: one(patients, {
    fields: [patients.guardianPatientId],
    references: [patients.id],
    relationName: 'guardian',
  }),
  mergedInto: one(patients, {
    fields: [patients.mergedIntoId],
    references: [patients.id],
    relationName: 'merged',
  }),
  allergies: many(allergies),
  conditions: many(conditions),
  immunizations: many(immunizations),
  encounters: many(encounters),
  documents: many(documents),
  accessGrants: many(recordAccessGrants),
  admissions: many(admissions),
  appointments: many(appointments),
}));

export const allergiesRelations = relations(allergies, ({ one }) => ({
  patient: one(patients, { fields: [allergies.patientId], references: [patients.id] }),
  facility: one(facilities, { fields: [allergies.facilityId], references: [facilities.id] }),
}));

export const conditionsRelations = relations(conditions, ({ one }) => ({
  patient: one(patients, { fields: [conditions.patientId], references: [patients.id] }),
  facility: one(facilities, { fields: [conditions.facilityId], references: [facilities.id] }),
}));

export const immunizationsRelations = relations(immunizations, ({ one }) => ({
  patient: one(patients, { fields: [immunizations.patientId], references: [patients.id] }),
  facility: one(facilities, { fields: [immunizations.facilityId], references: [facilities.id] }),
}));

export const recentPatientViewsRelations = relations(recentPatientViews, ({ one }) => ({
  user: one(users, { fields: [recentPatientViews.userId], references: [users.id] }),
  patient: one(patients, { fields: [recentPatientViews.patientId], references: [patients.id] }),
}));

export const encountersRelations = relations(encounters, ({ one, many }) => ({
  patient: one(patients, { fields: [encounters.patientId], references: [patients.id] }),
  facility: one(facilities, { fields: [encounters.facilityId], references: [facilities.id] }),
  attendingDoctor: one(users, { fields: [encounters.attendingDoctorId], references: [users.id] }),
  notes: many(clinicalNotes),
  vitals: many(vitals),
  prescriptions: many(prescriptions),
  labOrders: many(labOrders),
  documents: many(documents),
}));

export const clinicalNotesRelations = relations(clinicalNotes, ({ one, many }) => ({
  encounter: one(encounters, { fields: [clinicalNotes.encounterId], references: [encounters.id] }),
  author: one(users, { fields: [clinicalNotes.authorId], references: [users.id] }),
  addenda: many(noteAddenda),
}));

export const noteAddendaRelations = relations(noteAddenda, ({ one }) => ({
  note: one(clinicalNotes, { fields: [noteAddenda.noteId], references: [clinicalNotes.id] }),
  author: one(users, { fields: [noteAddenda.authorId], references: [users.id] }),
}));

export const vitalsRelations = relations(vitals, ({ one }) => ({
  encounter: one(encounters, { fields: [vitals.encounterId], references: [encounters.id] }),
  recordedBy: one(users, { fields: [vitals.recordedById], references: [users.id] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  encounter: one(encounters, { fields: [prescriptions.encounterId], references: [encounters.id] }),
  prescriber: one(users, { fields: [prescriptions.prescriberId], references: [users.id] }),
  items: many(prescriptionItems),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionItems.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  encounter: one(encounters, { fields: [labOrders.encounterId], references: [encounters.id] }),
  orderedBy: one(users, { fields: [labOrders.orderedById], references: [users.id] }),
  results: many(labResults),
}));

export const labResultsRelations = relations(labResults, ({ one }) => ({
  order: one(labOrders, { fields: [labResults.labOrderId], references: [labOrders.id] }),
  resultedBy: one(users, { fields: [labResults.resultedById], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  patient: one(patients, { fields: [documents.patientId], references: [patients.id] }),
  encounter: one(encounters, { fields: [documents.encounterId], references: [encounters.id] }),
  facility: one(facilities, { fields: [documents.facilityId], references: [facilities.id] }),
  uploadedBy: one(users, { fields: [documents.uploadedById], references: [users.id] }),
}));

export const wardsRelations = relations(wards, ({ one, many }) => ({
  facility: one(facilities, { fields: [wards.facilityId], references: [facilities.id] }),
  beds: many(beds),
}));

export const bedsRelations = relations(beds, ({ one, many }) => ({
  ward: one(wards, { fields: [beds.wardId], references: [wards.id] }),
  admissions: many(admissions),
}));

export const admissionsRelations = relations(admissions, ({ one }) => ({
  patient: one(patients, { fields: [admissions.patientId], references: [patients.id] }),
  encounter: one(encounters, { fields: [admissions.encounterId], references: [encounters.id] }),
  bed: one(beds, { fields: [admissions.bedId], references: [beds.id] }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  patient: one(patients, { fields: [transfers.patientId], references: [patients.id] }),
  fromFacility: one(facilities, {
    fields: [transfers.fromFacilityId],
    references: [facilities.id],
    relationName: 'outgoingTransfers',
  }),
  toFacility: one(facilities, {
    fields: [transfers.toFacilityId],
    references: [facilities.id],
    relationName: 'incomingTransfers',
  }),
  requestedBy: one(users, { fields: [transfers.requestedById], references: [users.id] }),
  reservedBed: one(beds, { fields: [transfers.reservedBedId], references: [beds.id] }),
}));

export const recordAccessGrantsRelations = relations(recordAccessGrants, ({ one }) => ({
  patient: one(patients, { fields: [recordAccessGrants.patientId], references: [patients.id] }),
  facility: one(facilities, {
    fields: [recordAccessGrants.facilityId],
    references: [facilities.id],
  }),
  grantedBy: one(users, { fields: [recordAccessGrants.grantedById], references: [users.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, { fields: [appointments.patientId], references: [patients.id] }),
  facility: one(facilities, { fields: [appointments.facilityId], references: [facilities.id] }),
  doctor: one(users, { fields: [appointments.doctorId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
  facility: one(facilities, { fields: [auditLogs.facilityId], references: [facilities.id] }),
  patient: one(patients, { fields: [auditLogs.patientId], references: [patients.id] }),
}));

export const adminAreasRelations = relations(adminAreas, ({ one, many }) => ({
  parent: one(adminAreas, {
    fields: [adminAreas.parentId],
    references: [adminAreas.id],
    relationName: 'adminAreaTree',
  }),
  children: many(adminAreas, { relationName: 'adminAreaTree' }),
}));

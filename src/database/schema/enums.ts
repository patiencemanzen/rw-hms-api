import { pgEnum } from 'drizzle-orm/pg-core';

export const facilityLevelEnum = pgEnum('facility_level', [
  'HEALTH_POST',
  'HEALTH_CENTER',
  'DISTRICT',
  'PROVINCIAL',
  'REFERRAL',
  'NATIONAL_REFERRAL',
]);

export const provinceEnum = pgEnum('province', [
  'KIGALI_CITY',
  'NORTHERN',
  'SOUTHERN',
  'EASTERN',
  'WESTERN',
]);

export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN',
  'HOSPITAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'LAB_TECH',
  'PHARMACIST',
  'BILLING_OFFICER',
]);

export const sexEnum = pgEnum('sex', ['MALE', 'FEMALE']);

export const bloodTypeEnum = pgEnum('blood_type', [
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'AB_POS',
  'AB_NEG',
  'O_POS',
  'O_NEG',
  'UNKNOWN',
]);

export const insuranceTypeEnum = pgEnum('insurance_type', [
  'MUTUELLE',
  'RSSB',
  'MMI',
  'PRIVATE',
  'NONE',
]);

export const allergySeverityEnum = pgEnum('allergy_severity', [
  'MILD',
  'MODERATE',
  'SEVERE',
  'LIFE_THREATENING',
]);

export const conditionStatusEnum = pgEnum('condition_status', ['ACTIVE', 'RESOLVED']);

export const encounterTypeEnum = pgEnum('encounter_type', [
  'OUTPATIENT',
  'INPATIENT',
  'EMERGENCY',
  'TELECONSULT',
]);

export const encounterStatusEnum = pgEnum('encounter_status', ['OPEN', 'CLOSED', 'CANCELLED']);

export const noteTypeEnum = pgEnum('note_type', [
  'CONSULTATION',
  'PROGRESS',
  'NURSING',
  'DISCHARGE',
]);

export const prescriptionStatusEnum = pgEnum('prescription_status', [
  'ACTIVE',
  'DISPENSED',
  'STOPPED',
]);

export const labStatusEnum = pgEnum('lab_status', [
  'ORDERED',
  'COLLECTED',
  'RESULTED',
  'CANCELLED',
]);

export const wardTypeEnum = pgEnum('ward_type', [
  'GENERAL',
  'ICU',
  'MATERNITY',
  'PEDIATRICS',
  'SURGICAL',
  'EMERGENCY',
  'ISOLATION',
]);

export const bedStatusEnum = pgEnum('bed_status', [
  'AVAILABLE',
  'OCCUPIED',
  'CLEANING',
  'RESERVED',
  'OUT_OF_SERVICE',
]);

export const transferUrgencyEnum = pgEnum('transfer_urgency', ['ROUTINE', 'URGENT', 'EMERGENCY']);

export const transferStatusEnum = pgEnum('transfer_status', [
  'REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'IN_TRANSIT',
  'ARRIVED',
  'CANCELLED',
]);

export const grantReasonEnum = pgEnum('grant_reason', [
  'CHECKED_IN',
  'REFERRAL',
  'BREAK_GLASS',
  'CONSENT',
]);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'SCHEDULED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'LAB_REPORT',
  'IMAGING',
  'REFERRAL_LETTER',
  'DISCHARGE_SUMMARY',
  'CONSENT_FORM',
  'OTHER',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'TRANSFER_REQUESTED',
  'TRANSFER_STATUS_CHANGED',
  'LAB_RESULT_AVAILABLE',
  'CAPACITY_ALERT',
  'BREAK_GLASS_ACCESS',
  'SYSTEM',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET',
  'PASSWORD_CHANGED',
  'PATIENT_SEARCH',
  'PATIENT_VIEW',
  'PATIENT_CREATE',
  'PATIENT_UPDATE',
  'PATIENT_MERGE',
  'PATIENT_CHECK_IN',
  'RECORD_VIEW',
  'RECORD_CREATE',
  'RECORD_EDIT',
  'RECORD_SIGN',
  'RECORD_ADDENDUM',
  'RECORD_ENTERED_IN_ERROR',
  'RECORD_PRINT',
  'RECORD_EXPORT',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_VIEW',
  'BREAK_GLASS',
  'ACCESS_GRANTED',
  'ACCESS_REVOKED',
  'TRANSFER_REQUEST',
  'TRANSFER_ACCEPT',
  'TRANSFER_REJECT',
  'TRANSFER_STATUS_CHANGE',
  'ADMISSION',
  'DISCHARGE',
  'BED_UPDATE',
  'STAFF_INVITE',
  'STAFF_UPDATE',
  'STAFF_DEACTIVATE',
  'FACILITY_CREATE',
  'FACILITY_UPDATE',
  'SETTINGS_UPDATE',
  'AUDIT_EXPORT',
]);

export const adminAreaLevelEnum = pgEnum('admin_area_level', [
  'PROVINCE',
  'DISTRICT',
  'SECTOR',
  'CELL',
  'VILLAGE',
]);

export type FacilityLevel = (typeof facilityLevelEnum.enumValues)[number];
export type Province = (typeof provinceEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type Sex = (typeof sexEnum.enumValues)[number];
export type BloodType = (typeof bloodTypeEnum.enumValues)[number];
export type InsuranceType = (typeof insuranceTypeEnum.enumValues)[number];
export type AllergySeverity = (typeof allergySeverityEnum.enumValues)[number];
export type ConditionStatus = (typeof conditionStatusEnum.enumValues)[number];
export type EncounterType = (typeof encounterTypeEnum.enumValues)[number];
export type EncounterStatus = (typeof encounterStatusEnum.enumValues)[number];
export type NoteType = (typeof noteTypeEnum.enumValues)[number];
export type PrescriptionStatus = (typeof prescriptionStatusEnum.enumValues)[number];
export type LabStatus = (typeof labStatusEnum.enumValues)[number];
export type WardType = (typeof wardTypeEnum.enumValues)[number];
export type BedStatus = (typeof bedStatusEnum.enumValues)[number];
export type TransferUrgency = (typeof transferUrgencyEnum.enumValues)[number];
export type TransferStatus = (typeof transferStatusEnum.enumValues)[number];
export type GrantReason = (typeof grantReasonEnum.enumValues)[number];
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type AuditAction = (typeof auditActionEnum.enumValues)[number];
export type AdminAreaLevel = (typeof adminAreaLevelEnum.enumValues)[number];

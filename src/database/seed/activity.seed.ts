import {
  auditLogs,
  notifications,
  recentPatientViews,
  recordAccessGrants,
  staffShifts,
  type NewAuditLog,
} from '../schema';
import { hoursAgo, hoursFromNow } from './random';
import { requireId } from './seed-helpers';
import type {
  FacilityIdsByCode,
  SeedContext,
  SeededPatient,
  UserIdsByKey,
} from './types/seed.types';

const SEED_IP = '10.10.0.12';
const SEED_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Rw-HMS seed';

export async function seedActivity(
  ctx: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
  patients: SeededPatient[],
): Promise<void> {
  const { db, random } = ctx;
  const chuk = requireId(facilityIds, 'FAC-001');
  const chub = requireId(facilityIds, 'FAC-002');
  const rrh = requireId(facilityIds, 'FAC-005');
  const doctorChuk = requireId(userIds, 'doctorChuk');
  const doctorRrh = requireId(userIds, 'doctorRrh');
  const adminChuk = requireId(userIds, 'adminChuk');
  const breakGlassPatient =
    patients.find((p) => p.registeredFacilityCode === 'FAC-001') ?? patients[0];
  const viewed = random.shuffle(patients).slice(0, 8);

  await db.insert(recordAccessGrants).values({
    patientId: breakGlassPatient.id,
    facilityId: rrh,
    reason: 'BREAK_GLASS',
    justification:
      'Unconscious patient brought in by ambulance; need allergy and medication history.',
    grantedById: doctorRrh,
    expiresAt: hoursFromNow(9),
    createdAt: hoursAgo(3),
  });

  const entries: NewAuditLog[] = [
    { actorUserId: doctorChuk, facilityId: chuk, action: 'LOGIN_SUCCESS', createdAt: hoursAgo(5) },
    {
      actorUserId: requireId(userIds, 'doctorChub'),
      facilityId: chub,
      action: 'LOGIN_SUCCESS',
      createdAt: hoursAgo(6),
    },
    {
      actorUserId: null,
      facilityId: null,
      action: 'LOGIN_FAILED',
      metadata: { email: 'unknown.user@rwhms.gov.rw' },
      createdAt: hoursAgo(7),
    },
    {
      actorUserId: doctorChuk,
      facilityId: chuk,
      action: 'PATIENT_SEARCH',
      metadata: { resultCount: 3 },
      createdAt: hoursAgo(4.5),
    },
    {
      actorUserId: doctorRrh,
      facilityId: rrh,
      action: 'BREAK_GLASS',
      entityType: 'patient',
      entityId: breakGlassPatient.id,
      patientId: breakGlassPatient.id,
      reason: 'Unconscious patient brought in by ambulance; need allergy and medication history.',
      createdAt: hoursAgo(3),
    },
    ...viewed.map((patient, index): NewAuditLog => ({
      actorUserId: doctorChuk,
      facilityId: chuk,
      action: 'PATIENT_VIEW',
      entityType: 'patient',
      entityId: patient.id,
      patientId: patient.id,
      createdAt: hoursAgo(4 - index * 0.4),
    })),
    {
      actorUserId: requireId(userIds, 'superAdmin'),
      facilityId: null,
      action: 'SETTINGS_UPDATE',
      entityType: 'system',
      metadata: { setting: 'backupFrequency', value: 'daily' },
      createdAt: hoursAgo(8),
    },
  ];
  await db
    .insert(auditLogs)
    .values(entries.map((entry) => ({ ip: SEED_IP, userAgent: SEED_USER_AGENT, ...entry })));

  await db.insert(recentPatientViews).values(
    viewed.map((patient, index) => ({
      userId: doctorChuk,
      patientId: patient.id,
      viewedAt: hoursAgo(4 - index * 0.4),
    })),
  );

  await db.insert(notifications).values([
    {
      userId: doctorChuk,
      type: 'TRANSFER_REQUESTED',
      title: 'New incoming transfer request',
      body: 'Ruhengeri Referral Hospital has requested an emergency transfer for a cardiac case.',
      link: '/transfers?tab=incoming',
      createdAt: hoursAgo(0.2),
    },
    {
      userId: adminChuk,
      type: 'CAPACITY_ALERT',
      title: 'Critical capacity alert',
      body: 'Intensive Care Unit occupancy has reached 100%.',
      link: '/wards',
      createdAt: hoursAgo(0.5),
    },
    {
      userId: adminChuk,
      type: 'BREAK_GLASS_ACCESS',
      title: 'Emergency access used',
      body: 'A doctor at Ruhengeri Referral Hospital used emergency access on a CHUK patient record.',
      link: '/audit-log?action=BREAK_GLASS',
      createdAt: hoursAgo(3),
    },
    {
      userId: doctorChuk,
      type: 'LAB_RESULT_AVAILABLE',
      title: 'Lab results available',
      body: 'New blood chemistry results are available.',
      link: '/patients',
      readAt: hoursAgo(1),
      createdAt: hoursAgo(2),
    },
  ]);

  await db.insert(staffShifts).values(
    ['doctorChuk', 'nurseChuk', 'receptionChuk', 'labChuk', 'pharmacistChuk'].map((key) => ({
      userId: requireId(userIds, key),
      facilityId: chuk,
      startedAt: hoursAgo(random.int(1, 7)),
    })),
  );

  console.log(`  Audit entries: ${entries.length}, notifications: 4, open shifts: 5`);
}

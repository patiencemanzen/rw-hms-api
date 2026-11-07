import {
  admissions,
  beds,
  clinicalNotes,
  recordAccessGrants,
  wards,
  type BedStatus,
} from '../schema';
import { CLINICIANS_BY_FACILITY, createEncounter } from './clinical.seed';
import { WARD_TEMPLATES } from './data/clinical.data';
import { WARD_HOSPITAL_CODES } from './data/facilities.data';
import { daysAgo } from './random';
import { requireId } from './seed-helpers';
import type {
  FacilityIdsByCode,
  SeedContext,
  SeededPatient,
  UserIdsByKey,
} from './types/seed.types';

const OCCUPANCY_PLAN: Record<string, Record<string, number>> = {
  'FAC-001': { GENERAL: 8, ICU: 5, MATERNITY: 3, PEDIATRICS: 2 },
  'FAC-002': { GENERAL: 5, ICU: 2, MATERNITY: 1, PEDIATRICS: 1 },
};

const IDLE_STATUSES: BedStatus[] = [
  'AVAILABLE',
  'AVAILABLE',
  'AVAILABLE',
  'AVAILABLE',
  'CLEANING',
  'OUT_OF_SERVICE',
];

export type AvailableBedsByFacility = Map<string, string[]>;

function isMinor(patient: SeededPatient): boolean {
  return Number(patient.dateOfBirth.slice(0, 4)) >= 2008;
}

export async function seedWards(
  ctx: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
  patients: SeededPatient[],
): Promise<AvailableBedsByFacility> {
  const { db, random } = ctx;
  const availableBeds: AvailableBedsByFacility = new Map();
  const unadmitted = random.shuffle(patients);
  let bedCount = 0;
  let admissionCount = 0;

  const takePatient = (wardType: string): SeededPatient | undefined => {
    const index = unadmitted.findIndex((p) => {
      if (wardType === 'PEDIATRICS') return isMinor(p);
      if (wardType === 'MATERNITY') return p.sex === 'FEMALE' && !isMinor(p);
      return !isMinor(p);
    });
    return index === -1 ? undefined : unadmitted.splice(index, 1)[0];
  };

  for (const facilityCode of WARD_HOSPITAL_CODES) {
    const facilityId = requireId(facilityIds, facilityCode);
    const freeBeds: string[] = [];

    for (const template of WARD_TEMPLATES) {
      const [ward] = await db
        .insert(wards)
        .values({ facilityId, name: template.name, type: template.type })
        .returning({ id: wards.id });

      const occupiedTarget = OCCUPANCY_PLAN[facilityCode]?.[template.type] ?? 0;
      for (let n = 1; n <= template.beds; n += 1) {
        const patient = n <= occupiedTarget ? takePatient(template.type) : undefined;
        const status: BedStatus = patient ? 'OCCUPIED' : random.pick(IDLE_STATUSES);
        const [bed] = await db
          .insert(beds)
          .values({
            wardId: ward.id,
            number: `${template.prefix}-${String(n).padStart(2, '0')}`,
            status,
          })
          .returning({ id: beds.id });
        bedCount += 1;

        if (status === 'AVAILABLE') freeBeds.push(bed.id);
        if (!patient) continue;

        await admitPatient(ctx, userIds, { facilityCode, facilityId, bedId: bed.id, patient });
        admissionCount += 1;
      }
    }
    availableBeds.set(facilityCode, freeBeds);
  }

  console.log(`  Beds: ${bedCount}, active admissions: ${admissionCount}`);
  return availableBeds;
}

async function admitPatient(
  ctx: SeedContext,
  userIds: UserIdsByKey,
  input: { facilityCode: string; facilityId: string; bedId: string; patient: SeededPatient },
): Promise<void> {
  const { db, random } = ctx;
  const clinicians = CLINICIANS_BY_FACILITY[input.facilityCode];
  const doctorId = requireId(userIds, random.pick(clinicians.doctors));
  const admittedAt = daysAgo(random.int(0, 9), random.int(6, 20));

  const encounterId = await createEncounter(ctx, {
    patientId: input.patient.id,
    facilityId: input.facilityId,
    doctorId,
    type: 'INPATIENT',
    startedAt: admittedAt,
    open: true,
  });

  await db.insert(clinicalNotes).values({
    encounterId,
    authorId: doctorId,
    type: 'PROGRESS',
    subjective: 'Patient reviewed on ward round.',
    objective: 'Haemodynamically stable, tolerating oral intake.',
    assessment: 'Improving.',
    plan: 'Continue current management, review tomorrow.',
    signedAt: admittedAt,
    createdAt: admittedAt,
  });

  await db.insert(admissions).values({
    patientId: input.patient.id,
    encounterId,
    bedId: input.bedId,
    reason: random.pick([
      'Severe pneumonia requiring oxygen',
      'Post-operative care',
      'Hypertensive emergency',
      'Labour and delivery',
      'Severe malaria',
    ]),
    admittedById: doctorId,
    admittedAt,
  });

  await db.insert(recordAccessGrants).values({
    patientId: input.patient.id,
    facilityId: input.facilityId,
    reason: 'CHECKED_IN',
    createdAt: admittedAt,
  });
}

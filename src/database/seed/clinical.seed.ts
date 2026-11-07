import { eq } from 'drizzle-orm';
import {
  appointments,
  clinicalNotes,
  encounters,
  labOrders,
  labResults,
  noteAddenda,
  prescriptionItems,
  prescriptions,
  recordAccessGrants,
  vitals,
  type EncounterType,
} from '../schema';
import { DIAGNOSES, DRUGS, LAB_TESTS } from './data/clinical.data';
import { daysAgo, hoursAgo, hoursFromNow } from './random';
import { nextReference, requireId } from './seed-helpers';
import type {
  FacilityIdsByCode,
  SeedContext,
  SeededPatient,
  UserIdsByKey,
} from './types/seed.types';

export const CLINICIANS_BY_FACILITY: Record<string, { doctors: string[]; nurse: string | null }> = {
  'FAC-001': { doctors: ['doctorChuk', 'doctorMulti'], nurse: 'nurseChuk' },
  'FAC-002': { doctors: ['doctorChub'], nurse: 'nurseChub' },
  'FAC-004': { doctors: ['doctorMulti'], nurse: null },
  'FAC-005': { doctors: ['doctorRrh'], nurse: null },
};

const CLINICAL_FACILITIES = Object.keys(CLINICIANS_BY_FACILITY);

export interface CreateEncounterInput {
  patientId: string;
  facilityId: string;
  doctorId: string;
  type: EncounterType;
  startedAt: Date;
  open: boolean;
}

export async function createEncounter(
  { db }: SeedContext,
  input: CreateEncounterInput,
): Promise<string> {
  const [row] = await db
    .insert(encounters)
    .values({
      patientId: input.patientId,
      facilityId: input.facilityId,
      type: input.type,
      status: input.open ? 'OPEN' : 'CLOSED',
      referenceCode: nextReference('REC', 2900),
      attendingDoctorId: input.doctorId,
      startedAt: input.startedAt,
      endedAt: input.open ? null : new Date(input.startedAt.getTime() + 45 * 60_000),
    })
    .returning({ id: encounters.id });
  return row.id;
}

async function recordVitals(
  ctx: SeedContext,
  encounterId: string,
  recordedById: string,
  recordedAt: Date,
  abnormal: boolean,
): Promise<void> {
  const { random } = ctx;
  await ctx.db.insert(vitals).values({
    encounterId,
    recordedById,
    temperatureC: abnormal ? random.int(381, 397) / 10 : random.int(361, 374) / 10,
    systolic: abnormal ? random.int(150, 185) : random.int(108, 132),
    diastolic: abnormal ? random.int(95, 112) : random.int(68, 84),
    pulse: abnormal ? random.int(105, 128) : random.int(62, 90),
    respiratoryRate: abnormal ? random.int(22, 30) : random.int(14, 19),
    spo2: abnormal ? random.int(86, 92) : random.int(96, 99),
    weightKg: random.int(480, 920) / 10,
    heightCm: random.int(150, 188),
    recordedAt,
  });
}

async function seedEncounterDetails(
  ctx: SeedContext,
  encounterId: string,
  doctorId: string,
  labTechId: string,
  startedAt: Date,
): Promise<string> {
  const { db, random } = ctx;
  const diagnosis = random.pick(DIAGNOSES);

  const [note] = await db
    .insert(clinicalNotes)
    .values({
      encounterId,
      authorId: doctorId,
      type: 'CONSULTATION',
      subjective: diagnosis.complaint,
      objective: diagnosis.findings,
      assessment: diagnosis.name,
      plan: diagnosis.plan,
      primaryDiagnosis: diagnosis.name,
      icd10Codes: [diagnosis.code],
      followUpItems: diagnosis.followUps,
      isSensitive: diagnosis.isSensitive,
      signedAt: new Date(startedAt.getTime() + 30 * 60_000),
      createdAt: startedAt,
    })
    .returning({ id: clinicalNotes.id });

  if (random.chance(0.7)) {
    const [prescription] = await db
      .insert(prescriptions)
      .values({ encounterId, prescriberId: doctorId, createdAt: startedAt })
      .returning({ id: prescriptions.id });
    const items = random.shuffle(DRUGS).slice(0, random.int(1, 2));
    await db.insert(prescriptionItems).values(
      items.map((drug) => ({
        prescriptionId: prescription.id,
        drugName: drug.name,
        dose: drug.dose,
        route: drug.route,
        frequency: drug.frequency,
        duration: drug.duration,
        status: random.pick(['ACTIVE', 'DISPENSED', 'DISPENSED'] as const),
      })),
    );
  }

  if (random.chance(0.5)) {
    const test = random.pick(LAB_TESTS);
    const isResulted = random.chance(0.8);
    const [order] = await db
      .insert(labOrders)
      .values({
        encounterId,
        orderedById: doctorId,
        testName: test.name,
        loincCode: test.loinc,
        status: isResulted ? 'RESULTED' : 'ORDERED',
        collectedAt: isResulted ? new Date(startedAt.getTime() + 60 * 60_000) : null,
        createdAt: startedAt,
      })
      .returning({ id: labOrders.id });
    if (isResulted) {
      const abnormal = random.chance(0.35);
      await db.insert(labResults).values({
        labOrderId: order.id,
        analyte: test.analyte,
        value: abnormal ? test.abnormalValue : test.normalValue,
        unit: test.unit || null,
        referenceRange: test.referenceRange,
        isAbnormal: abnormal,
        resultedById: labTechId,
        resultedAt: new Date(startedAt.getTime() + 4 * 3_600_000),
      });
    }
  }

  return note.id;
}

export async function seedClinicalRecords(
  ctx: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
  patients: SeededPatient[],
): Promise<void> {
  const { db, random } = ctx;
  const labTechId = requireId(userIds, 'labChuk');
  const noteIds: { noteId: string; authorId: string }[] = [];
  let encounterCount = 0;

  for (const patient of patients) {
    const visitCount = random.int(1, 3);
    const visitedFacilities = new Map<string, Date>();

    for (let visit = 0; visit < visitCount; visit += 1) {
      const facilityCode =
        visit === 0 && CLINICAL_FACILITIES.includes(patient.registeredFacilityCode)
          ? patient.registeredFacilityCode
          : random.pick(CLINICAL_FACILITIES);
      const clinicians = CLINICIANS_BY_FACILITY[facilityCode];
      const doctorId = requireId(userIds, random.pick(clinicians.doctors));
      const vitalsById = clinicians.nurse ? requireId(userIds, clinicians.nurse) : doctorId;
      const startedAt =
        encounterCount % 9 === 0
          ? hoursAgo(random.int(2, 20))
          : daysAgo(random.int(2, 420), random.int(7, 16));

      const encounterId = await createEncounter(ctx, {
        patientId: patient.id,
        facilityId: requireId(facilityIds, facilityCode),
        doctorId,
        type: random.chance(0.85) ? 'OUTPATIENT' : 'EMERGENCY',
        startedAt,
        open: false,
      });
      await recordVitals(ctx, encounterId, vitalsById, startedAt, random.chance(0.25));
      const noteId = await seedEncounterDetails(ctx, encounterId, doctorId, labTechId, startedAt);
      noteIds.push({ noteId, authorId: doctorId });
      encounterCount += 1;

      const previous = visitedFacilities.get(facilityCode);
      if (!previous || previous < startedAt) visitedFacilities.set(facilityCode, startedAt);
    }

    for (const [facilityCode, lastVisit] of visitedFacilities) {
      await db.insert(recordAccessGrants).values({
        patientId: patient.id,
        facilityId: requireId(facilityIds, facilityCode),
        reason: 'CHECKED_IN',
        expiresAt: new Date(lastVisit.getTime() + 30 * 86_400_000),
        createdAt: lastVisit,
      });
    }
  }

  await seedCorrections(ctx, noteIds);
  await seedAppointments(ctx, facilityIds, userIds, patients);
  console.log(`  Encounters: ${encounterCount} (with notes, vitals, prescriptions, labs)`);
}

async function seedCorrections(
  { db }: SeedContext,
  noteIds: { noteId: string; authorId: string }[],
): Promise<void> {
  const [addendumTarget, errorTarget] = noteIds;
  await db.insert(noteAddenda).values({
    noteId: addendumTarget.noteId,
    authorId: addendumTarget.authorId,
    text: 'Addendum: patient reports the symptoms started one week earlier than initially stated.',
  });
  await db
    .update(clinicalNotes)
    .set({
      enteredInError: true,
      enteredInErrorReason: 'Documented on the wrong patient record.',
      enteredInErrorAt: new Date(),
    })
    .where(eq(clinicalNotes.id, errorTarget.noteId));
}

async function seedAppointments(
  { db, random }: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
  patients: SeededPatient[],
): Promise<void> {
  const facilityId = requireId(facilityIds, 'FAC-001');
  const doctorId = requireId(userIds, 'doctorChuk');
  const chosen = random.shuffle(patients).slice(0, 10);
  await db.insert(appointments).values(
    chosen.map((patient, index) => ({
      patientId: patient.id,
      facilityId,
      doctorId,
      scheduledAt: index < 6 ? hoursFromNow(index - 2) : hoursFromNow(24 * (index - 4)),
      status: index < 2 ? ('COMPLETED' as const) : ('SCHEDULED' as const),
      reason: random.pick([
        'Follow-up',
        'Blood pressure review',
        'Lab results review',
        'New consultation',
      ]),
    })),
  );
}

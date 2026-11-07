import { eq } from 'drizzle-orm';
import {
  allergies,
  conditions,
  immunizations,
  patients,
  type AllergySeverity,
  type BloodType,
  type InsuranceType,
  type NewPatient,
} from '../schema';
import { FACILITIES } from './data/facilities.data';
import {
  ALLERGY_SUBSTANCES,
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  VACCINES,
} from './data/names.data';
import { requireId, toIsoDate } from './seed-helpers';
import type {
  FacilityIdsByCode,
  SeedContext,
  SeededPatient,
  UserIdsByKey,
} from './types/seed.types';

const PATIENT_COUNT = 50;
const TEMPORARY_ID_PATIENTS = 4;
const MINOR_PATIENTS = 4;
const REGISTRATION_FACILITIES = ['FAC-001', 'FAC-001', 'FAC-001', 'FAC-002', 'FAC-004', 'FAC-005'];
const BLOOD_TYPES: BloodType[] = ['A_POS', 'B_POS', 'O_POS', 'O_POS', 'AB_POS', 'O_NEG', 'UNKNOWN'];
const INSURANCE_TYPES: InsuranceType[] = [
  'MUTUELLE',
  'MUTUELLE',
  'MUTUELLE',
  'RSSB',
  'MMI',
  'PRIVATE',
];
const SEVERITIES: AllergySeverity[] = ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'];

function buildNationalId(ctx: SeedContext, birthYear: number, sex: 'MALE' | 'FEMALE'): string {
  const sexDigit = sex === 'MALE' ? '8' : '7';
  return `1${birthYear}${sexDigit}${ctx.random.digits(7)}${ctx.random.int(0, 9)}${ctx.random.digits(2)}`;
}

function buildTemporaryId(ctx: SeedContext, index: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 5 }, () => ctx.random.pick([...alphabet])).join('');
  return `TMP-2026-${suffix}${index}`;
}

export async function seedPatients(
  ctx: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
): Promise<SeededPatient[]> {
  const { db, random } = ctx;
  const receptionistId = requireId(userIds, 'receptionChuk');
  const usedNationalIds = new Set<string>();
  const seeded: SeededPatient[] = [];

  for (let i = 0; i < PATIENT_COUNT; i += 1) {
    const sex = random.chance(0.5) ? 'MALE' : 'FEMALE';
    const isMinor = i >= PATIENT_COUNT - MINOR_PATIENTS;
    const usesTemporaryId = !isMinor && i < TEMPORARY_ID_PATIENTS;
    const birthYear = isMinor ? random.int(2012, 2022) : random.int(1950, 2004);
    const dateOfBirth = `${birthYear}-${String(random.int(1, 12)).padStart(2, '0')}-${String(random.int(1, 28)).padStart(2, '0')}`;
    const facilityCode = random.pick(REGISTRATION_FACILITIES);
    const facility = FACILITIES.find((f) => f.code === facilityCode);

    let nationalId: string | null = null;
    if (!usesTemporaryId && !isMinor) {
      do nationalId = buildNationalId(ctx, birthYear, sex);
      while (usedNationalIds.has(nationalId));
      usedNationalIds.add(nationalId);
    }

    const firstName = random.pick(sex === 'MALE' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    const lastName = random.pick(LAST_NAMES);
    const insuranceType = random.pick(INSURANCE_TYPES);
    const values: NewPatient = {
      nationalId,
      temporaryId: nationalId ? null : buildTemporaryId(ctx, i),
      firstName,
      lastName,
      dateOfBirth,
      sex,
      phone: usesTemporaryId ? null : `+25078${random.int(2, 9)}${random.digits(6)}`,
      province: facility?.province ?? 'KIGALI_CITY',
      district: facility?.district ?? 'Gasabo',
      sector: facilityCode === 'FAC-001' ? random.pick(['Remera', 'Kimironko', 'Kacyiru']) : null,
      bloodType: random.pick(BLOOD_TYPES),
      insuranceType,
      insuranceNumber: insuranceType === 'NONE' ? null : `${insuranceType}-${random.digits(6)}`,
      emergencyContactName: `${random.pick(FEMALE_FIRST_NAMES)} ${lastName}`,
      emergencyContactPhone: `+25078${random.int(2, 9)}${random.digits(6)}`,
      registeredAtFacilityId: requireId(facilityIds, facilityCode),
      registeredById: receptionistId,
      createdAt: new Date(Date.now() - random.int(30, 900) * 86_400_000),
    };

    const [row] = await db.insert(patients).values(values).returning({ id: patients.id });
    seeded.push({
      id: row.id,
      firstName,
      lastName,
      sex,
      dateOfBirth,
      registeredFacilityCode: facilityCode,
    });
  }

  await linkGuardians(ctx, seeded);
  await seedAllergiesAndConditions(ctx, seeded, facilityIds);

  console.log(
    `  Patients: ${seeded.length} (${TEMPORARY_ID_PATIENTS} with temporary IDs, ${MINOR_PATIENTS} minors)`,
  );
  return seeded;
}

async function linkGuardians(ctx: SeedContext, seeded: SeededPatient[]): Promise<void> {
  const minors = seeded.slice(-MINOR_PATIENTS);
  const adults = seeded.slice(TEMPORARY_ID_PATIENTS, -MINOR_PATIENTS);
  for (const minor of minors) {
    const guardian = ctx.random.pick(adults);
    await ctx.db
      .update(patients)
      .set({ guardianPatientId: guardian.id, lastName: guardian.lastName })
      .where(eq(patients.id, minor.id));
    minor.lastName = guardian.lastName;
  }
}

async function seedAllergiesAndConditions(
  ctx: SeedContext,
  seeded: SeededPatient[],
  facilityIds: FacilityIdsByCode,
): Promise<void> {
  const { db, random } = ctx;
  let allergyCount = 0;
  let conditionCount = 0;

  for (const patient of seeded) {
    const facilityId = requireId(facilityIds, patient.registeredFacilityCode);

    if (random.chance(0.3)) {
      const allergy = random.pick(ALLERGY_SUBSTANCES);
      await db.insert(allergies).values({
        patientId: patient.id,
        substance: allergy.substance,
        reaction: allergy.reaction,
        severity: random.pick(SEVERITIES),
        facilityId,
      });
      allergyCount += 1;
    }

    const birthYear = Number(patient.dateOfBirth.slice(0, 4));
    if (birthYear < 1985 && random.chance(0.6)) {
      await db.insert(conditions).values({
        patientId: patient.id,
        icd10Code: 'I10',
        name: 'Hypertension',
        onsetDate: `${random.int(2015, 2023)}-01-01`,
        facilityId,
      });
      conditionCount += 1;
    }
    if (birthYear < 1980 && random.chance(0.35)) {
      await db.insert(conditions).values({
        patientId: patient.id,
        icd10Code: 'E11.9',
        name: 'Type 2 Diabetes Mellitus',
        onsetDate: `${random.int(2012, 2022)}-06-01`,
        facilityId,
      });
      conditionCount += 1;
    }
    if (random.chance(0.06)) {
      await db.insert(conditions).values({
        patientId: patient.id,
        icd10Code: 'B20',
        name: 'HIV disease',
        onsetDate: `${random.int(2010, 2020)}-03-01`,
        isSensitive: true,
        facilityId,
      });
      conditionCount += 1;
    }

    if (random.chance(0.5)) {
      await db.insert(immunizations).values({
        patientId: patient.id,
        vaccine: random.pick(VACCINES),
        doseNumber: random.int(1, 3),
        administeredOn: toIsoDate(new Date(Date.now() - random.int(30, 1500) * 86_400_000)),
        facilityId,
      });
    }
  }

  console.log(`  Allergies: ${allergyCount}, conditions: ${conditionCount}`);
}

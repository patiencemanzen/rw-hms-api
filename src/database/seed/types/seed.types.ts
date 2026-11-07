import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../schema';
import type { FacilityLevel, Province, Role } from '../../schema';
import type { SeededRandom } from '../random';

export type SeedDatabase = NodePgDatabase<typeof schema>;

export interface SeedContext {
  db: SeedDatabase;
  random: SeededRandom;
  passwordHash: string;
}

export interface FacilitySeed {
  code: string;
  name: string;
  shortName: string;
  level: FacilityLevel;
  province: Province;
  district: string;
  phone: string;
}

export interface UserSeed {
  key: string;
  name: string;
  email: string;
  title: string | null;
  specialty: string | null;
  licenseId: string | null;
  phone: string;
  roles: { facilityCode: string; role: Role }[];
}

export interface AdminAreaSeed {
  name: string;
  children?: AdminAreaSeed[];
}

export interface DiagnosisSeed {
  code: string;
  name: string;
  isSensitive: boolean;
  complaint: string;
  findings: string;
  plan: string;
  followUps: string[];
}

export interface DrugSeed {
  name: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
}

export interface LabTestSeed {
  name: string;
  loinc: string;
  analyte: string;
  unit: string;
  referenceRange: string;
  normalValue: string;
  abnormalValue: string;
}

export type FacilityIdsByCode = Map<string, string>;
export type UserIdsByKey = Map<string, string>;

export interface SeededPatient {
  id: string;
  firstName: string;
  lastName: string;
  sex: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  registeredFacilityCode: string;
}

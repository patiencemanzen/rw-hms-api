import { eq } from 'drizzle-orm';
import {
  beds,
  recordAccessGrants,
  transfers,
  type NewTransfer,
  type TransferStatus,
  type TransferUrgency,
} from '../schema';
import { hoursAgo } from './random';
import { nextReference, requireId } from './seed-helpers';
import type {
  FacilityIdsByCode,
  SeedContext,
  SeededPatient,
  UserIdsByKey,
} from './types/seed.types';
import type { AvailableBedsByFacility } from './wards.seed';

interface TransferPlan {
  from: string;
  to: string;
  requestedBy: string;
  respondedBy: string | null;
  status: TransferStatus;
  urgency: TransferUrgency;
  requestedHoursAgo: number;
  responseMinutes: number | null;
  reason: string;
}

const PLANS: TransferPlan[] = [
  {
    from: 'FAC-005',
    to: 'FAC-001',
    requestedBy: 'doctorRrh',
    respondedBy: null,
    status: 'REQUESTED',
    urgency: 'EMERGENCY',
    requestedHoursAgo: 0.2,
    responseMinutes: null,
    reason: 'Specialized care (cardiology): suspected acute coronary syndrome',
  },
  {
    from: 'FAC-002',
    to: 'FAC-001',
    requestedBy: 'doctorChub',
    respondedBy: null,
    status: 'REQUESTED',
    urgency: 'URGENT',
    requestedHoursAgo: 3,
    responseMinutes: null,
    reason: 'Neurosurgical review not available at present facility',
  },
  {
    from: 'FAC-001',
    to: 'FAC-002',
    requestedBy: 'doctorChuk',
    respondedBy: 'doctorChub',
    status: 'ACCEPTED',
    urgency: 'ROUTINE',
    requestedHoursAgo: 20,
    responseMinutes: 95,
    reason: 'Continuation of care closer to home',
  },
  {
    from: 'FAC-001',
    to: 'FAC-004',
    requestedBy: 'doctorChuk',
    respondedBy: 'doctorMulti',
    status: 'REJECTED',
    urgency: 'URGENT',
    requestedHoursAgo: 30,
    responseMinutes: 40,
    reason: 'Specialized orthopaedic surgery',
  },
  {
    from: 'FAC-002',
    to: 'FAC-001',
    requestedBy: 'doctorChub',
    respondedBy: 'doctorChuk',
    status: 'IN_TRANSIT',
    urgency: 'EMERGENCY',
    requestedHoursAgo: 2,
    responseMinutes: 18,
    reason: 'ICU admission required for respiratory failure',
  },
  {
    from: 'FAC-005',
    to: 'FAC-001',
    requestedBy: 'doctorRrh',
    respondedBy: 'doctorChuk',
    status: 'ARRIVED',
    urgency: 'URGENT',
    requestedHoursAgo: 72,
    responseMinutes: 160,
    reason: 'Dialysis for acute kidney injury',
  },
  {
    from: 'FAC-001',
    to: 'FAC-005',
    requestedBy: 'doctorChuk',
    respondedBy: null,
    status: 'CANCELLED',
    urgency: 'ROUTINE',
    requestedHoursAgo: 120,
    responseMinutes: null,
    reason: 'Patient preference to continue care nearer family',
  },
];

function statusTimestamps(plan: TransferPlan, requestedAt: Date): Partial<NewTransfer> {
  const minutesAfter = (minutes: number) => new Date(requestedAt.getTime() + minutes * 60_000);
  const responded = plan.responseMinutes === null ? null : minutesAfter(plan.responseMinutes);
  switch (plan.status) {
    case 'ACCEPTED':
      return { acceptedAt: responded };
    case 'REJECTED':
      return {
        rejectedAt: responded,
        rejectionReason: 'No orthopaedic theatre capacity this week; please refer to CHUK.',
      };
    case 'IN_TRANSIT':
      return { acceptedAt: responded, inTransitAt: minutesAfter((plan.responseMinutes ?? 0) + 30) };
    case 'ARRIVED':
      return {
        acceptedAt: responded,
        inTransitAt: minutesAfter((plan.responseMinutes ?? 0) + 60),
        arrivedAt: minutesAfter((plan.responseMinutes ?? 0) + 240),
      };
    case 'CANCELLED':
      return { cancelledAt: minutesAfter(90) };
    default:
      return {};
  }
}

export async function seedTransfers(
  ctx: SeedContext,
  facilityIds: FacilityIdsByCode,
  userIds: UserIdsByKey,
  patients: SeededPatient[],
  availableBeds: AvailableBedsByFacility,
): Promise<void> {
  const { db, random } = ctx;
  const candidates = random.shuffle(
    patients.filter((p) => Number(p.dateOfBirth.slice(0, 4)) < 2008),
  );

  for (const [index, plan] of PLANS.entries()) {
    const patient = candidates[index];
    const requestedAt = hoursAgo(plan.requestedHoursAgo);
    const toFacilityId = requireId(facilityIds, plan.to);
    const isAccepted = ['ACCEPTED', 'IN_TRANSIT', 'ARRIVED'].includes(plan.status);

    let reservedBedId: string | null = null;
    if (plan.status === 'ACCEPTED' || plan.status === 'IN_TRANSIT') {
      reservedBedId = availableBeds.get(plan.to)?.shift() ?? null;
      if (reservedBedId) {
        await db.update(beds).set({ status: 'RESERVED' }).where(eq(beds.id, reservedBedId));
      }
    }

    await db.insert(transfers).values({
      referenceCode: nextReference('TR', 849),
      patientId: patient.id,
      fromFacilityId: requireId(facilityIds, plan.from),
      toFacilityId,
      requestedById: requireId(userIds, plan.requestedBy),
      respondedById: plan.respondedBy ? requireId(userIds, plan.respondedBy) : null,
      reason: plan.reason,
      urgency: plan.urgency,
      clinicalSummary: `${patient.firstName} ${patient.lastName}: ${plan.reason}. Vitals stable at time of request; current medications and allergies attached from the national record.`,
      ambulanceRequired: plan.urgency !== 'ROUTINE',
      status: plan.status,
      reservedBedId,
      requestedAt,
      createdAt: requestedAt,
      ...statusTimestamps(plan, requestedAt),
    });

    if (isAccepted) {
      await db.insert(recordAccessGrants).values({
        patientId: patient.id,
        facilityId: toFacilityId,
        reason: 'REFERRAL',
        grantedById: plan.respondedBy ? requireId(userIds, plan.respondedBy) : null,
        expiresAt: new Date(requestedAt.getTime() + 30 * 86_400_000),
        createdAt: requestedAt,
      });
    }
  }

  console.log(`  Transfers: ${PLANS.length} (one per status, plus an extra pending request)`);
}

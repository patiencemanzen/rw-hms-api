import type { Request } from 'express';
import type { Role } from '../../../database/schema/enums';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export interface FacilityMembership {
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  role: Role;
}

/** The signed-in user attached to the request by the auth guard. */
export interface AuthContext {
  userId: string;
  sessionId: string;
}

export type AuthenticatedRequest = Request & { auth: AuthContext };

export interface ClientInfo {
  ip: string | null;
  userAgent: string | null;
}

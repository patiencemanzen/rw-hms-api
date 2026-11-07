import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/database/database.constants';
import {
  facilities,
  passwordResetTokens,
  sessions,
  userFacilityRoles,
  users,
  type NewSession,
  type Session,
  type User,
} from '@/database/schema';
import type { Database, DbExecutor } from '@/database/types/database.types';
import type { FacilityMembership } from './types/auth.types';

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  transaction<T>(work: (tx: DbExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
      .limit(1);
    return user;
  }

  async findUserByEmailOrLicense(identifier: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        or(
          sql`lower(${users.email}) = ${identifier.toLowerCase()}`,
          sql`upper(${users.licenseId}) = ${identifier.toUpperCase()}`,
        ),
      )
      .limit(1);
    return user;
  }

  async findUserById(userId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user;
  }

  /** Counts a failed attempt and locks the account once the limit is reached. */
  async recordFailedLogin(
    userId: string,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<{ lockedUntil: Date | null }> {
    const reachesLimit = sql`${users.failedLoginCount} + 1 >= ${maxAttempts}`;
    const [row] = await this.db
      .update(users)
      .set({
        failedLoginCount: sql`case when ${reachesLimit} then 0 else ${users.failedLoginCount} + 1 end`,
        lockedUntil: sql`case when ${reachesLimit} then now() + make_interval(mins => ${lockMinutes}) else ${users.lockedUntil} end`,
      })
      .where(eq(users.id, userId))
      .returning({ lockedUntil: users.lockedUntil });
    return { lockedUntil: row?.lockedUntil ?? null };
  }

  async recordSuccessfulLogin(userId: string, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async findMemberships(userId: string): Promise<FacilityMembership[]> {
    return this.db
      .select({
        facilityId: facilities.id,
        facilityCode: facilities.code,
        facilityName: facilities.name,
        role: userFacilityRoles.role,
      })
      .from(userFacilityRoles)
      .innerJoin(facilities, eq(facilities.id, userFacilityRoles.facilityId))
      .where(and(eq(userFacilityRoles.userId, userId), eq(facilities.active, true)))
      .orderBy(asc(facilities.code), asc(userFacilityRoles.role));
  }

  async createSession(values: NewSession, executor: DbExecutor = this.db): Promise<Session> {
    const [session] = await executor.insert(sessions).values(values).returning();
    return session;
  }

  async findSessionByRefreshHash(hash: string): Promise<Session | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, hash))
      .limit(1);
    return session;
  }

  /** A session counts only while it is unrevoked, unexpired and its user is still active. */
  async findActiveSession(
    sessionId: string,
  ): Promise<{ session: Session; user: User } | undefined> {
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, sql`now()`),
          eq(users.active, true),
        ),
      )
      .limit(1);
    return row;
  }

  /**
   * Revokes the old session only if nobody else rotated it first, so two concurrent refreshes
   * cannot both mint a new session from the same token.
   */
  async markSessionReplaced(
    oldSessionId: string,
    newSessionId: string,
    executor: DbExecutor,
  ): Promise<boolean> {
    const updated = await executor
      .update(sessions)
      .set({ revokedAt: new Date(), replacedBySessionId: newSessionId })
      .where(and(eq(sessions.id, oldSessionId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return updated.length > 0;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }

  async revokeAllUserSessions(userId: string, executor: DbExecutor = this.db): Promise<void> {
    await executor
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  /** Issues a reset token and voids any earlier unused ones, so only the latest link works. */
  async replaceResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
      await tx.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
    });
  }

  /** Marks a valid token as used and returns its user, or undefined if the token is not valid. */
  async consumeResetToken(tokenHash: string, executor: DbExecutor): Promise<string | undefined> {
    const [row] = await executor
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, sql`now()`),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    return row?.userId;
  }

  async updatePassword(userId: string, passwordHash: string, executor: DbExecutor): Promise<void> {
    await executor
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null })
      .where(eq(users.id, userId));
  }
}

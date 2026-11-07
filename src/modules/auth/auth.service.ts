import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { ErrorCode } from '@/common/constants/error-codes';
import { AppException } from '@/common/exceptions/app.exception';
import { appConfig } from '@/config/app.config';
import { authConfig } from '@/config/auth.config';
import type { User } from '@/database/schema';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import {
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGINS,
  REFRESH_REUSE_GRACE_SECONDS,
  RESET_TOKEN_TTL_MINUTES,
} from './auth.constants';
import { AuthRepository } from './auth.repository';
import type { AuthSessionDto } from './dto/auth-session.dto';
import { buildResetPasswordEmail } from './mail/reset-password.mail';
import type { AccessTokenPayload, ClientInfo } from './types/auth.types';
import { failedPasswordRules } from './utils/password-policy';
import { generateToken, hashToken } from './utils/tokens';

export interface IssuedTokens {
  userId: string;
  accessToken: string;
  /** Absent when a concurrent refresh already rotated the token and the browser holds the new one. */
  refreshToken?: string;
}

const invalidCredentials = () =>
  new AppException(
    ErrorCode.INVALID_CREDENTIALS,
    'Invalid email or password',
    HttpStatus.UNAUTHORIZED,
  );

const sessionExpired = () =>
  new AppException(
    ErrorCode.SESSION_EXPIRED,
    'Your session has expired, please sign in again',
    HttpStatus.UNAUTHORIZED,
  );

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Verified against when the email is unknown, so response time does not reveal which accounts exist. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  async login(email: string, password: string, client: ClientInfo): Promise<IssuedTokens> {
    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      this.dummyHash ??= hash(generateToken());
      await verify(await this.dummyHash, password).catch(() => false);
      await this.audit.record({
        action: 'LOGIN_FAILED',
        metadata: { reason: 'UNKNOWN_EMAIL' },
        ...client,
      });
      throw invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'ACCOUNT_LOCKED' },
        ...client,
      });
      throw this.accountLocked(user.lockedUntil);
    }

    const passwordMatches = await verify(user.passwordHash, password).catch(() => false);
    if (!passwordMatches || !user.active) {
      const reason = passwordMatches ? 'ACCOUNT_INACTIVE' : 'WRONG_PASSWORD';
      const { lockedUntil } = passwordMatches
        ? { lockedUntil: null }
        : await this.repository.recordFailedLogin(user.id, MAX_FAILED_LOGINS, LOCKOUT_MINUTES);
      await this.audit.record({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason, locked: lockedUntil !== null },
        ...client,
      });
      if (lockedUntil && lockedUntil > new Date()) throw this.accountLocked(lockedUntil);
      throw invalidCredentials();
    }

    return this.repository.transaction(async (tx) => {
      await this.repository.recordSuccessfulLogin(user.id, tx);
      const refreshToken = generateToken();
      const session = await this.repository.createSession(
        { userId: user.id, ...this.newSessionFields(refreshToken), ...client },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          action: 'LOGIN_SUCCESS',
          entityType: 'session',
          entityId: session.id,
          ...client,
        },
        tx,
      );
      return {
        userId: user.id,
        accessToken: await this.signAccessToken(user.id, session.id),
        refreshToken,
      };
    });
  }

  /** Rotates the refresh token. Reusing an already rotated token revokes every session of that user. */
  async refresh(refreshToken: string | undefined, client: ClientInfo): Promise<IssuedTokens> {
    if (!refreshToken) throw sessionExpired();
    const session = await this.repository.findSessionByRefreshHash(this.hashRefresh(refreshToken));
    if (!session || session.expiresAt <= new Date()) throw sessionExpired();

    if (session.revokedAt) {
      const withinGrace =
        session.replacedBySessionId !== null &&
        Date.now() - session.revokedAt.getTime() < REFRESH_REUSE_GRACE_SECONDS * 1000;
      if (withinGrace && session.replacedBySessionId) {
        const replacement = await this.repository.findActiveSession(session.replacedBySessionId);
        if (replacement) {
          return {
            userId: session.userId,
            accessToken: await this.signAccessToken(session.userId, replacement.session.id),
          };
        }
      }
      if (session.replacedBySessionId) {
        this.logger.warn(
          { userId: session.userId },
          'Refresh token reuse detected, revoking all sessions',
        );
        await this.repository.revokeAllUserSessions(session.userId);
      }
      throw sessionExpired();
    }

    const user = await this.repository.findUserById(session.userId);
    if (!user?.active) throw sessionExpired();

    return this.repository.transaction(async (tx) => {
      const nextRefreshToken = generateToken();
      const next = await this.repository.createSession(
        { userId: user.id, ...this.newSessionFields(nextRefreshToken), ...client },
        tx,
      );
      const rotated = await this.repository.markSessionReplaced(session.id, next.id, tx);
      if (!rotated) throw sessionExpired();
      return {
        userId: user.id,
        accessToken: await this.signAccessToken(user.id, next.id),
        refreshToken: nextRefreshToken,
      };
    });
  }

  async logout(refreshToken: string | undefined, client: ClientInfo): Promise<void> {
    if (!refreshToken) return;
    const session = await this.repository.findSessionByRefreshHash(this.hashRefresh(refreshToken));
    if (!session || session.revokedAt) return;
    await this.repository.revokeSession(session.id);
    await this.audit.record({
      actorUserId: session.userId,
      action: 'LOGOUT',
      entityType: 'session',
      entityId: session.id,
      ...client,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.accessSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw sessionExpired();
    }
  }

  async getSession(userId: string, csrfToken: string): Promise<AuthSessionDto> {
    const user = await this.repository.findUserById(userId);
    if (!user?.active) throw sessionExpired();
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        avatarUrl: user.avatarUrl,
        preferredLocale: user.preferredLocale,
      },
      memberships: await this.repository.findMemberships(user.id),
      csrfToken,
    };
  }

  /**
   * Always resolves the same way whether or not the account exists, and sends the email in the
   * background, so callers cannot use this endpoint to discover accounts.
   */
  async requestPasswordReset(identifier: string, client: ClientInfo): Promise<void> {
    const user = await this.repository.findUserByEmailOrLicense(identifier);
    if (!user?.active) return;

    const token = generateToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);
    await this.repository.replaceResetToken(
      user.id,
      hashToken(token, this.config.refreshSecret, 'reset'),
      expiresAt,
    );
    await this.audit.record({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      ...client,
    });

    void this.sendResetEmail(user, token).catch((error: unknown) =>
      this.logger.error(
        { err: error instanceof Error ? error.message : String(error) },
        'Password reset email failed',
      ),
    );
  }

  async resetPassword(token: string, password: string, client: ClientInfo): Promise<void> {
    const broken = failedPasswordRules(password);
    if (broken.length > 0) {
      throw new AppException(
        ErrorCode.WEAK_PASSWORD,
        'Password does not meet the security requirements',
        HttpStatus.BAD_REQUEST,
        broken.map((rule) => ({ field: 'password', messages: [rule] })),
      );
    }
    const passwordHash = await hash(password);

    await this.repository.transaction(async (tx) => {
      const userId = await this.repository.consumeResetToken(
        hashToken(token, this.config.refreshSecret, 'reset'),
        tx,
      );
      if (!userId) {
        throw new AppException(
          ErrorCode.INVALID_RESET_TOKEN,
          'This reset link is invalid or has expired',
          HttpStatus.BAD_REQUEST,
        );
      }
      const user = await this.repository.findUserById(userId);
      if (user && (await verify(user.passwordHash, password).catch(() => false))) {
        throw new AppException(
          ErrorCode.WEAK_PASSWORD,
          'The new password must be different from the current one',
          HttpStatus.BAD_REQUEST,
          [{ field: 'password', messages: ['reused'] }],
        );
      }
      await this.repository.updatePassword(userId, passwordHash, tx);
      await this.repository.revokeAllUserSessions(userId, tx);
      await this.audit.record({ actorUserId: userId, action: 'PASSWORD_RESET', ...client }, tx);
    });
  }

  private async sendResetEmail(user: User, token: string): Promise<void> {
    const locale = ['en', 'rw', 'fr'].includes(user.preferredLocale) ? user.preferredLocale : 'en';
    const link = `${this.app.frontendOrigin}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.send({
      to: user.email,
      ...buildResetPasswordEmail(locale, user.name, link, RESET_TOKEN_TTL_MINUTES),
    });
  }

  private newSessionFields(refreshToken: string) {
    return {
      refreshTokenHash: this.hashRefresh(refreshToken),
      expiresAt: new Date(Date.now() + this.config.refreshTtlDays * 86_400_000),
    };
  }

  private hashRefresh(token: string): string {
    return hashToken(token, this.config.refreshSecret, 'refresh');
  }

  private signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    return this.jwt.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  private accountLocked(until: Date): AppException {
    return new AppException(
      ErrorCode.ACCOUNT_LOCKED,
      `Too many failed attempts. Try again after ${until.toISOString()}`,
      HttpStatus.LOCKED,
      [{ field: 'lockedUntil', messages: [until.toISOString()] }],
    );
  }
}

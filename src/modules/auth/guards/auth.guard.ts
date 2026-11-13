import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuthCookies } from '../auth.cookies';
import { ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER } from '../auth.constants';
import { AuthRepository } from '../auth.repository';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../types/auth.types';
import { safeEqual } from '../utils/tokens';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Global guard: every HTTP route needs a live session unless marked @Public(). The session is
 * checked in the database on each request so logout and password resets take effect immediately.
 * Write requests must also echo the CSRF token in the X-CSRF-Token header.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly repository: AuthRepository,
    private readonly cookies: AuthCookies,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.cookies.read(request, ACCESS_COOKIE);
    if (!token) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        'Sign in to continue',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload = await this.authService.verifyAccessToken(token);
    const active = await this.repository.findActiveSession(payload.sid);
    if (!active || active.user.id !== payload.sub) {
      throw new AppException(
        ErrorCode.SESSION_EXPIRED,
        'Your session has expired, please sign in again',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!SAFE_METHODS.has(request.method)) {
      const expected = this.cookies.read(request, CSRF_COOKIE);
      const received = request.header(CSRF_HEADER);
      if (!expected || !received || !safeEqual(expected, received)) {
        throw new AppException(
          ErrorCode.CSRF_TOKEN_INVALID,
          'Missing or invalid CSRF token',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    (request as AuthenticatedRequest).auth = { userId: payload.sub, sessionId: payload.sid };
    return true;
  }
}

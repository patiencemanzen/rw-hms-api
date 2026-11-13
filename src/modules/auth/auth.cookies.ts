import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { authConfig } from '../../config/auth.config';
import {
  ACCESS_COOKIE,
  API_COOKIE_PATH,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from './auth.constants';
import type { ClientInfo } from './types/auth.types';

/** All session cookies are httpOnly: the browser app gets the CSRF token from response bodies. */
@Injectable()
export class AuthCookies {
  constructor(@Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>) {}

  setAccess(res: Response, token: string): void {
    res.cookie(ACCESS_COOKIE, token, {
      ...this.base('lax', API_COOKIE_PATH),
      maxAge: this.config.accessTtlSeconds * 1000,
    });
  }

  setRefresh(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.base('strict', REFRESH_COOKIE_PATH),
      maxAge: this.config.refreshTtlDays * 86_400_000,
    });
  }

  setCsrf(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE, token, {
      ...this.base('lax', API_COOKIE_PATH),
      maxAge: this.config.refreshTtlDays * 86_400_000,
    });
  }

  clearAll(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.base('lax', API_COOKIE_PATH));
    res.clearCookie(CSRF_COOKIE, this.base('lax', API_COOKIE_PATH));
    res.clearCookie(REFRESH_COOKIE, this.base('strict', REFRESH_COOKIE_PATH));
  }

  read(req: Request, name: string): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private base(sameSite: 'lax' | 'strict', path: string): CookieOptions {
    return { httpOnly: true, secure: this.config.secureCookies, sameSite, path };
  }
}

export function clientInfo(req: Request): ClientInfo {
  const userAgent = req.headers['user-agent'];
  return {
    ip: req.ip?.slice(0, 64) ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
  };
}

import { registerAs } from '@nestjs/config';
import { loadEnv } from './env.schema';

export const authConfig = registerAs('auth', () => {
  const env = loadEnv();
  return {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    cookieSecret: env.COOKIE_SECRET,
    accessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
    refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    secureCookies: env.NODE_ENV === 'production',
  };
});

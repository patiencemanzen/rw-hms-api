import { registerAs } from '@nestjs/config';
import { loadEnv } from './env.schema';

export const mailConfig = registerAs('mail', () => {
  const env = loadEnv();
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    secure: env.SMTP_SECURE,
    from: env.MAIL_FROM,
    // Development uses unauthenticated Mailpit; anywhere else, missing credentials mean email is off.
    credentialsExpected: env.NODE_ENV === 'production',
  };
});

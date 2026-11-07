import { z } from 'zod';

const secret = z.string().min(32, 'must be at least 32 characters');
const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),
    FRONTEND_ORIGIN: z.url(),
    SWAGGER_ENABLED: booleanString,

    DATABASE_URL: z.url().refine((value) => value.startsWith('postgres'), {
      message: 'must be a postgres:// connection string',
    }),

    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    COOKIE_SECRET: secret,
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive(),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    // Mailpit in development accepts unauthenticated SMTP, so credentials are only required in production.
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASSWORD: z.string().optional().default(''),
    SMTP_SECURE: booleanString,
    MAIL_FROM: z.string().min(3),

    // Document storage is optional until a feature uses it: set all four S3 values or none.
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1).optional(),
    S3_SECRET_KEY: z.string().min(1).optional(),
    S3_BUCKET: z.string().min(3).optional(),

    // How many reverse proxies sit in front of the API (Express 'trust proxy'), so req.ip is the
    // real client address for rate limits and audit logs. 'false' when the API is reached directly.
    TRUST_PROXY: z
      .string()
      .regex(/^(true|false|\d+)$/, 'must be true, false or a number of hops')
      .default('false')
      .transform((value) => (value === 'true' ? true : value === 'false' ? false : Number(value))),
  })
  .superRefine((env, ctx) => {
    const secrets = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET, env.COOKIE_SECRET];
    if (new Set(secrets).size !== secrets.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and COOKIE_SECRET must all differ',
      });
    }
    const s3 = [env.S3_ENDPOINT, env.S3_ACCESS_KEY, env.S3_SECRET_KEY, env.S3_BUCKET];
    if (s3.some(Boolean) && !s3.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_ENDPOINT'],
        message: 'set all of S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY and S3_BUCKET, or none',
      });
    }
    if (env.NODE_ENV !== 'production') return;
    if (!env.FRONTEND_ORIGIN.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_ORIGIN'],
        message: 'must use https in production',
      });
    }
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP credentials are required in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}

let cachedEnv: Env | undefined;

export function loadEnv(): Env {
  cachedEnv ??= validateEnv(process.env);
  return cachedEnv;
}

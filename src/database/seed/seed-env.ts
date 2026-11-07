import { existsSync } from 'node:fs';
import { z } from 'zod';

const seedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  SEED_DEFAULT_PASSWORD: z
    .string()
    .min(12, 'must be at least 12 characters')
    .regex(/[A-Z]/, 'must contain an uppercase letter')
    .regex(/[a-z]/, 'must contain a lowercase letter')
    .regex(/\d/, 'must contain a number')
    .regex(/[^A-Za-z0-9]/, 'must contain a special character'),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;

export function loadSeedEnv(): SeedEnv {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const result = seedEnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid seed environment:\n${problems.join('\n')}`);
  }
  if (result.data.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production');
  }
  return result.data;
}

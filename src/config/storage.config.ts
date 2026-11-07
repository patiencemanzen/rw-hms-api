import { registerAs } from '@nestjs/config';
import { loadEnv } from './env.schema';

export const storageConfig = registerAs('storage', () => {
  const env = loadEnv();
  const { S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET } = env;
  // The env schema guarantees these are either all set or all missing.
  const configured = Boolean(S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET);
  return {
    configured,
    endpoint: S3_ENDPOINT ?? '',
    region: env.S3_REGION,
    accessKey: S3_ACCESS_KEY ?? '',
    secretKey: S3_SECRET_KEY ?? '',
    bucket: S3_BUCKET ?? '',
  };
});

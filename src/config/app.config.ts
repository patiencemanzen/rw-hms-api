import { registerAs } from '@nestjs/config';
import { loadEnv } from './env.schema';

export const appConfig = registerAs('app', () => {
  const env = loadEnv();
  const isProduction = env.NODE_ENV === 'production';
  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    frontendOrigin: env.FRONTEND_ORIGIN,
    swaggerEnabled: env.SWAGGER_ENABLED,
    trustProxy: env.TRUST_PROXY,
  };
});

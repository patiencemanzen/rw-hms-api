import { registerAs } from '@nestjs/config';
import { loadEnv } from './env.schema';

export const dbConfig = registerAs('db', () => ({
  url: loadEnv().DATABASE_URL,
}));

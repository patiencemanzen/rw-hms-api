import { existsSync } from 'node:fs';

process.env.NODE_ENV = 'test';
if (existsSync('.env.test')) process.loadEnvFile('.env.test');

import { RequestMethod } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import type { appConfig } from './app.config';

// Cookies, auth headers and CSRF tokens must never reach the logs; request bodies are not logged at all.
const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
];

export function buildLoggerParams(config: ConfigType<typeof appConfig>): Params {
  return {
    forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
    pinoHttp: {
      level: config.logLevel,
      redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          path: req.url.split('?')[0],
        }),
      },
      ...(config.isProduction || config.nodeEnv === 'test'
        ? {}
        : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),
    },
  };
}

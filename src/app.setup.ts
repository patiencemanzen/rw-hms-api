import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { setupSwagger } from './common/swagger/swagger.setup';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';

export const API_PREFIX = 'api';
export const API_DEFAULT_VERSION = '1';

export function configureApp(app: INestApplication): void {
  const appSettings = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  const auth = app.get<ConfigType<typeof authConfig>>(authConfig.KEY);

  // Behind proxies (e.g. Vercel rewrite -> Render), take the client IP from X-Forwarded-For.
  const express = app.getHttpAdapter().getInstance() as Express;
  express.set('trust proxy', appSettings.trustProxy);
  app.use(helmet());
  app.use(cookieParser(auth.cookieSecret));
  app.enableCors({
    origin: appSettings.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Facility-Id', 'X-CSRF-Token', 'Idempotency-Key'],
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableShutdownHooks();

  if (appSettings.swaggerEnabled) setupSwagger(app);
}

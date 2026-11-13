import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { ErrorResponseDto, FieldErrorDto } from '../dto/error-response.dto';
import { PaginationMetaDto } from '../dto/paginated-response.dto';
import { ACCESS_COOKIE } from '../../modules/auth/auth.constants';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Global Inc API')
    .setDescription('Hospital Management & Interconnection System')
    .setVersion('1.0')
    .addCookieAuth(ACCESS_COOKIE)
    .addSecurityRequirements('cookie')
    .build();

  return SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto, FieldErrorDto, PaginationMetaDto],
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { withCredentials: true, persistAuthorization: false },
  });
}

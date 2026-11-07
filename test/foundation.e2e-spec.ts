import type { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { buildOpenApiDocument } from '@/common/swagger/swagger.setup';
import { DRIZZLE } from '@/database/database.constants';
import { auditLogs } from '@/database/schema';
import type { Database } from '@/database/types/database.types';
import { createTestApp } from './utils/create-test-app';

describe('Foundation (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports the database as up', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', details: { database: { status: 'up' } } });
  });

  it('returns the standard error body for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(response.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: expect.any(String),
    });
  });

  it('sets security headers through helmet', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('does not serve Swagger UI when SWAGGER_ENABLED=false', async () => {
    await request(app.getHttpServer()).get('/api/docs-json').expect(404);
  });

  it('builds an OpenAPI document that includes the health endpoint', () => {
    const document = buildOpenApiDocument(app);
    expect(document.paths['/api/health']).toBeDefined();
    expect(document.components?.schemas?.ErrorResponseDto).toBeDefined();
  });

  it('rejects UPDATE and DELETE on audit_logs at the database level', async () => {
    const [entry] = await db
      .insert(auditLogs)
      .values({ action: 'LOGIN_FAILED', metadata: { source: 'e2e' } })
      .returning({ id: auditLogs.id });

    await expect(
      db.execute(sql`update audit_logs set reason = 'tampered' where id = ${entry.id}`),
    ).rejects.toThrow();
    await expect(db.execute(sql`delete from audit_logs where id = ${entry.id}`)).rejects.toThrow();
  });
});

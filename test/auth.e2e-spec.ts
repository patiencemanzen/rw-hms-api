import { Controller, HttpCode, type INestApplication, Post } from '@nestjs/common';
import { hash } from 'argon2';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import { DRIZZLE } from '@/database/database.constants';
import { auditLogs, facilities, sessions, userFacilityRoles, users } from '@/database/schema';
import type { Database } from '@/database/types/database.types';
import { MailService } from '@/modules/mail/mail.service';
import type { MailMessage } from '@/modules/mail/types/mail.types';
import { createTestApp } from './utils/create-test-app';

/** A protected write route, used to check that the global guard enforces CSRF. */
@Controller('test-probe')
class ProbeController {
  @Post()
  @HttpCode(204)
  write(): void {}
}

const PASSWORD = 'Correct!Horse2026';
const NEW_PASSWORD = 'Brand-New!Pass2027';

type Jar = Record<string, string>;

/** Collects Set-Cookie headers into a jar; cookies cleared by the server are dropped. */
function collect(response: Response, jar: Jar = {}): Jar {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  for (const line of header ?? []) {
    const [pair] = line.split(';');
    const [name, ...rest] = pair.split('=');
    const value = rest.join('=');
    if (value) jar[name] = value;
    else delete jar[name];
  }
  return jar;
}

const cookieHeader = (jar: Jar, ...names: string[]) =>
  names
    .filter((name) => jar[name])
    .map((name) => `${name}=${jar[name]}`)
    .join('; ');

function setCookieLine(response: Response, name: string): string | undefined {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return header?.find((line) => line.startsWith(`${name}=`));
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;
  const sentMail: MailMessage[] = [];
  const runId = randomUUID().slice(0, 8);
  let facilityId: string;

  async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Test Clinician',
        email: `clinician.${randomUUID().slice(0, 8)}@e2e.rwhms.test`,
        passwordHash: await hash(PASSWORD),
        licenseId: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`,
        ...overrides,
      })
      .returning();
    await db.insert(userFacilityRoles).values({ userId: user.id, facilityId, role: 'DOCTOR' });
    return user;
  }

  const http = () => request(app.getHttpServer());
  const login = (email: string, password = PASSWORD) =>
    http().post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [ProbeController],
      customize: (builder) =>
        builder.overrideProvider(MailService).useValue({
          send: (message: MailMessage) => {
            sentMail.push(message);
            return Promise.resolve();
          },
        }),
    });
    db = app.get<Database>(DRIZZLE);
    const [facility] = await db
      .insert(facilities)
      .values({
        code: `E2E-${runId}`,
        name: `E2E Hospital ${runId}`,
        level: 'DISTRICT',
        province: 'KIGALI_CITY',
        district: 'Gasabo',
      })
      .returning();
    facilityId = facility.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes without a session', async () => {
    const response = await http().get('/api/v1/auth/me').expect(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const user = await createUser();
    const wrong = await login(user.email, 'Wrong!Password1').expect(401);
    const unknown = await login('nobody@e2e.rwhms.test').expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('validates the login body', async () => {
    const response = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('signs in, sets hardened cookies and returns the session', async () => {
    const user = await createUser();
    const response = await login(user.email.toUpperCase()).expect(200);

    expect(response.body).toEqual({
      user: expect.objectContaining({ id: user.id, email: user.email, name: user.name }),
      memberships: [
        expect.objectContaining({ facilityId, facilityCode: `E2E-${runId}`, role: 'DOCTOR' }),
      ],
      csrfToken: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');

    const access = setCookieLine(response, 'rwhms_access');
    const refresh = setCookieLine(response, 'rwhms_refresh');
    expect(access).toMatch(/HttpOnly/);
    expect(access).toMatch(/Path=\/api;/);
    expect(access).toMatch(/SameSite=Lax/);
    expect(refresh).toMatch(/HttpOnly/);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
    expect(refresh).toMatch(/SameSite=Strict/);

    const jar = collect(response);
    const me = await http()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader(jar, 'rwhms_access', 'rwhms_csrf'))
      .expect(200);
    expect(me.body.user.id).toBe(user.id);
    expect(me.body.csrfToken).toBe(response.body.csrfToken);

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actorUserId, user.id), eq(auditLogs.action, 'LOGIN_SUCCESS')));
    expect(entry).toBeDefined();
  });

  it('requires a matching CSRF token on protected write requests', async () => {
    const user = await createUser();
    const response = await login(user.email).expect(200);
    const jar = collect(response);
    const cookies = cookieHeader(jar, 'rwhms_access', 'rwhms_csrf');

    const missing = await http().post('/api/v1/test-probe').set('Cookie', cookies).expect(403);
    expect(missing.body.code).toBe('CSRF_TOKEN_INVALID');
    await http()
      .post('/api/v1/test-probe')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', 'forged')
      .expect(403);
    await http()
      .post('/api/v1/test-probe')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', response.body.csrfToken as string)
      .expect(204);
  });

  it('rotates the refresh token and revokes everything when an old token is replayed', async () => {
    const user = await createUser();
    const jar = collect(await login(user.email).expect(200));
    const firstRefresh = jar.rwhms_refresh;

    const rotated = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader(jar, 'rwhms_refresh', 'rwhms_csrf'))
      .expect(200);
    collect(rotated, jar);
    expect(jar.rwhms_refresh).not.toBe(firstRefresh);

    // A second tab refreshing with the same token moments later is a race, not theft.
    const raced = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', `rwhms_refresh=${firstRefresh}`)
      .expect(200);
    expect(setCookieLine(raced, 'rwhms_refresh')).toBeUndefined();
    expect(setCookieLine(raced, 'rwhms_access')).toBeDefined();

    // Replaying it after the grace window is treated as theft.
    await db
      .update(sessions)
      .set({ revokedAt: sql`now() - interval '5 minutes'` })
      .where(and(eq(sessions.userId, user.id), sql`${sessions.revokedAt} is not null`));
    const replay = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', `rwhms_refresh=${firstRefresh}`)
      .expect(401);
    expect(replay.body.code).toBe('SESSION_EXPIRED');

    const active = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
    expect(active).toHaveLength(0);
    await http()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader(jar, 'rwhms_access'))
      .expect(401);
  });

  it('logs out, clears cookies and invalidates the access token immediately', async () => {
    const user = await createUser();
    const jar = collect(await login(user.email).expect(200));

    const response = await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', cookieHeader(jar, 'rwhms_refresh'))
      .expect(204);
    expect(setCookieLine(response, 'rwhms_access')).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(setCookieLine(response, 'rwhms_refresh')).toMatch(/Expires=Thu, 01 Jan 1970/);

    const me = await http()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader(jar, 'rwhms_access'))
      .expect(401);
    expect(me.body.code).toBe('SESSION_EXPIRED');
    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader(jar, 'rwhms_refresh'))
      .expect(401);

    // Logging out without a session is harmless.
    await http().post('/api/v1/auth/logout').expect(204);
  });

  it('locks the account after five failed attempts', async () => {
    const user = await createUser();
    for (let attempt = 1; attempt <= 4; attempt++) {
      await login(user.email, 'Wrong!Password1').expect(401);
    }
    const fifth = await login(user.email, 'Wrong!Password1').expect(423);
    expect(fifth.body.code).toBe('ACCOUNT_LOCKED');

    const whileLocked = await login(user.email).expect(423);
    expect(whileLocked.body.code).toBe('ACCOUNT_LOCKED');

    await db.update(users).set({ lockedUntil: null }).where(eq(users.id, user.id));
    await login(user.email).expect(200);
  });

  it('does not let inactive users sign in', async () => {
    const user = await createUser({ active: false });
    const response = await login(user.email).expect(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('resets the password through an emailed single-use link', async () => {
    const user = await createUser({ preferredLocale: 'fr' });
    const oldSession = collect(await login(user.email).expect(200));

    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ identifier: 'nobody@e2e.rwhms.test' })
      .expect(202);
    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ identifier: user.licenseId?.toLowerCase() })
      .expect(202);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const mail = sentMail.find((message) => message.to === user.email);
    expect(mail?.subject).toContain('mot de passe');
    expect(sentMail.filter((message) => message.to === 'nobody@e2e.rwhms.test')).toHaveLength(0);
    const token = /\/fr\/reset-password\?token=([\w-]+)/.exec(mail?.text ?? '')?.[1];
    expect(token).toBeDefined();

    const weak = await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'short' })
      .expect(400);
    expect(weak.body.code).toBe('WEAK_PASSWORD');

    const reused = await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: PASSWORD })
      .expect(400);
    expect(reused.body.code).toBe('WEAK_PASSWORD');

    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: NEW_PASSWORD })
      .expect(204);
    const again = await http()
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'Another!Pass2028' })
      .expect(400);
    expect(again.body.code).toBe('INVALID_RESET_TOKEN');

    await http()
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader(oldSession, 'rwhms_access'))
      .expect(401);
    await login(user.email).expect(401);
    await login(user.email, NEW_PASSWORD).expect(200);

    const actions = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, user.id))
      .orderBy(desc(auditLogs.createdAt));
    expect(actions.map((row) => row.action)).toEqual(
      expect.arrayContaining(['PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET']),
    );
  });
});

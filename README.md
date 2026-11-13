# Global Inc API

NestJS backend for **Global Inc**, the Hospital Management & Interconnection System.
All business logic, permission checks and database access live here; the web app
([`rw-hms-web`](../rw-hms-web)) talks to it only over HTTP, using the OpenAPI spec as the contract.

## Requirements

- Node.js 22+ and npm
- Docker (Postgres and Mailpit for local development)

## Setup

```bash
npm install
cp .env.example .env
```

Generate the three secrets and paste them into `.env` (each must be different and at least 32 characters):

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 48   # COOKIE_SECRET
```

The API validates every variable at startup and refuses to start if one is missing or invalid.

Start the services, create the schema and load the development data:

```bash
docker compose up -d        # Postgres on :5433, Mailpit on :1025 (web UI http://localhost:8025)
npm run db:migrate
npm run db:seed
npm run start:dev           # http://localhost:4000
```

| URL | Purpose |
| --- | --- |
| http://localhost:4000/api/v1 | API (all routes are versioned) |
| http://localhost:4000/api/health | Health check (public) |
| http://localhost:4000/api/docs | Swagger UI (disabled when `SWAGGER_ENABLED=false`) |
| http://localhost:4000/api/docs-json | Raw OpenAPI spec, used by the web app's `npm run api:types` |
| http://localhost:8025 | Mailpit inbox for password-reset and invitation emails |

### Authentication

Every route needs a signed-in session unless it is marked `@Public()` (the global `AuthGuard` in
`src/modules/auth`). Sessions use three httpOnly cookies set by the API:

| Cookie | Path | Purpose |
| --- | --- | --- |
| `rwhms_access` | `/api` | Short-lived JWT (`JWT_ACCESS_TTL_SECONDS`), checked against the `sessions` table on every request so logout is immediate |
| `rwhms_refresh` | `/api/v1/auth` | Opaque token, rotated on every `POST /auth/refresh`. Replaying an old one after a 30 s grace window revokes all of the user's sessions |
| `rwhms_csrf` | `/api` | CSRF secret. The browser app gets the same value in the `csrfToken` field of the login, refresh and `/auth/me` responses, and must send it as `X-CSRF-Token` on every write request |

| Endpoint | Notes |
| --- | --- |
| `POST /api/v1/auth/login` | 5 wrong passwords lock the account for 15 minutes (`423 ACCOUNT_LOCKED`). Rate limit: 10/min |
| `POST /api/v1/auth/refresh` | Rotates the refresh token |
| `POST /api/v1/auth/logout` | Revokes the session and clears the cookies |
| `GET /api/v1/auth/me` | User, facility roles and CSRF token |
| `POST /api/v1/auth/forgot-password` | Accepts an email or license ID. Always returns `202`, and emails a 30-minute single-use link in the user's language |
| `POST /api/v1/auth/reset-password` | Enforces the password policy (12+ characters, an uppercase letter, a number, a symbol), rejects the current password, and signs out every session |

Every login, failed login, logout and reset is written to `audit_logs`. Rate limits are switched off
when `NODE_ENV=test`.

### Object storage (documents)

Uploads use the S3 API. The `minio` services in `docker-compose.yml` sit behind the `storage` profile
because the official MinIO images are no longer published on Docker Hub. Point the `image:` lines at an
S3-compatible image your team trusts, then run `docker compose --profile storage up -d`.

Storage is optional until a feature uses it: set all four `S3_*` values (endpoint, keys, bucket) or
none. Without them the API starts normally, and storage calls return `503 SERVICE_UNAVAILABLE`.

## Deploying to production

The API and Postgres run on **Render** (`render.yaml`, Frankfurt region) and the web app on
**Vercel**. The browser only ever talks to the Vercel domain: Vercel proxies `/api/*` to Render
(see `rw-hms-web/next.config.ts`), so session cookies stay first-party with or without a custom
domain.

> **Before real patient data goes in:** Rwanda's personal data protection law (Law No. 058/2021)
> treats health data as sensitive and restricts storing personal data outside Rwanda.
> Render (Frankfurt) and Vercel are outside Rwanda, so get clearance from NCSA, the data
> protection authority, or plan a move to in-country hosting.

You need:

- GitHub repos for `rw-hms-api` and `rw-hms-web`
- Render and Vercel accounts
- An SMTP provider for password-reset email (host, port, username, password, and a verified sender)

**1. Choose the web URL.** In Vercel, pick the project name now, e.g. `rw-hms-web`. That fixes
the URL `https://rw-hms-web.vercel.app`, which the API needs as `FRONTEND_ORIGIN`.

**2. API and database on Render.** Go to New > Blueprint and select the `rw-hms-api` repo. Render
creates the database, generates the three secrets, and asks for:

| Variable | Value |
| --- | --- |
| `FRONTEND_ORIGIN` | The web URL from step 1 (https, no trailing slash) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | From your provider, e.g. `smtp.example.com` / `465` / `true` |
| `SMTP_USER` / `SMTP_PASSWORD` | Provider credentials (required in production) |
| `MAIL_FROM` | e.g. `Global Inc <no-reply@your-domain>`; must be a sender your provider has verified |

Each deploy runs `npm run db:migrate:prod` first, then starts the server. Wait until
`https://<service>.onrender.com/api/health` reports `"status":"ok"`.

**3. Create the first facility and Super Admin (once).** Open the service's Shell in Render and run:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@your-domain BOOTSTRAP_ADMIN_NAME="Full Name" \
BOOTSTRAP_FACILITY_CODE=CHUK BOOTSTRAP_FACILITY_NAME="University Teaching Hospital of Kigali" \
BOOTSTRAP_FACILITY_LEVEL=NATIONAL_REFERRAL BOOTSTRAP_FACILITY_PROVINCE=KIGALI_CITY \
BOOTSTRAP_FACILITY_DISTRICT=Nyarugenge BOOTSTRAP_REFERENCE_DATA=true \
npm run db:bootstrap
```

This is safe to re-run; it only creates what's missing. No password is printed. The admin sets one
with "Forgot password" on the login page once the web app is live. `BOOTSTRAP_REFERENCE_DATA=true`
loads the starter admin-area and ICD-10 lists, which are still partial: replace them with official
NISR and WHO data. Never run `db:seed` against production (it refuses to anyway).

**4. Web on Vercel.** Import the `rw-hms-web` repo with the framework preset Next.js and set:

| Variable | Value |
| --- | --- |
| `API_URL` | `https://<service>.onrender.com` (no trailing slash) |

Deploy, then open the site, use "Forgot password" for the admin email, and sign in.

**5. After go-live, check:**

- Sign in, then sign out, and confirm a protected page sends you back to login.
- Open the audit log entries for those sign-ins and confirm the `ip` column holds real client
  addresses, not Vercel's. If it shows Vercel IPs, adjust `TRUST_PROXY` on Render. This matters
  because login rate limits are per IP.
- Enable Render database backups or point-in-time recovery, and set up uptime alerts on `/api/health`.
- Moving to custom domains later: update `FRONTEND_ORIGIN` (Render) and `API_URL` (Vercel), then
  redeploy both.

## Development accounts

`npm run db:seed` **wipes the database** and loads fictional data: 14 facilities across all five
provinces, 50 patients, encounters at several facilities, wards and beds, transfers in every status
and sample audit entries. It refuses to run when `NODE_ENV=production`.

Every account uses the password in `SEED_DEFAULT_PASSWORD` (`.env.example` sets `ChangeMe!Dev2026`).
For local development only.

| Email | Role @ facility |
| --- | --- |
| superadmin@rwhms.gov.rw | SUPER_ADMIN (Ministry of Health) |
| admin.chuk@rwhms.gov.rw | HOSPITAL_ADMIN @ CHUK |
| doctor.chuk@rwhms.gov.rw | DOCTOR @ CHUK |
| nurse.chuk@rwhms.gov.rw | NURSE @ CHUK |
| reception.chuk@rwhms.gov.rw | RECEPTIONIST @ CHUK |
| lab.chuk@rwhms.gov.rw | LAB_TECH @ CHUK |
| pharmacist.chuk@rwhms.gov.rw | PHARMACIST @ CHUK |
| billing.chuk@rwhms.gov.rw | BILLING_OFFICER @ CHUK |
| doctor.chub@rwhms.gov.rw | DOCTOR @ CHUB |
| admin.chub@rwhms.gov.rw | HOSPITAL_ADMIN @ CHUB |
| nurse.chub@rwhms.gov.rw | NURSE @ CHUB |
| doctor.rrh@rwhms.gov.rw | DOCTOR @ Ruhengeri Referral Hospital |
| doctor.multi@rwhms.gov.rw | DOCTOR @ CHUK and King Faisal Hospital (facility picker) |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run start:dev` | Start in watch mode on port 4000 |
| `npm run build` | Compile to `dist/` |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript checks |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests (Supertest) against the database in `.env.test` |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Reset and seed development data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run openapi:export` | Write the OpenAPI spec to `openapi.json` |

### E2E tests

Create `.env.test` from `.env` with `NODE_ENV=test` and a `DATABASE_URL` pointing at a database
whose name contains `test` (docker compose creates `rw_hms_test`). Migrations are applied
automatically before the suite runs.

## Project layout

```
src/
  main.ts               bootstrap only
  app.setup.ts          helmet, cookies, CORS, validation, versioning, Swagger
  config/               validated environment and typed config namespaces
  database/
    schema/             Drizzle tables, one file per domain
    migrations/         generated by drizzle-kit (committed)
    seed/               development data, split by domain
  common/               guards, decorators, filters, DTOs, utilities
  modules/<feature>/    controller · service · repository · dto/ · types/ · mapper
test/                   Supertest e2e tests
```

Rules every module follows:

- **Controller**: HTTP only; calls one service method.
- **Service**: business rules and policy checks.
- **Repository**: the only place that runs Drizzle queries.
- **Mapper**: turns rows into response DTOs; raw rows are never returned.
- **Errors**: always `{ statusCode, code, message, details? }`, with a stable `code`.
- **Audit log**: append-only, enforced by a database trigger.

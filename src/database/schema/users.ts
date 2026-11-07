import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { id, timestamps, tstz } from './columns';
import { roleEnum } from './enums';
import { facilities } from './facilities';

export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  phone: varchar('phone', { length: 20 }),
  licenseId: varchar('license_id', { length: 50 }).unique(),
  title: varchar('title', { length: 100 }),
  specialty: varchar('specialty', { length: 100 }),
  avatarUrl: text('avatar_url'),
  preferredLocale: varchar('preferred_locale', { length: 5 }).notNull().default('en'),
  active: boolean('active').notNull().default(true),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: tstz('locked_until'),
  lastLoginAt: tstz('last_login_at'),
  passwordChangedAt: tstz('password_changed_at'),
  ...timestamps,
});

export const userFacilityRoles = pgTable(
  'user_facility_roles',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_facility_roles_unique').on(t.userId, t.facilityId, t.role),
    index('user_facility_roles_facility_idx').on(t.facilityId, t.role),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull().unique(),
    userAgent: text('user_agent'),
    ip: varchar('ip', { length: 64 }),
    expiresAt: tstz('expires_at').notNull(),
    revokedAt: tstz('revoked_at'),
    replacedBySessionId: uuid('replaced_by_session_id'),
    ...timestamps,
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
    expiresAt: tstz('expires_at').notNull(),
    usedAt: tstz('used_at'),
    ...timestamps,
  },
  (t) => [index('password_reset_tokens_user_idx').on(t.userId)],
);

export const staffShifts = pgTable(
  'staff_shifts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    startedAt: tstz('started_at').notNull().defaultNow(),
    endedAt: tstz('ended_at'),
    ...timestamps,
  },
  (t) => [index('staff_shifts_facility_open_idx').on(t.facilityId, t.endedAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserFacilityRole = typeof userFacilityRoles.$inferSelect;
export type NewUserFacilityRole = typeof userFacilityRoles.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type StaffShift = typeof staffShifts.$inferSelect;

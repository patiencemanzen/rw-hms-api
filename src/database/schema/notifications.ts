import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, tstz } from './columns';
import { notificationTypeEnum } from './enums';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    readAt: tstz('read_at'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [index('notifications_user_unread_idx').on(t.userId, t.readAt, t.createdAt)],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

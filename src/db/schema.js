import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** One row per match. Feed columns belong to the poller, `mode` and `manual` to the operator. */
export const scoreboards = pgTable('scoreboards', {
  matchDate: text().primaryKey(),
  instance: uuid().notNull().defaultRandom(),
  revision: integer().notNull().default(0),
  polling: boolean().notNull().default(true),
  mode: text().notNull().default('auto'),
  manual: jsonb().notNull().default({ home: 0, away: 0, status: 'Scheduled', minute: null }),
  live: jsonb(),
  fixtureId: text(),
  checkedAt: timestamp({ withTimezone: true }),
  finished: boolean().notNull().default(false),
  nextCheckAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  error: text(),
  remaining: integer(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

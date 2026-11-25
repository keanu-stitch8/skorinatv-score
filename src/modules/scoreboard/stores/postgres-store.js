import { and, eq, lte, sql } from 'drizzle-orm';
import { scoreboards } from '../../../db/schema.js';
import { applyControl, emptyState, pollLeaseMs } from '../services/scoreboard-service.js';

function toState(row) {
  return {
    ...emptyState(),
    instance: row.instance,
    revision: row.revision,
    mode: row.mode === 'manual' ? 'manual' : 'auto',
    manual: row.manual,
    live: row.live,
    fixtureId: row.fixtureId,
    checkedAt: row.checkedAt?.toISOString() ?? null,
    finished: row.finished,
    nextCheckAt: row.nextCheckAt.getTime(),
    error: row.error,
    remaining: row.remaining,
  };
}

/** Postgres store shared by every Vercel instance. `db` is a Drizzle handle (node-postgres or PGlite). */
export function createPostgresStore(db, matchDate) {
  const where = eq(scoreboards.matchDate, matchDate);
  let ready;

  function ensureRow() {
    ready ??= db.insert(scoreboards).values({ matchDate }).onConflictDoNothing().catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  }

  return {
    async load() {
      await ensureRow();
      const [row] = await db.select().from(scoreboards).where(where);
      return toState(row);
    },

    /** Takes the poll lease atomically. Only one instance gets a row back per due check. */
    async claimPoll(now = Date.now()) {
      await ensureRow();
      const [row] = await db.update(scoreboards)
        .set({ nextCheckAt: new Date(now + pollLeaseMs) })
        .where(and(where, eq(scoreboards.finished, false), lte(scoreboards.nextCheckAt, new Date(now))))
        .returning();
      return row ? toState(row) : null;
    },

    async savePoll(poll) {
      await db.update(scoreboards).set({
        live: poll.live,
        fixtureId: poll.fixtureId,
        checkedAt: poll.checkedAt ? new Date(poll.checkedAt) : null,
        finished: poll.finished,
        nextCheckAt: new Date(poll.nextCheckAt),
        error: poll.error,
        remaining: poll.remaining,
        revision: sql`${scoreboards.revision} + 1`,
        updatedAt: new Date(),
      }).where(where);
    },

    /** Row lock keeps concurrent operator clicks from losing an increment. */
    async control(action) {
      await ensureRow();
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(scoreboards).where(where).for('update');
        const state = toState(row);
        const result = applyControl(state, action);
        if (result.error || !result.changed) return result.error ? result : { state };

        const [updated] = await tx.update(scoreboards).set({
          mode: result.mode,
          manual: result.manual,
          revision: sql`${scoreboards.revision} + 1`,
          updatedAt: new Date(),
        }).where(where).returning();
        return { state: toState(updated) };
      });
    },
  };
}

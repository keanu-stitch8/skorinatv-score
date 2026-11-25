import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../src/db/schema.js';
import { pollFixture, toSnapshot } from '../src/modules/scoreboard/services/scoreboard-service.js';
import { createFileStore } from '../src/modules/scoreboard/stores/file-store.js';
import { createPostgresStore } from '../src/modules/scoreboard/stores/postgres-store.js';

const date = '2026-11-25';
const fixture = {
  id: 18612737, home_team: 'Persib Bandung', away_team: 'FC Seoul', date,
  status: 'LIVE', home_score: 1, away_score: 0, minute: '12',
};

process.env.SPORTAPI_KEY = 'test-key';
process.env.SPORTAPI_FIXTURE_ID = String(fixture.id);

let calls = 0;
globalThis.fetch = async () => {
  calls += 1;
  return Response.json({ success: true, fixture }, { headers: { 'x-ratelimit-remaining': '99' } });
};

async function postgresStore() {
  const db = drizzle({ client: new PGlite(), schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: 'src/db/migrations' });
  return createPostgresStore(db, date);
}

const stores = {
  postgres: postgresStore,
  file: async () => createFileStore(date, mkdtempSync(join(tmpdir(), 'skorina-'))),
};

beforeEach(() => {
  calls = 0;
});

for (const [name, create] of Object.entries(stores)) {
  test(`${name}: only one caller gets the poll lease`, async () => {
    const store = await create();
    const now = Date.now();
    const claims = await Promise.all([store.claimPoll(now), store.claimPoll(now), store.claimPoll(now)]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await store.claimPoll(now + 1000), null);
  });

  test(`${name}: poll result is saved and keeps the manual score`, async () => {
    const store = await create();
    const claimed = await store.claimPoll();
    await store.control({ type: 'adjust', side: 'away', delta: 1 });
    await store.savePoll(await pollFixture(claimed));

    const snapshot = toSnapshot(await store.load());
    assert.equal(calls, 1);
    assert.equal(snapshot.mode, 'manual');
    assert.deepEqual(snapshot.score, { home: 0, away: 1, status: 'LIVE', minute: null });
    assert.deepEqual(snapshot.live, { id: fixture.id, home: 1, away: 0, status: 'LIVE', minute: '12' });
    assert.equal(snapshot.remaining, 99);
    assert.equal(snapshot.canAuto, true);
    assert.equal(snapshot.revision, 2);

    const back = await store.control({ type: 'auto' });
    assert.deepEqual(toSnapshot(back.state).score, snapshot.live);
  });

  test(`${name}: concurrent goals are all counted`, async () => {
    const store = await create();
    await Promise.all(Array.from({ length: 5 }, () => store.control({ type: 'adjust', side: 'home', delta: 1 })));
    const snapshot = toSnapshot(await store.load());
    assert.equal(snapshot.score.home, 5);
    assert.equal(snapshot.revision, 5);
  });

  test(`${name}: invalid actions are rejected`, async () => {
    const store = await create();
    assert.ok((await store.control({ type: 'adjust', side: 'home', delta: 2 })).error);
    assert.ok((await store.control({ type: 'period', status: 'PENS' })).error);
    assert.equal(toSnapshot(await store.load()).revision, 0);
  });
}

test('postgres: state survives a new store instance (redeploy)', async () => {
  const db = drizzle({ client: new PGlite(), schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: 'src/db/migrations' });
  await createPostgresStore(db, date).control({ type: 'adjust', side: 'home', delta: 1 });
  const snapshot = toSnapshot(await createPostgresStore(db, date).load());
  assert.equal(snapshot.score.home, 1);
  assert.equal(snapshot.mode, 'manual');
});

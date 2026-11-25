import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mapEspnStats } from '../src/modules/scoreboard/mappers/espn-stats.js';

const leg1 = JSON.parse(readFileSync(new URL('./fixtures/espn-summary-2026-09-16.json', import.meta.url)));

// The first leg was played in Seoul. Swap sides to stand in for tonight's Persib home match.
const swapped = {
  boxscore: {
    teams: leg1.boxscore.teams.map((team) => ({ ...team, homeAway: team.homeAway === 'home' ? 'away' : 'home' })),
  },
};

test('maps ESPN boxscore to graphic rows with Persib at home', () => {
  const stats = mapEspnStats(swapped);
  assert.deepEqual(stats.home, {
    possession: 40, shots: 5, shotsOnTarget: 2, saves: 5, corners: 4, fouls: 8,
    passes: 382, passesAccurate: 310, tackles: 9, yellowCards: 2, redCards: 0,
  });
  assert.equal(stats.away.possession, 60);
  assert.equal(stats.away.corners, 6);
  assert.equal(stats.away.passesAccurate, 474);
});

test('rejects an event that is not Persib at home vs FC Seoul', () => {
  assert.equal(mapEspnStats(leg1), null);
  assert.equal(mapEspnStats({}), null);
});

test('leaves values missing before kickoff as null', () => {
  const sparse = { boxscore: { teams: swapped.boxscore.teams.map((t) => ({ ...t, statistics: [{ name: 'foulsCommitted', displayValue: '0' }] })) } };
  const stats = mapEspnStats(sparse);
  assert.equal(stats.home.fouls, 0);
  assert.equal(stats.home.possession, null);
  assert.equal(stats.away.shots, null);
});

test('dash before kickoff, zero once the match has started', () => {
  const withState = (state) => ({
    header: { competitions: [{ status: { type: { state } } }] },
    boxscore: { teams: swapped.boxscore.teams.map((t) => ({ ...t, statistics: [{ name: 'totalGoals', displayValue: '6' }] })) },
  });

  const before = mapEspnStats(withState('pre'));
  assert.equal(before.home.shots, null);
  assert.equal(before.away.corners, null);

  const live = mapEspnStats(withState('in'));
  assert.equal(live.home.shots, 0);
  assert.equal(live.away.redCards, 0);
  assert.equal(live.home.passesAccurate, 0);
  assert.equal(live.home.possession, null);
});

test('possession 0 vs 0 at kickoff stays neutral', () => {
  const kickoff = {
    header: { competitions: [{ status: { type: { state: 'in' } } }] },
    boxscore: { teams: swapped.boxscore.teams.map((t) => ({ ...t, statistics: [{ name: 'possessionPct', displayValue: '0' }, { name: 'totalShots', displayValue: '0' }] })) },
  };
  const stats = mapEspnStats(kickoff);
  assert.equal(stats.home.possession, null);
  assert.equal(stats.away.possession, null);
  assert.equal(stats.home.shots, 0);
});

test('vMix row uses the PSD layer names and graphic formatting', async () => {
  const { toVmixStatsRow } = await import('../src/modules/scoreboard/mappers/vmix-stats.js');
  const row = toVmixStatsRow({ home: 1, away: 0 }, mapEspnStats(swapped));
  assert.equal(row.Skor_Persib, '1');
  assert.equal(row.Skor_Seoul, '0');
  assert.equal(row.Persib_PenguasaanBola, '40%');
  assert.equal(row.Seoul_Umpan, '552(474)');
  assert.equal(row.Persib_KartuMerah, '0');
  assert.equal(Object.keys(row).length, 22);

  const empty = toVmixStatsRow({ home: null, away: null }, { home: {}, away: {} });
  assert.equal(empty.Skor_Persib, '–');
  assert.equal(empty.Persib_Umpan, '–');
});

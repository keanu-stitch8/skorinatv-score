import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isTarget, mapFixture } from '../src/modules/scoreboard/mappers/fixture.js';

const fixture = {
  id: 12345,
  home_team: 'Persib Bandung',
  away_team: 'FC Seoul',
  date: '2026-11-25',
  status: 'LIVE',
  home_score: 1,
  away_score: 0,
  minute: '45+2',
};

test('matches the teams, sides and match date', () => {
  assert.equal(isTarget(fixture), true);
  assert.equal(isTarget({ ...fixture, date: '2026-09-16' }), false);
  assert.equal(isTarget({ ...fixture, home_team: 'FC Seoul', away_team: 'Persib Bandung' }), false);
  assert.equal(isTarget({ ...fixture, date: null, kickoff_utc: {} }), false);
  assert.equal(isTarget(null), false);
});

test('keeps the last score pair when a response is missing a score', () => {
  const previous = mapFixture(fixture);
  const partial = { ...fixture, home_score: null, away_score: 1 };
  assert.deepEqual(mapFixture(partial, previous), previous);
  assert.equal(mapFixture({ ...partial, id: fixture.id + 1 }, previous).home, null);
});

test('applies VAR corrections and recognizes half time', () => {
  const corrected = mapFixture({ ...fixture, home_score: 0, minute: 'HT' }, mapFixture(fixture));
  assert.deepEqual(corrected, { id: fixture.id, home: 0, away: 0, status: 'HT', minute: 'HT' });
});

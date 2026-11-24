import { match, periods } from '../lib/match.js';

export function isTarget(fixture) {
  return typeof fixture?.home_team === 'string' && /\bpersib\b/i.test(fixture.home_team) &&
    typeof fixture.away_team === 'string' && /\bseoul\b/i.test(fixture.away_team) &&
    (fixture.date === match.date || (typeof fixture.kickoff_utc === 'string' &&
      fixture.kickoff_utc.startsWith(`${match.date}T`)));
}

function validScore(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** @returns {import('../types/scoreboard.js').LiveFixture | null} */
export function mapFixture(fixture, previous) {
  if (!Number.isSafeInteger(fixture.id) || fixture.id < 1) return null;

  const minute = typeof fixture.minute === 'string' || Number.isFinite(fixture.minute)
    ? String(fixture.minute)
    : null;
  const home = validScore(fixture.home_score);
  const away = validScore(fixture.away_score);
  const hasScore = home !== null && away !== null;
  const last = previous?.id === fixture.id ? previous : null;
  const status = typeof fixture.status === 'string' && Object.hasOwn(periods, fixture.status)
    ? fixture.status
    : (last?.status ?? 'Scheduled');

  return {
    id: fixture.id,
    home: hasScore ? home : (last?.home ?? null),
    away: hasScore ? away : (last?.away ?? null),
    status: status === 'LIVE' && minute === 'HT' ? 'HT' : status,
    minute,
  };
}

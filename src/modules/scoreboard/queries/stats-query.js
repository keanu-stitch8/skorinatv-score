import 'server-only';

import { fetchEspnSummary } from '../api/espn';
import { emptyStats } from '../lib/stats';
import { match } from '../lib/match';
import { mapEspnStats } from '../mappers/espn-stats';

const cacheKey = Symbol.for('skorina-tv.stats');
const cacheMs = 20_000;

/**
 * ESPN statistics, cached for 20 seconds per server instance. Concurrent requests share one fetch.
 * @returns {Promise<{stats: {home: object, away: object}, available: boolean, error: string | null}>}
 */
export function getStats() {
  const cached = globalThis[cacheKey];
  if (cached && Date.now() - cached.at < cacheMs) return cached.result;

  const result = loadStats();
  globalThis[cacheKey] = { at: Date.now(), result };
  // A failed load is retried on the next request instead of being kept for 20 seconds.
  result.then((value) => {
    if (value.error && globalThis[cacheKey]?.result === result) delete globalThis[cacheKey];
  });
  return result;
}

async function loadStats() {
  const eventId = process.env.ESPN_EVENT_ID?.trim() || match.espn.eventId;
  try {
    const response = await fetchEspnSummary(match.espn.league, eventId);
    if (!response.ok) return { stats: emptyStats(), available: false, error: `ESPN mengembalikan HTTP ${response.status}.` };

    const stats = mapEspnStats(await response.json());
    if (!stats) return { stats: emptyStats(), available: false, error: 'Data ESPN tidak cocok dengan Persib vs FC Seoul.' };

    const available = Object.values(stats.home).some((value) => value != null);
    return { stats, available, error: null };
  } catch {
    return { stats: emptyStats(), available: false, error: 'ESPN belum bisa dihubungi.' };
  }
}

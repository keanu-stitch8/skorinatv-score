import { emptyStats, espnStatNames } from '../lib/stats.js';

function number(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace('%', ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Maps an ESPN soccer summary to `{home, away}` statistics.
 * Sides follow ESPN's homeAway, and the home team must be Persib so a wrong event ID never shows.
 * Before kickoff every value is null ("–"). After kickoff missing counts are 0; possession stays null until sent.
 * @returns {{home: object, away: object} | null}
 */
export function mapEspnStats(summary) {
  const teams = summary?.boxscore?.teams;
  if (!Array.isArray(teams)) return null;

  const home = teams.find((team) => team?.homeAway === 'home');
  const away = teams.find((team) => team?.homeAway === 'away');
  if (!/\bpersib\b/i.test(home?.team?.displayName ?? '') || !/\bseoul\b/i.test(away?.team?.displayName ?? '')) {
    return null;
  }

  const stats = emptyStats();
  for (const [side, team] of [['home', home], ['away', away]]) {
    const byName = new Map((team.statistics ?? []).map((stat) => [stat?.name, stat?.displayValue]));
    for (const [key, name] of Object.entries(espnStatNames)) {
      const value = number(byName.get(name));
      stats[side][key] = key === 'possession' || value == null ? value : Math.round(value);
    }
  }

  // Once the match has started, a count ESPN has not sent yet is zero ("–" means not started).
  const state = summary?.header?.competitions?.[0]?.status?.type?.state;
  if (state === 'in' || state === 'post') {
    for (const side of [stats.home, stats.away]) {
      for (const key of Object.keys(side)) {
        if (key !== 'possession' && side[key] == null) side[key] = 0;
      }
    }
  }

  // Whole percentages that still add up to 100. At kickoff ESPN sends 0 for both sides: not data yet.
  if (!(stats.home.possession + stats.away.possession > 0)) {
    stats.home.possession = null;
    stats.away.possession = null;
  } else {
    const home = Math.round(stats.home.possession);
    stats.home.possession = home;
    stats.away.possession = 100 - home;
  }

  return stats;
}

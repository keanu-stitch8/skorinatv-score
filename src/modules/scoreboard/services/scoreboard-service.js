import { fetchFixture, fetchFixtures } from '../api/sportapi.js';
import { manualPeriods, match } from '../lib/match.js';
import { isTarget, mapFixture } from '../mappers/fixture.js';

const terminalPeriods = ['FT', 'AET', 'PENS', 'Cancelled'];

/** Lease for one upstream check. Other instances skip SportAPI until it expires. */
export const pollLeaseMs = 30_000;

export function emptyState() {
  return {
    instance: null,
    revision: 0,
    polling: true,
    mode: 'auto',
    manual: { home: 0, away: 0, status: 'Scheduled', minute: null },
    live: null,
    fixtureId: null,
    checkedAt: null,
    finished: false,
    nextCheckAt: 0,
    error: null,
    remaining: null,
  };
}

function configuredFixtureId() {
  return process.env.SPORTAPI_FIXTURE_ID?.trim() || null;
}

export function sportApiKey() {
  return process.env.SPORTAPI_KEY?.trim() || null;
}

/** Ignores a saved fixture that no longer matches SPORTAPI_FIXTURE_ID. */
function currentLive(state) {
  const configuredId = configuredFixtureId();
  return !configuredId || String(state.live?.id) === configuredId ? state.live : null;
}

function liveInterval() {
  const seconds = Number(process.env.SPORTAPI_POLL_SECONDS || 6);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 6;
}

function retryTime(response) {
  const retryAfter = response.headers.get('retry-after');
  const seconds = Number(retryAfter);
  const time = retryAfter && Number.isFinite(seconds)
    ? Date.now() + seconds * 1000
    : Date.parse(retryAfter ?? '');

  return Math.max(Date.now() + 30_000, time || Date.now() + 60_000);
}

/**
 * Checks SportAPI once and returns the new feed fields. Mode and manual score are never touched,
 * so a store can save the result without overwriting an operator change made during the request.
 */
export async function pollFixture(state, key = sportApiKey()) {
  const poll = {
    live: currentLive(state),
    fixtureId: configuredFixtureId() || state.fixtureId || null,
    checkedAt: state.checkedAt,
    finished: state.finished,
    nextCheckAt: Date.now() + pollLeaseMs,
    error: state.error,
    remaining: state.remaining,
  };

  if (poll.fixtureId && !/^\d+$/.test(String(poll.fixtureId))) {
    return { ...poll, error: 'SPORTAPI_FIXTURE_ID harus angka.' };
  }

  try {
    const response = poll.fixtureId
      ? await fetchFixture(poll.fixtureId, key)
      : await fetchFixtures(match.date, key);

    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining !== null && /^\d+$/.test(remaining)) {
      poll.remaining = Number(remaining);
    }

    if (response.status === 429) {
      return { ...poll, nextCheckAt: retryTime(response), error: 'Kuota SportAPI habis. Pakai kontrol manual sementara.' };
    }

    if (response.status === 401 || response.status === 403) {
      return { ...poll, nextCheckAt: Date.now() + 60_000, error: 'SportAPI menolak API key. Cek SPORTAPI_KEY di environment server.' };
    }

    if (response.status === 404 && !configuredFixtureId()) {
      poll.fixtureId = null;
    }

    if (!response.ok) {
      return { ...poll, error: `SportAPI mengembalikan HTTP ${response.status}.` };
    }

    const payload = await response.json();
    if (payload?.success !== true || (!poll.fixtureId && !Array.isArray(payload.data))) {
      return { ...poll, error: 'Format respons SportAPI tidak valid.' };
    }

    const fixture = poll.fixtureId ? payload.fixture : payload.data.find(isTarget);

    if (!isTarget(fixture) || (poll.fixtureId && String(fixture.id) !== String(poll.fixtureId))) {
      return {
        ...poll,
        error: poll.fixtureId
          ? 'Fixture ID ini tidak cocok dengan jadwal Persib vs FC Seoul.'
          : 'Pertandingan belum ditemukan di SportAPI.',
      };
    }

    const live = mapFixture(fixture, poll.live);
    if (!live) return { ...poll, error: 'SportAPI mengirim fixture yang tidak valid.' };

    return {
      ...poll,
      live,
      fixtureId: String(live.id),
      checkedAt: new Date().toISOString(),
      finished: live.status === 'Cancelled' || (terminalPeriods.includes(live.status) &&
        Number.isSafeInteger(fixture.home_score) && fixture.home_score >= 0 &&
        Number.isSafeInteger(fixture.away_score) && fixture.away_score >= 0),
      error: null,
      nextCheckAt: Date.now() + (live.status === 'LIVE' ? liveInterval() : 30) * 1000,
    };
  } catch {
    return { ...poll, error: 'SportAPI belum bisa dihubungi. Skor terakhir tetap tampil.' };
  }
}

function autoAvailable(state) {
  const live = currentLive(state);
  return Boolean(sportApiKey() && state.polling && !state.error && state.checkedAt &&
    live && (live.status === 'Scheduled' || live.status === 'Cancelled' ||
      (live.home !== null && live.away !== null)));
}

/** @returns {import('../types/scoreboard.js').ScoreboardSnapshot} */
export function toSnapshot(state, storageError = null) {
  const live = currentLive(state);
  return {
    instance: state.instance,
    mode: state.mode,
    polling: state.polling,
    canAuto: autoAvailable(state),
    score: (state.mode === 'manual' ? state.manual : live) ?? {
      home: null, away: null, status: 'Scheduled', minute: null,
    },
    live,
    checkedAt: state.checkedAt,
    remaining: state.remaining,
    interval: liveInterval(),
    error: sportApiKey() ? state.error : 'Isi SPORTAPI_KEY di environment server untuk mengaktifkan skor otomatis.',
    storageError,
    revision: state.revision,
  };
}

/**
 * Applies one operator action to the mode, manual score and SportAPI polling switch.
 * @returns {{mode: string, manual: object, polling: boolean, changed: boolean} | {error: string}}
 */
export function applyControl(state, action) {
  const unchanged = { mode: state.mode, manual: state.manual, polling: state.polling, changed: false };

  if (action?.type === 'polling') {
    if (typeof action.enabled !== 'boolean') return { error: 'Status polling tidak valid.' };
    if (action.enabled === state.polling) return unchanged;
    // Kembali ke manual saat polling dihentikan, agar skor di layar tidak membeku di data feed lama.
    if (!action.enabled && state.mode === 'auto') {
      return { ...applyControl(state, { type: 'hold' }), polling: false };
    }
    return { ...unchanged, polling: action.enabled, changed: true };
  }

  if (action?.type === 'auto') {
    if (state.mode === 'auto') return unchanged;
    if (!state.polling) return { error: 'Mulai polling SportAPI dulu sebelum kembali ke otomatis.' };
    if (!autoAvailable(state)) return { error: 'Tunggu sampai SportAPI mengirim data laga yang valid.' };
    return { ...unchanged, mode: 'auto', changed: true };
  }

  if (action?.type !== 'hold' && action?.type !== 'adjust' && action?.type !== 'period') {
    return { error: 'Aksi tidak dikenal.' };
  }

  if (action.type === 'adjust' &&
    (!['home', 'away'].includes(action.side) || ![-1, 1].includes(action.delta))) {
    return { error: 'Perubahan skor tidak valid.' };
  }

  if (action.type === 'period' && !manualPeriods.includes(action.status)) {
    return { error: 'Status pertandingan tidak valid.' };
  }

  let manual = { ...state.manual };
  if (state.mode === 'auto') {
    const live = currentLive(state);
    manual = {
      home: live?.home ?? 0,
      away: live?.away ?? 0,
      status: manualPeriods.includes(live?.status) ? live.status : 'Scheduled',
      minute: null,
    };
  }

  if (action.type === 'adjust') {
    manual[action.side] = Math.max(0, manual[action.side] + action.delta);
    if (action.delta > 0 && manual.status === 'Scheduled') manual.status = 'LIVE';
  } else if (action.type === 'period') {
    manual.status = action.status;
  }

  return { mode: 'manual', manual, polling: state.polling, changed: true };
}

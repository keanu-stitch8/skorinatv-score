import 'server-only';

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fetchFixture, fetchFixtures } from '../api/sportapi';
import { manualPeriods, match } from '../lib/match';
import { isTarget, mapFixture } from '../mappers/fixture';

const stateDirectory = join(process.cwd(), '.scoreboard');
const statePath = join(stateDirectory, `${match.date}.json`);
const terminalPeriods = ['FT', 'AET', 'PENS', 'Cancelled'];

function restore() {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8')) ?? {};
  } catch {
    return {};
  }
}

function createState() {
  const saved = restore();
  const configuredId = process.env.SPORTAPI_FIXTURE_ID?.trim();
  const live = !configuredId || String(saved.live?.id) === configuredId ? saved.live : null;

  return {
    instance: randomUUID(),
    mode: saved.mode === 'manual' ? 'manual' : 'auto',
    manual: saved.manual ?? { home: 0, away: 0, status: 'Scheduled', minute: null },
    live: live ?? null,
    fixtureId: configuredId || live?.id || null,
    checkedAt: null,
    finished: false,
    nextCheckAt: 0,
    error: null,
    storageError: null,
    remaining: null,
    revision: 0,
  };
}

// One upstream poll and one score for every local browser in this process.
const state = globalThis[Symbol.for('skorina-tv.match')] ??= createState();

function save() {
  try {
    mkdirSync(stateDirectory, { recursive: true });
    writeFileSync(`${statePath}.tmp`, JSON.stringify({
      mode: state.mode,
      manual: state.manual,
      live: state.live,
    }));
    renameSync(`${statePath}.tmp`, statePath);
    state.storageError = null;
  } catch {
    state.storageError = 'Skor aktif, tetapi penyimpanan lokal gagal.';
  }
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

function keyForNextCheck() {
  const key = process.env.SPORTAPI_KEY?.trim();
  return key && !state.finished && Date.now() >= state.nextCheckAt ? key : null;
}

export async function refreshScore() {
  const key = keyForNextCheck();
  if (!key) return;

  state.nextCheckAt = Date.now() + 30_000;
  if (state.fixtureId && !/^\d+$/.test(String(state.fixtureId))) {
    state.error = 'SPORTAPI_FIXTURE_ID harus angka.';
    state.revision += 1;
    return;
  }

  try {
    const response = state.fixtureId
      ? await fetchFixture(state.fixtureId, key)
      : await fetchFixtures(match.date, key);

    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining !== null && /^\d+$/.test(remaining)) {
      state.remaining = Number(remaining);
    }

    if (response.status === 429) {
      state.nextCheckAt = retryTime(response);
      state.error = 'Kuota SportAPI habis. Pakai kontrol manual sementara.';
      return;
    }

    if (response.status === 401 || response.status === 403) {
      state.nextCheckAt = Date.now() + 60_000;
      state.error = 'SportAPI menolak API key. Cek SPORTAPI_KEY di .env.local.';
      return;
    }

    if (response.status === 404 && !process.env.SPORTAPI_FIXTURE_ID?.trim()) {
      state.fixtureId = null;
    }

    if (!response.ok) {
      state.error = `SportAPI mengembalikan HTTP ${response.status}.`;
      return;
    }

    const payload = await response.json();
    if (payload?.success !== true || (!state.fixtureId && !Array.isArray(payload.data))) {
      state.error = 'Format respons SportAPI tidak valid.';
      return;
    }

    const fixture = state.fixtureId ? payload.fixture : payload.data.find(isTarget);

    if (!isTarget(fixture) || (state.fixtureId && String(fixture.id) !== String(state.fixtureId))) {
      state.error = state.fixtureId
        ? 'Fixture ID ini tidak cocok dengan jadwal Persib vs FC Seoul.'
        : 'Pertandingan belum ditemukan di SportAPI.';
      return;
    }

    const live = mapFixture(fixture, state.live);
    if (!live) {
      state.error = 'SportAPI mengirim fixture yang tidak valid.';
      return;
    }

    state.checkedAt = new Date().toISOString();
    state.fixtureId = live.id;
    state.finished = live.status === 'Cancelled' || (terminalPeriods.includes(live.status) &&
      Number.isSafeInteger(fixture.home_score) && fixture.home_score >= 0 &&
      Number.isSafeInteger(fixture.away_score) && fixture.away_score >= 0);
    state.error = null;
    state.nextCheckAt = Date.now() + (live.status === 'LIVE' ? liveInterval() : 30) * 1000;

    if (JSON.stringify(live) !== JSON.stringify(state.live)) {
      state.live = live;
      save();
    }
  } catch {
    state.error = 'SportAPI belum bisa dihubungi. Skor terakhir tetap tampil.';
  } finally {
    state.revision += 1;
  }
}

function autoAvailable() {
  return Boolean(process.env.SPORTAPI_KEY?.trim() && !state.error && state.checkedAt &&
    state.live && (state.live.status === 'Scheduled' || state.live.status === 'Cancelled' ||
      (state.live.home !== null && state.live.away !== null)));
}

/** @returns {import('../types/scoreboard.js').ScoreboardSnapshot} */
export function snapshot() {
  const configured = Boolean(process.env.SPORTAPI_KEY?.trim());
  return {
    instance: state.instance,
    mode: state.mode,
    canAuto: autoAvailable(),
    score: (state.mode === 'manual' ? state.manual : state.live) ?? {
      home: null, away: null, status: 'Scheduled', minute: null,
    },
    live: state.live,
    checkedAt: state.checkedAt,
    remaining: state.remaining,
    interval: liveInterval(),
    error: configured ? state.error : 'Isi SPORTAPI_KEY di .env.local untuk mengaktifkan skor otomatis.',
    storageError: state.storageError,
    revision: state.revision,
  };
}

export function control(action) {
  if (action?.type === 'auto') {
    if (state.mode === 'auto') return snapshot();
    if (!autoAvailable()) return { error: 'Tunggu sampai SportAPI mengirim data laga yang valid.' };

    state.mode = 'auto';
  } else if (action?.type === 'hold' || action?.type === 'adjust' || action?.type === 'period') {
    if (action.type === 'adjust' &&
      (!['home', 'away'].includes(action.side) || ![-1, 1].includes(action.delta))) {
      return { error: 'Perubahan skor tidak valid.' };
    }

    if (action.type === 'period' && !manualPeriods.includes(action.status)) {
      return { error: 'Status pertandingan tidak valid.' };
    }

    if (state.mode === 'auto') {
      const live = state.live;
      state.manual = {
        home: live?.home ?? 0,
        away: live?.away ?? 0,
        status: manualPeriods.includes(live?.status) ? live.status : 'Scheduled',
        minute: null,
      };
      state.mode = 'manual';
    }

    if (action.type === 'adjust') {
      state.manual[action.side] = Math.max(0, state.manual[action.side] + action.delta);
      if (action.delta > 0 && state.manual.status === 'Scheduled') state.manual.status = 'LIVE';
    } else if (action.type === 'period') {
      state.manual.status = action.status;
    }
  } else {
    return { error: 'Aksi tidak dikenal.' };
  }

  state.revision += 1;
  save();
  return snapshot();
}

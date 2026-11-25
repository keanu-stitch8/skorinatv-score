import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { applyControl, emptyState, pollLeaseMs } from '../services/scoreboard-service.js';

/**
 * Single-process store for the portable app on the vMix PC. State lives in memory,
 * and mode, manual score and the last feed are written to `.scoreboard/` for restarts.
 */
export function createFileStore(matchDate, directory = join(process.cwd(), '.scoreboard')) {
  const path = join(directory, `${matchDate}.json`);
  let saved = {};
  try {
    saved = JSON.parse(readFileSync(path, 'utf8')) ?? {};
  } catch {
    // Belum ada state tersimpan.
  }

  const state = {
    ...emptyState(),
    instance: randomUUID(),
    mode: saved.mode === 'manual' ? 'manual' : 'auto',
    manual: saved.manual ?? emptyState().manual,
    live: saved.live ?? null,
    fixtureId: saved.live?.id ? String(saved.live.id) : null,
  };
  let storageError = null;

  function persist() {
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(`${path}.tmp`, JSON.stringify({ mode: state.mode, manual: state.manual, live: state.live }));
      renameSync(`${path}.tmp`, path);
      storageError = null;
    } catch {
      storageError = 'Skor aktif, tetapi penyimpanan lokal gagal.';
    }
  }

  return {
    storageError: () => storageError,

    async load() {
      return { ...state };
    },

    async claimPoll(now = Date.now()) {
      if (state.finished || now < state.nextCheckAt) return null;
      state.nextCheckAt = now + pollLeaseMs;
      return { ...state };
    },

    async savePoll(poll) {
      const liveChanged = JSON.stringify(poll.live) !== JSON.stringify(state.live);
      Object.assign(state, poll);
      state.revision += 1;
      if (liveChanged) persist();
    },

    async control(action) {
      const result = applyControl(state, action);
      if (result.error) return result;
      if (result.changed) {
        state.mode = result.mode;
        state.manual = result.manual;
        state.revision += 1;
        persist();
      }
      return { state: { ...state } };
    },
  };
}

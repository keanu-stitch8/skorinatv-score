import 'server-only';

import { after } from 'next/server';
import { getDb } from '../../../db/client';
import { match } from '../lib/match';
import { pollFixture, sportApiKey, toSnapshot } from '../services/scoreboard-service';
import { createFileStore } from '../stores/file-store';
import { createPostgresStore } from '../stores/postgres-store';

const storeKey = Symbol.for('skorina-tv.store');

function getStore() {
  if (!globalThis[storeKey]) {
    if (process.env.DATABASE_URL) {
      globalThis[storeKey] = createPostgresStore(getDb(), match.date);
    } else if (process.env.VERCEL) {
      throw new Error('DATABASE_URL wajib di Vercel. Filesystem Vercel tidak menyimpan skor.');
    } else {
      globalThis[storeKey] = createFileStore(match.date);
    }
  }
  return globalThis[storeKey];
}

function snapshotOf(store, state) {
  return toSnapshot(state, store.storageError?.() ?? null);
}

/**
 * Returns the current score. When a SportAPI check is due, this request takes the poll lease
 * and runs the check after the response, so vMix and browsers never wait on SportAPI.
 */
export async function getScoreboard() {
  const store = getStore();
  const claimed = sportApiKey() ? await store.claimPoll() : null;

  if (claimed) {
    after(async () => {
      try {
        await store.savePoll(await pollFixture(claimed));
      } catch (error) {
        console.error('Gagal menyimpan hasil SportAPI.', error);
      }
    });
  }

  return snapshotOf(store, claimed ?? await store.load());
}

export async function updateScoreboard(action) {
  const store = getStore();
  const result = await store.control(action);
  return result.error ? result : snapshotOf(store, result.state);
}

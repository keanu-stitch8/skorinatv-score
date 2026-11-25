'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useSyncExternalStore } from 'react';

const endpoint = '/api/sportapi';
const scoreboardKey = ['scoreboard'];
const refreshInterval = 2000;

function subscribeToVisibility(callback) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}

function isTabVisible() {
  return !document.hidden;
}

function isTabVisibleOnServer() {
  return true;
}

async function fetchScoreboard({ signal }) {
  const response = await fetch(endpoint, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Snapshot scoreboard tidak tersedia.');
  return response.json();
}

async function updateScoreboard(action) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  const snapshot = await response.json();
  if (!response.ok) throw new Error(snapshot.error || 'Perubahan skor gagal.');
  return snapshot;
}

function keepLatestSnapshot(current, incoming) {
  // A GET that started before a control action can arrive after the POST.
  if (current?.instance === incoming.instance && current.revision >= incoming.revision) {
    return current;
  }
  return incoming;
}

export function useScoreboard(initial, { pauseWhenHidden = false } = {}) {
  const isVisible = useSyncExternalStore(subscribeToVisibility, isTabVisible, isTabVisibleOnServer);
  const { data: snapshot, isError } = useQuery({
    queryKey: scoreboardKey,
    queryFn: fetchScoreboard,
    initialData: initial,
    structuralSharing: keepLatestSnapshot,
    enabled: !pauseWhenHidden || isVisible,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: !pauseWhenHidden,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    retry: false,
  });

  const connectionError = isError ? 'Koneksi ke server scoreboard terputus. Skor terakhir tetap tampil.' : null;
  return { snapshot, connectionError };
}

export function useScoreboardControl() {
  const queryClient = useQueryClient();
  const running = useRef(false);
  const { mutate, error, isPending } = useMutation({
    mutationFn: updateScoreboard,
    networkMode: 'always',
    retry: false,
    onSuccess(snapshot) {
      queryClient.setQueryData(scoreboardKey, snapshot);
    },
    onSettled() {
      running.current = false;
    },
  });

  const send = useCallback((action) => {
    if (running.current) return;
    running.current = true;
    mutate(action);
  }, [mutate]);

  return { send, busy: isPending, actionError: error?.message };
}

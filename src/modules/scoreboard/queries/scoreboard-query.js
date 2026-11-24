import 'server-only';

import { control, refreshScore, snapshot } from '../services/scoreboard-service';

const activePoll = Symbol.for('skorina-tv.activePoll');

export function getScoreboard() {
  if (!globalThis[activePoll]) {
    globalThis[activePoll] = refreshScore().finally(() => {
      delete globalThis[activePoll];
    });
  }

  return snapshot();
}

export function updateScoreboard(action) {
  return control(action);
}

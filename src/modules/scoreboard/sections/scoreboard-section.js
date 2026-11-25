import { connection } from 'next/server';
import ScoreboardOutput from '../components/scoreboard-output';
import ScoreboardOperator from '../components/scoreboard-operator';
import { getScoreboard } from '../queries/scoreboard-query';

export default async function ScoreboardSection({ output, logout }) {
  await connection();
  const initial = await getScoreboard();

  return output ? <ScoreboardOutput initial={initial} /> : <ScoreboardOperator initial={initial} logout={logout} />;
}

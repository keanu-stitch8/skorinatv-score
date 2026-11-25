import ScoreboardView from './views/scoreboard-view';

export default function Scoreboard({ output = false, logout = false }) {
  return <ScoreboardView output={output} logout={logout} />;
}

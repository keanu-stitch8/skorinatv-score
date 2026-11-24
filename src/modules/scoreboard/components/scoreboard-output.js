'use client';

import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import { match, periods } from '../lib/match';
import { useScoreboard } from './use-scoreboard';

function screenPeriod(score) {
  if (score.status === 'LIVE') return score.minute ? `LIVE · ${score.minute}` : 'LIVE';
  if (score.status === 'HT' || score.status === 'FT') return score.status;
  if (score.status === 'Scheduled') return match.kickoff;
  return periods[score.status] ?? score.status;
}

/** @param {{initial: import('../types/scoreboard.js').ScoreboardSnapshot}} props */
export default function ScoreboardOutput({ initial }) {
  const { snapshot } = useScoreboard(initial);
  const { score } = snapshot;
  const [goal, setGoal] = useState(null);
  const previous = useRef(null);
  const { home, away } = score;
  const { mode } = snapshot;

  useEffect(() => {
    const last = previous.current;
    previous.current = { home, away };
    const existingScore = last && last.home !== null && last.away !== null;
    const manualFirstGoal = mode === 'manual' && last?.home === null && last?.away === null;
    const homeGoal = home > (last?.home ?? 0) && away === (last?.away ?? 0);
    const awayGoal = away > (last?.away ?? 0) && home === (last?.home ?? 0);

    if ((existingScore || manualFirstGoal) && (homeGoal || awayGoal)) {
      setGoal(homeGoal ? match.home : match.away);
      const timer = setTimeout(() => setGoal(null), 4000);
      return () => clearTimeout(timer);
    }

    if (last) setGoal(null);
  }, [home, away, mode]);

  const teamName = 'm-0 px-[.5vw] py-[3vh] text-[clamp(.9rem,min(5.2vw,12vh),9rem)] leading-[.95] font-[850] tracking-[-.035em] uppercase';

  return (
    <main className="box-border min-h-screen px-[5vw] pt-[9vh] pb-[15vh] text-center" aria-label="Scoreboard Persib Bandung vs FC Seoul">
      <p className="m-0 text-[clamp(.85rem,1.65vw,4rem)] font-[750] tracking-[.18em] text-[#b5c9ef] uppercase">
        {match.competition}
      </p>
      <p className="m-0 mt-[3vh] mb-[5vh] inline-block min-w-[10ch] rounded-[.25em] border border-[#b5c9ef65] px-[.85em] py-[.4em] text-[clamp(.9rem,1.9vw,4.5rem)] font-[720] tracking-[.04em] text-[#e5eeff] data-[live=true]:border-[#f3e27984] data-[live=true]:text-[#f3e279]" data-live={score.status === 'LIVE'}>
        {screenPeriod(score)}
      </p>
      <div className="grid min-h-[30vh] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border-y-2 border-[#c6daff42] bg-[#050d20b3]" aria-live="polite">
        <h1 className={cn(teamName, 'border-l-[.8vw] border-[#5089ff]')}>
          <span className="block">Persib</span><span className="block">Bandung</span>
        </h1>
        <div className="flex items-center justify-center gap-[.15em] px-[.15em] text-[clamp(2.6rem,min(14vw,30vh),21rem)] leading-[.87] font-[850] text-[#fff4b9] tabular-nums" aria-label={`${home ?? 'Belum mulai'} – ${away ?? 'Belum mulai'}`}>
          <span>{home ?? '–'}</span>
          <b className="-translate-y-[.07em] text-[.48em] text-[#b6c7e8]" aria-hidden="true">:</b>
          <span>{away ?? '–'}</span>
        </div>
        <h2 className={cn(teamName, 'border-r-[.8vw] border-[#ec5670]')}>
          <span className="block">FC</span><span className="block">Seoul</span>
        </h2>
      </div>
      {goal && (
        <p className="m-0 mt-[4vh] text-[clamp(1.15rem,4vw,7rem)] font-[850] tracking-[.07em] text-[#fff4b9] uppercase motion-safe:transition-[opacity,translate] motion-safe:duration-[280ms] motion-safe:ease-out motion-safe:starting:translate-y-[.2em] motion-safe:starting:opacity-0" role="status">
          Gol {goal}
        </p>
      )}
    </main>
  );
}

'use client';

import { cn } from 'cn';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { statRows } from '../lib/stats';
import { artwork as canvas, group, inset, panel, panelPaddingY, scoreBoxes } from '../lib/stats-layout';
import { useScoreboard } from './use-scoreboard';

/**
 * Overlay on the artwork (public/stats/background.png, 1670×941). The artwork has empty score boxes
 * and an empty statistics panel; only those are drawn here. Persib (home, blue) is on the left.
 */
const sides = {
  left: { key: 'home', color: '#1a5ff0', bar: 'linear-gradient(90deg,#1a5ff0,#3a86ff)', glow: '#2a7bff' },
  right: { key: 'away', color: '#d8182c', bar: 'linear-gradient(90deg,#ff3a4b,#d0142a)', glow: '#ff2b3d' },
};

/** Longest bar from the centre line, half of the track minus the centre gap. */
const barSpan = (panel.width - inset * 2) / 2 - 3;

function useCanvasScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

function share(a, b) {
  const total = (a ?? 0) + (b ?? 0);
  return total > 0 ? [(a ?? 0) / total, (b ?? 0) / total] : [0, 0];
}

async function fetchStats({ signal }) {
  const response = await fetch('/api/stats', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Statistik tidak tersedia.');
  return response.json();
}

/** ESPN statistics, refreshed every 15 seconds. The server caches ESPN for 30 seconds. */
function useStats(initial) {
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    initialData: initial,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    networkMode: 'always',
    retry: false,
  });
  return data.stats;
}

function display(row, stats) {
  const value = stats[row.key];
  if (value == null) return '–';
  return row.detail ? `${value}(${stats[row.detail] ?? '–'})` : String(value);
}

function Value({ text, lead, side }) {
  return (
    <span
      className={cn('inline-flex h-[24px] items-center rounded-[5px] px-[7px] tabular-nums', side === sides.right && 'ml-auto')}
      style={lead ? { background: side.color, boxShadow: `0 0 10px ${side.glow}88` } : undefined}
    >
      {text}
    </span>
  );
}

function CardIcon({ color }) {
  return <span className="inline-block rounded-[3px] shadow-[0_0_8px_rgba(0,0,0,.6)]" style={{ width: group.cardIcon.width, height: group.cardIcon.height, background: color }} aria-hidden="true" />;
}

function Possession({ row, left, right }) {
  const [l] = share(left, right);
  return (
    <div style={{ paddingInline: inset }}>
      <p className="m-0 text-center" style={{ fontSize: group.possessionLabelSize, lineHeight: `${group.textHeight}px` }}>{row.label}</p>
      <div className="flex overflow-hidden rounded-[6px] bg-white/10 font-semibold" style={{ marginTop: group.barGap, height: group.possessionBarHeight, fontSize: group.textSize }}>
        {left != null && right != null ? (
          <>
            <div className="flex items-center pl-[8px]" style={{ width: `${l * 100}%`, background: sides.left.bar }}>{left}%</div>
            <div className="flex flex-1 items-center justify-end pr-[8px]" style={{ background: sides.right.bar }}>{right}%</div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-between px-[8px]"><span>–</span><span>–</span></div>
        )}
      </div>
    </div>
  );
}

function StatRow({ row, left, right }) {
  const l = left[row.key];
  const r = right[row.key];
  const [ls, rs] = share(l, r);
  const bar = 'absolute top-0 h-full rounded-full';

  return (
    <div style={{ paddingInline: inset }} aria-label={`${row.label}: ${display(row, left)} lawan ${display(row, right)}`}>
      <div className="flex items-center" style={{ height: group.textHeight, fontSize: group.textSize, lineHeight: `${group.textHeight}px` }}>
        <span className="flex" style={{ width: group.valueColumn }}><Value text={display(row, left)} lead={l > r} side={sides.left} /></span>
        <span className="flex flex-1 justify-center" aria-hidden="true">
          {row.icon ? <CardIcon color={row.icon === 'yellow' ? '#ffd21f' : '#ff1f2d'} /> : row.label}
        </span>
        <span className="flex" style={{ width: group.valueColumn }}><Value text={display(row, right)} lead={r > l} side={sides.right} /></span>
      </div>
      {!row.icon && (
        <div className="relative rounded-full bg-white/10" style={{ marginTop: group.barGap, height: group.barHeight }}>
          {ls > 0 && <span className={bar} style={{ right: 'calc(50% + 3px)', width: ls * barSpan, background: sides.left.bar, boxShadow: `0 0 6px ${sides.left.glow}99` }} />}
          {rs > 0 && <span className={bar} style={{ left: 'calc(50% + 3px)', width: rs * barSpan, background: sides.right.bar, boxShadow: `0 0 6px ${sides.right.glow}99` }} />}
        </div>
      )}
    </div>
  );
}

function ScoreDigit({ value, centre }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 font-display leading-none font-black tabular-nums"
      style={{
        left: centre,
        top: scoreBoxes.y,
        fontSize: scoreBoxes.fontSize,
        backgroundImage: 'linear-gradient(180deg,#ffffff 0%,#f1f1f1 48%,#9c9c9c 52%,#e6e6e6 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.7))',
      }}
    >
      {value ?? '–'}
    </span>
  );
}

/** @param {{initial: import('../types/scoreboard.js').ScoreboardSnapshot, initialStats: {stats: {home: object, away: object}}}} props */
export default function StatsGraphic({ initial, initialStats }) {
  const { snapshot } = useScoreboard(initial);
  const stats = useStats(initialStats);
  const scale = useCanvasScale();
  const left = stats[sides.left.key];
  const right = stats[sides.right.key];

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <main
        className="relative shrink-0 overflow-hidden text-white"
        style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})` }}
        aria-label="Statistik Persib vs FC Seoul"
      >
        <img src="/stats/background.png" alt="" className="absolute inset-0 h-full w-full" />

        <ScoreDigit value={snapshot.score[sides.left.key]} centre={scoreBoxes.left} />
        <ScoreDigit value={snapshot.score[sides.right.key]} centre={scoreBoxes.right} />

        <section className="absolute flex flex-col justify-evenly font-medium" style={{ ...panel, paddingBlock: panelPaddingY }}>
          {statRows.map((row) => (row.kind === 'split'
            ? <Possession key={row.key} row={row} left={left[row.key]} right={right[row.key]} />
            : <StatRow key={row.key} row={row} left={left} right={right} />))}
        </section>

      </main>
    </div>
  );
}

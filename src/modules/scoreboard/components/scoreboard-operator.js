'use client';

import { useEffect } from 'react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { SelectItem } from '@/components/shadcn/select';
import { OperatorSelect, ScoreButton } from '@/components/shadcn-extend/operator-controls';
import { SportApiPanel } from '@/components/shadcn-extend/sport-api-panel';
import { manualPeriods, match, periods } from '../lib/match';
import { useScoreboard, useScoreboardControl } from './use-scoreboard';

const controls = [
  { side: 'home', team: match.home, plus: '1', minus: '3' },
  { side: 'away', team: match.away, plus: '2', minus: '4' },
];

/** @param {{initial: import('../types/scoreboard.js').ScoreboardSnapshot}} props */
export default function ScoreboardOperator({ initial }) {
  const { snapshot, connectionError } = useScoreboard(initial, { pauseWhenHidden: true });
  const { send, busy, actionError } = useScoreboardControl();
  const { score, live, mode, canAuto, storageError } = snapshot;
  const canSelectPeriod = manualPeriods.includes(score.status);
  const controlError = actionError || storageError;

  useEffect(() => {
    function handleKey(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        event.target.closest?.('input, textarea, select, [contenteditable], [role="combobox"], [role="listbox"]')) return;

      const control = controls.find(({ plus, minus }) => event.key === plus || event.key === minus);
      if (!control) return;
      event.preventDefault();
      send({ type: 'adjust', side: control.side, delta: event.key === control.plus ? 1 : -1 });
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [send]);

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[58rem] py-12 max-[38rem]:py-6">
      <header className="mb-7 flex items-center justify-between gap-4 max-[26rem]:flex-wrap">
        <div>
          <h1 className="m-0 text-[clamp(1.65rem,4vw,2.7rem)] font-bold tracking-[-.04em]">Kontrol scoreboard</h1>
          <p className="m-0 mt-1.5 text-muted-foreground">{match.kickoff}</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/scoreboard" target="_blank" rel="noreferrer">Buka videotron</a>
        </Button>
      </header>

      <Card className="border-border" role="region" aria-label="Skor yang tampil">
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>Skor di videotron</CardTitle>
          <CardAction>
            <Badge variant={mode === 'manual' ? 'default' : 'secondary'}>
              {mode === 'manual' ? 'Manual' : 'Otomatis'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 max-[38rem]:gap-2.5">
          {controls.map(({ side, team, plus, minus }) => (
            <Card className="min-w-0 gap-3 border-border py-4 text-center" key={side}>
              <CardHeader className="px-3">
                <CardTitle role="heading" aria-level={3}>{team}</CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                <strong className="block pb-2.5 text-[clamp(3rem,9vw,5.5rem)] leading-none tabular-nums" aria-live="polite">
                  {score[side] ?? '–'}
                </strong>
                <div className="grid grid-cols-2 gap-2 max-[38rem]:grid-cols-1">
                  <ScoreButton
                    label={`Kurangi skor ${team}`}
                    shortcut={minus}
                    disabled={busy}
                    onClick={() => send({ type: 'adjust', side, delta: -1 })}
                  />
                  <ScoreButton
                    increment
                    label={`Tambah gol ${team}`}
                    shortcut={plus}
                    disabled={busy}
                    onClick={() => send({ type: 'adjust', side, delta: 1 })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <CardContent>
          <div className="flex items-center justify-between gap-4 max-[38rem]:flex-col max-[38rem]:items-start">
            {mode === 'auto' ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => send({ type: 'hold' })}>Tahan skor</Button>
            ) : (
              <Button type="button" variant="outline" disabled={busy || !canAuto} onClick={() => send({ type: 'auto' })}>Kembali ke otomatis</Button>
            )}
            <OperatorSelect
              label="Status pertandingan"
              placeholder={periods[score.status] ?? score.status}
              value={canSelectPeriod ? score.status : ''}
              disabled={busy}
              onValueChange={(status) => send({ type: 'period', status })}
            >
              {manualPeriods.map((period) => <SelectItem key={period} value={period}>{periods[period]}</SelectItem>)}
            </OperatorSelect>
          </div>
          <CardDescription className="mt-4">
            Tombol skor langsung mengaktifkan mode manual. Cocokkan dengan skor SportAPI sebelum kembali ke otomatis.
          </CardDescription>
          {controlError && <p className="mt-3 text-sm text-destructive" role="status">{controlError}</p>}
        </CardContent>
      </Card>

      <SportApiPanel
        snapshot={snapshot}
        connectionError={connectionError}
        kickoff={match.kickoff}
        period={live ? periods[live.status] ?? live.status : null}
      />
    </main>
  );
}

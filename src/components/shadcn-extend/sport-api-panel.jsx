import { CircleAlertIcon, RadioIcon } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/components/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

const quotaFormat = new Intl.NumberFormat('id-ID');
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function FeedDetail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-snug text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}

export function SportApiPanel({ snapshot, connectionError, kickoff, period }) {
  const { live, checkedAt, remaining, interval, error } = snapshot;
  const feedError = connectionError || error;
  const connected = checkedAt && !feedError;
  const hasScore = live?.home != null && live?.away != null;
  const beforeKickoff = !live || live.status === 'Scheduled';
  const liveMinute = live?.status === 'LIVE' && live.minute;
  const matchHeading = hasScore ? `${live.home} – ${live.away}` : period ?? 'Menunggu data laga';
  const scoreDetail = liveMinute ? `${period} · ${liveMinute}` : period;
  const phaseDetail = beforeKickoff ? kickoff : 'Skor belum tersedia';

  return (
    <Card className="mt-4 gap-0 border-border py-0 shadow-none" role="region" aria-label="Status SportAPI">
      <CardHeader className="grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto] items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <RadioIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-sm whitespace-nowrap sm:text-base" role="heading" aria-level={2}>Feed SportAPI</CardTitle>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'gap-1.5',
            feedError && 'border-destructive/30 bg-destructive/10 text-destructive',
            connected && 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {connectionError ? 'Offline' : error ? 'Perlu dicek' : connected ? 'Tersambung' : 'Menunggu'}
        </Badge>
      </CardHeader>

      <CardContent className="grid p-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 px-5 py-5 sm:px-6">
          <p className="text-xs font-medium text-muted-foreground">
            {hasScore ? 'Skor SportAPI' : 'Status pertandingan'}
          </p>
          <p className="mt-1 text-2xl leading-tight font-semibold tracking-tight tabular-nums">{matchHeading}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{hasScore ? scoreDetail : phaseDetail}</p>
        </div>

        <dl className="grid grid-cols-2 content-center gap-x-4 gap-y-3 border-t border-border px-5 py-4 sm:border-t-0 sm:border-l sm:px-6">
          <FeedDetail label="Cek sukses terakhir">
            {checkedAt ? <time dateTime={checkedAt}>{timeFormat.format(new Date(checkedAt))} WIB</time> : '—'}
          </FeedDetail>
          <FeedDetail label="Sisa kuota hari ini">{remaining != null ? `${quotaFormat.format(remaining)} request` : '—'}</FeedDetail>
          <FeedDetail label="ID fixture">{live?.id ?? '—'}</FeedDetail>
          <FeedDetail label="Interval saat live">{interval} detik</FeedDetail>
        </dl>
      </CardContent>

      {feedError && (
        <div className="flex items-start gap-2 border-t border-border px-5 py-3 text-sm text-destructive sm:px-6" role="status">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 wrap-anywhere">{feedError}</p>
        </div>
      )}
    </Card>
  );
}

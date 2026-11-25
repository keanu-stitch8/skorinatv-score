import { toVmixStatsRow } from '../../../modules/scoreboard/mappers/vmix-stats';
import { getScoreboard } from '../../../modules/scoreboard/queries/scoreboard-query';
import { getStats } from '../../../modules/scoreboard/queries/stats-query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respond(data) {
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

/** `?format=vmix` returns one row whose columns match the GT title's PSD layer names. */
export async function GET(request) {
  if (new URL(request.url).searchParams.get('format') === 'vmix') {
    const [scoreboard, { stats }] = await Promise.all([getScoreboard(), getStats()]);
    return respond([toVmixStatsRow(scoreboard.score, stats)]);
  }
  return respond(await getStats());
}

import { getScoreboard, updateScoreboard } from '../../../modules/scoreboard/queries/scoreboard-query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function respond(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function localHost(request) {
  const host = request.headers.get('host') ?? '';
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host) ? host : null;
}

export async function GET(request) {
  if (!localHost(request)) return respond({ error: 'Endpoint ini hanya tersedia di localhost.' }, 403);
  return respond(getScoreboard());
}

export async function POST(request) {
  const host = localHost(request);
  const origin = request.headers.get('origin');
  if (!host || (origin && origin !== `http://${host}`)) {
    return respond({ error: 'Kontrol scoreboard hanya tersedia di localhost.' }, 403);
  }

  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return respond({ error: 'Gunakan application/json.' }, 415);
  }

  let action;
  try {
    action = await request.json();
  } catch {
    return respond({ error: 'JSON tidak valid.' }, 400);
  }

  const result = updateScoreboard(action);
  return respond(result, result.score ? 200 : 400);
}

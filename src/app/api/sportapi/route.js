import { cookies } from 'next/headers';
import { canRead, isOperator, sameOrigin, sessionCookie } from '../../../modules/auth/operator-auth';
import { getScoreboard, updateScoreboard } from '../../../modules/scoreboard/queries/scoreboard-query';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function respond(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request) {
  if (!canRead(request.headers.get('host'))) {
    return respond({ error: 'Endpoint ini hanya tersedia di localhost.' }, 403);
  }

  const snapshot = await getScoreboard();
  if (new URL(request.url).searchParams.get('format') === 'vmix') {
    const { home, away } = snapshot.score;
    return respond([{
      'home-score': String(home ?? '–'),
      'away-score': String(away ?? '–'),
    }]);
  }

  return respond(snapshot);
}

export async function POST(request) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!sameOrigin(request) || !isOperator({ host: request.headers.get('host'), token })) {
    return respond({ error: 'Sesi operator tidak valid. Login ulang di panel operator.' }, 401);
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

  const result = await updateScoreboard(action);
  return respond(result, result.score ? 200 : 400);
}

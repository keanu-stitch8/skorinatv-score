import { createSession, passwordMatches, sameOrigin, secureRequest, sessionCookie } from '../../../modules/auth/operator-auth';

export const dynamic = 'force-dynamic';

function redirectTo(path) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function POST(request) {
  if (!sameOrigin(request)) return new Response('Origin tidak valid.', { status: 403 });

  const form = await request.formData().catch(() => null);
  if (!passwordMatches(form?.get('password'))) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return redirectTo('/login?error=1');
  }

  const { value, maxAge } = createSession();
  const response = redirectTo('/');
  response.headers.append('Set-Cookie', [
    `${sessionCookie}=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secureRequest(request) ? ['Secure'] : []),
  ].join('; '));
  return response;
}

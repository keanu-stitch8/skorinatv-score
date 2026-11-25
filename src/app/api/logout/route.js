import { sameOrigin, sessionCookie } from '../../../modules/auth/operator-auth';

export async function POST(request) {
  if (!sameOrigin(request)) return new Response('Origin tidak valid.', { status: 403 });
  return new Response(null, {
    status: 303,
    headers: { Location: '/login', 'Set-Cookie': `${sessionCookie}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` },
  });
}

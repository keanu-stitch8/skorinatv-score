import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const sessionCookie = 'skorina_operator';
const sessionHours = 12;

export function operatorPassword() {
  return process.env.OPERATOR_PASSWORD?.trim() || null;
}

function localHost(host) {
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host ?? '');
}

function sign(value, password) {
  // Key turunan dari password, jadi mengganti OPERATOR_PASSWORD langsung mencabut semua sesi.
  const key = createHmac('sha256', 'skorina-tv.session').update(password).digest();
  return createHmac('sha256', key).update(value).digest('base64url');
}

function same(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordMatches(input) {
  const password = operatorPassword();
  return Boolean(password && typeof input === 'string' && same(sign(input, password), sign(password, password)));
}

export function createSession() {
  const expires = Date.now() + sessionHours * 3_600_000;
  return { value: `${expires}.${sign(String(expires), operatorPassword())}`, maxAge: sessionHours * 3600 };
}

function validSession(token) {
  const password = operatorPassword();
  const [expires, signature] = String(token ?? '').split('.');
  return Boolean(password && /^\d+$/.test(expires) && Number(expires) > Date.now() &&
    signature && same(signature, sign(expires, password)));
}

/**
 * Operator access. With OPERATOR_PASSWORD set (Vercel), a signed session cookie is required.
 * Without it, only the local app on 127.0.0.1 is trusted, as before.
 */
export function isOperator({ host, token }) {
  return operatorPassword() ? validSession(token) : localHost(host);
}

/** Public score reads: always on a deployment with a password, otherwise localhost only. */
export function canRead(host) {
  return Boolean(operatorPassword()) || localHost(host);
}

/** Rejects cross-site form and fetch submissions. */
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export function secureRequest(request) {
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  return proto === 'https';
}

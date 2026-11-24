import 'server-only';

const baseUrl = 'https://sportapi.ai/api';

function request(path, key) {
  return fetch(`${baseUrl}${path}`, {
    headers: { 'X-Api-Key': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(4500),
  });
}

export function fetchFixtures(date, key) {
  return request(`/fixtures/date/${encodeURIComponent(date)}`, key);
}

export function fetchFixture(fixtureId, key) {
  return request(`/fixtures/${encodeURIComponent(fixtureId)}`, key);
}

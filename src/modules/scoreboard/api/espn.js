import 'server-only';

/**
 * ESPN's public site API. No key and no published quota. Not cached here: the stats query keeps
 * its own short in-memory cache, because the Next.js data cache reuses the first request's
 * timeout signal on background revalidation and then never refreshes.
 */
export function fetchEspnSummary(league, eventId) {
  return fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${encodeURIComponent(eventId)}`,
    { cache: 'no-store', signal: AbortSignal.timeout(4500) },
  );
}

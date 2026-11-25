'use client';

/**
 * Shared, de-duplicated client-side session lookup.
 * Navbar, footer, home page etc. all call getSession(); only one /api/me request is made
 * per 30 seconds instead of one (plus retries) per component per navigation.
 */
const TTL_MS = 30_000;
let pending = null;
let fetchedAt = 0;

export function getSession({ force = false } = {}) {
  if (!force && pending && Date.now() - fetchedAt < TTL_MS) return pending;
  fetchedAt = Date.now();
  pending = fetch('/api/me', { credentials: 'include', cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d && (d.id || d.user?.id) ? { ...d, id: d.id || d.user.id } : null))
    .catch(() => null);
  return pending;
}

export function clearSession() {
  pending = null;
  fetchedAt = 0;
}

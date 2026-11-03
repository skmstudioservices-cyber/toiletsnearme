/**
 * Internal, first-party tracking — local only.
 * Records page views and UI events in localStorage so the themes manager can
 * show what is actually used. Nothing is sent anywhere: no identifiers, no
 * referrers, no third-party calls. Cleared by the user from /themes/.
 */
const KEY = 'tnm_events_v1';
const MAX = 500;

export type TrackEvent = { t: number; type: string; path: string; label?: string };

export function readEvents(): TrackEvent[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function track(type: string, label?: string) {
  try {
    const rows = readEvents();
    rows.push({ t: Date.now(), type, path: location.pathname, label });
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX)));
  } catch { /* storage blocked — tracking is best-effort */ }
}

export function clearEvents() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function summarise() {
  const rows = readEvents();
  const byType: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  for (const r of rows) {
    byType[r.type] = (byType[r.type] || 0) + 1;
    byPath[r.path] = (byPath[r.path] || 0) + 1;
  }
  return { total: rows.length, byType, byPath, rows };
}

export function initTracking() {
  track('pageview');
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest?.('[data-track]');
    if (el) track('click', (el as HTMLElement).dataset.track);
  });
}

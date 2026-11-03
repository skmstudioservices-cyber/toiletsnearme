import type { APIRoute } from 'astro';
import { getAllCities, getCityFacilities } from '../../lib/cities';

// Prerendered at build time — the homepage map fetches this lazily instead of
// inlining 7,700 facilities into the HTML.
export const GET: APIRoute = async () => {
  const rows: any[] = [];
  for (const c of getAllCities()) {
    for (const f of getCityFacilities(c.slug)) {
      rows.push([
        f.lat.toFixed(5), f.lon.toFixed(5),
        c.slug, c.name,
        f.name || '',
        f.fee === 'free' ? 0 : f.fee === 'paid' ? 1 : 2,
        f.open24 ? 1 : 0, f.wheelchair ? 1 : 0, f.women ? 1 : 0, f.baby ? 1 : 0,
      ]);
    }
  }
  return new Response(JSON.stringify(rows), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
  });
};

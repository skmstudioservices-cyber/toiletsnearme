import type { APIRoute } from 'astro';
import { getAllCities } from '../lib/cities';

// Own the sitemap file outright instead of relying on the integration's
// sitemap-index.xml / sitemap-0.xml pair. One predictable URL, one predictable
// format, no legacy artifact can shadow it.
const SITE = 'https://toiletsnearme.pages.dev';

const STATIC_PAGES = [
  '/', '/about/', '/privacy/', '/sitemap/',
  '/washroom-near-me/', '/toilet-near-me/', '/24-hour-toilet-near-me/',
  '/free-public-toilets-near-me/', '/pay-and-use-toilets-near-me/',
  '/public-toilets-at-malls/', '/public-toilets-near-me-open-now/',
  '/sulabh-toilets-near-me/', '/toilets-at-petrol-pumps/',
  '/toilets-at-railway-stations/', '/wheelchair-accessible-toilets-near-me/',
  '/highway-toilets-near-me/',
];

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const cityPaths = getAllCities().map((c) => `/${c.slug}/`);
  const all = [...STATIC_PAGES, ...cityPaths];

  const urls = all
    .map((p) => {
      const priority = p === '/' ? '1.0' : p.split('/').filter(Boolean).length === 1 ? '0.8' : '0.6';
      return `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};

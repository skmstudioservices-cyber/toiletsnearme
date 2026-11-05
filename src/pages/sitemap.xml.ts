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
  const cityPaths = getAllCities().map((c) => `/${c.slug}/`);
  const all = [...STATIC_PAGES, ...cityPaths];

  // Google's sitemap documentation: priority and changefreq are ignored, and
  // lastmod is only used when it is consistently and verifiably accurate.
  // A build-date lastmod is always wrong, so it is omitted rather than faked.
  const urls = all
    .map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n  </url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};

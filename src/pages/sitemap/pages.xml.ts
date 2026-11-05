import type { APIRoute } from 'astro';

const SITE = 'https://toiletsnearme.pages.dev';

const PAGES = [
  '/', '/about/', '/privacy/', '/sitemap/',
  '/washroom-near-me/', '/toilet-near-me/', '/24-hour-toilet-near-me/',
  '/free-public-toilets-near-me/', '/pay-and-use-toilets-near-me/',
  '/public-toilets-at-malls/', '/public-toilets-near-me-open-now/',
  '/sulabh-toilets-near-me/', '/toilets-at-petrol-pumps/',
  '/toilets-at-railway-stations/', '/wheelchair-accessible-toilets-near-me/',
  '/highway-toilets-near-me/',
];

export const GET: APIRoute = async () => {
  const urls = PAGES.map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
      'x-content-type-options': 'nosniff',
    },
  });
};

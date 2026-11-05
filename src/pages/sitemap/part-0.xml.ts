import type { APIRoute } from 'astro';
import { getAllCities } from '../../lib/cities';

const SITE = 'https://toiletsnearme.pages.dev';

export const GET: APIRoute = async () => {
  const urls = getAllCities()
    .map((c) => `  <url>\n    <loc>${SITE}/${c.slug}/</loc>\n  </url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
      'x-content-type-options': 'nosniff',
    },
  });
};

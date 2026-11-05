import type { APIRoute } from 'astro';

// Mirrors the structure of the digipincode sitemap, which Google does read:
// a <sitemapindex> at /sitemap.xml pointing at child sitemaps, each entry
// carrying a <lastmod>. Google's docs allow lastmod on index entries.
const SITE = 'https://toiletsnearme.pages.dev';

const HEADERS = {
  'content-type': 'application/xml; charset=utf-8',
  'cache-control': 'public, max-age=86400, s-maxage=86400',
  'x-content-type-options': 'nosniff',
};

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const children = ['/sitemap/pages.xml', '/sitemap/part-0.xml'];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    children
      .map((c) => `  <sitemap>\n    <loc>${SITE}${c}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`)
      .join('\n') +
    '\n</sitemapindex>\n';

  return new Response(xml, { headers: HEADERS });
};

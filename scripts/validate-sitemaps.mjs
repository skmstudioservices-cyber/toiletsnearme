// Build-time sitemap validation. Fails the build only on local XML problems —
// never on network/Google availability.
import { readFileSync, existsSync } from 'node:fs';

const HOST = 'https://toiletsnearme.pages.dev';
const INDEX = 'public/sitemap.xml';
const children = ['public/sitemap/pages.xml', 'public/sitemap/part-0.xml'];
const LIMIT = 50000;
let fail = 0;
const bad = (m) => { console.error('  FAIL:', m); fail++; };

function locs(xml) { return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim()); }

if (!existsSync(INDEX)) bad(`${INDEX} missing`);
const indexXml = readFileSync(INDEX, 'utf8');
if (!indexXml.includes('<sitemapindex')) bad('index is not a <sitemapindex>');

for (const c of children) {
  if (!existsSync(c)) { bad(`${c} missing`); continue; }
  const xml = readFileSync(c, 'utf8');
  if (!xml.includes('<urlset')) bad(`${c} is not a <urlset>`);
  if (xml.includes('<sitemapindex')) bad(`${c} is a nested index — not allowed`);
  const urls = locs(xml);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) bad(`${c}: ${dupes.length} duplicate URLs`);
  const offhost = urls.filter(u => !u.startsWith(HOST + '/'));
  if (offhost.length) bad(`${c}: ${offhost.length} URLs off the production host`);
  if (urls.length > LIMIT) bad(`${c}: ${urls.length} URLs exceeds ${LIMIT}`);
  console.log(`  ${c}: ${urls.length} URLs, ${dupes.length} dupes, ${offhost.length} off-host`);
}

// every child referenced by the index must exist
const indexLocs = locs(indexXml).filter(u => u.endsWith('.xml'));
for (const u of indexLocs) {
  const local = 'public' + new URL(u).pathname;
  if (!existsSync(local)) bad(`index references ${u} but ${local} is not generated`);
}

console.log(fail === 0 ? 'SITEMAP VALIDATION: PASS' : `SITEMAP VALIDATION: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);

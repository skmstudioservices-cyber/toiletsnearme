#!/usr/bin/env node
/**
 * Build-time preflight — runs AFTER `astro build`, on dist/.
 *
 * WHY THIS EXISTS
 * 26 Nov 2026: the Astro cutover dropped the google-site-verification meta from
 * the homepage. Nothing checked it, so Google revoked ownership of the property
 * and every audit kept reporting it as verified because the GSC API still said
 * siteOwner. A green deploy is not proof. This gate turns each of those silent
 * failures into a red build.
 *
 * It runs inside `npm run build`, which Cloudflare Pages executes, so a broken
 * deploy cannot reach production.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const SITE = process.env.SITE_URL || 'https://toiletsnearme.pages.dev';
const HOST = new URL(SITE).host;

const fail = [];
const warn = [];
const pass = [];
const ok = (m) => pass.push(m);
const bad = (m) => fail.push(m);
const soft = (m) => warn.push(m);

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

// ---------- 1. the homepage must exist ----------
const home = read(path.join(DIST, 'index.html'));
if (!home) {
  bad(`dist/index.html missing — the build produced no homepage`);
}

if (home) {
  // ---------- 2. GSC ownership token (the 26 Nov regression) ----------
  if (/<meta[^>]+name=["']google-site-verification["'][^>]+content=["'][^"']+["']/i.test(home)) {
    ok('google-site-verification meta present');
  } else {
    bad('google-site-verification meta MISSING from dist/index.html — Google will revoke ownership');
  }

  // ---------- 3. canonical ----------
  if (/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+["']/i.test(home)) {
    ok('canonical link present');
  } else {
    bad('canonical link MISSING from dist/index.html');
  }

  // ---------- 4. must not be accidentally de-indexed ----------
  if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(home)) {
    bad('homepage carries noindex — it will drop out of search');
  } else {
    ok('homepage is indexable');
  }

  // ---------- 5. title + description length (snippet, not a blocker) ----------
  const title = (home.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc = (home.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '';
  const tLen = title.trim().length, dLen = desc.trim().length;
  if (!tLen) bad('title is empty');
  else if (tLen < 15 || tLen > 65) soft(`title is ${tLen} chars (aim 15–65): "${title.trim()}"`);
  else ok(`title ${tLen} chars`);
  if (!dLen) bad('meta description is empty');
  else if (dLen < 70 || dLen > 165) soft(`description is ${dLen} chars (aim 70–165)`);
  else ok(`description ${dLen} chars`);

  // ---------- 6. no unresolved template placeholders leaking to the page ----------
  // Strip <script>/<style> first: client-side JS legitimately contains ${...}
  // template literals, and flagging those blocked a good build on 26 Nov 2026.
  const markupOnly = home
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const leftover = markupOnly.match(/\$\{[^}]+\}/);
  if (leftover) bad('unrendered placeholder found in dist/index.html: ' + leftover[0]);
}

// ---------- 7. sitemap ----------
const smPath = ['sitemap.xml', 'sitemap-index.xml']
  .map((f) => path.join(DIST, f))
  .find((p) => fs.existsSync(p));
if (!smPath) {
  bad('no sitemap.xml or sitemap-index.xml in dist/');
} else {
  const xml = read(smPath) || '';
  if (!/<urlset|<sitemapindex/i.test(xml)) bad(`${smPath} is not a urlset or sitemapindex`);
  else {
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    if (!locs.length) bad(`${smPath} contains zero <loc> entries — Google will fetch it and learn nothing`);
    else {
      ok(`${path.basename(smPath)} lists ${locs.length} URL(s)`);
      const wrong = locs.filter((u) => {
        try { return new URL(u).host !== HOST; } catch { return true; }
      });
      if (wrong.length) bad(`${wrong.length} sitemap URL(s) point at the wrong host, e.g. ${wrong[0]}`);
      const dupes = locs.filter((u, i) => locs.indexOf(u) !== i);
      if (dupes.length) soft(`${dupes.length} duplicate URL(s) in sitemap, e.g. ${dupes[0]}`);
    }
  }
}

// ---------- 8. robots.txt must advertise the sitemap ----------
const robots = read(path.join(DIST, 'robots.txt'));
if (!robots) {
  bad('dist/robots.txt missing');
} else {
  if (/^\s*Sitemap:\s*https?:\/\/\S+/im.test(robots)) ok('robots.txt declares a Sitemap');
  else bad('robots.txt has no Sitemap: line');
  // Only the `User-agent: *` group matters here. Bot-specific `Disallow: /`
  // lines (GPTBot, CCBot, AhrefsBot, ...) are deliberate and must not fail the
  // build — the 26 Nov 2026 run was blocked by exactly that false positive.
  const starGroup = (() => {
    const lines = robots.split(/\r?\n/);
    let inStar = false, out = [];
    for (const line of lines) {
      const m = line.match(/^\s*User-agent:\s*(.+?)\s*$/i);
      if (m) { inStar = m[1] === '*'; continue; }
      if (!line.trim()) { inStar = false; continue; }
      if (inStar) out.push(line);
    }
    return out.join('\n');
  })();
  if (/^\s*Disallow:\s*\/\s*$/im.test(starGroup)) bad('robots.txt disallows the whole site for User-agent: *');
}

// ---------- report ----------
console.log('\n─── build preflight ─────────────────────────────');
for (const m of pass) console.log('  🟢 ' + m);
for (const m of warn) console.log('  🟡 ' + m);
for (const m of fail) console.log('  🔴 ' + m);
console.log('─────────────────────────────────────────────────\n');

if (fail.length) {
  console.error(`preflight failed: ${fail.length} blocker(s). Build stopped so this cannot reach production.`);
  process.exit(1);
}
console.log(`preflight passed (${pass.length} checks, ${warn.length} warning(s)).`);

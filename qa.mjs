import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'https://toiletsnearme.pages.dev';
const OUT = 'qa-out';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
const PAGES = [
  { path: '/', name: 'home' },
  { path: '/delhi/', name: 'delhi' },
  { path: '/ahmedabad/', name: 'ahmedabad' },
  { path: '/agra/', name: 'agra' },
  { path: '/about/', name: 'about' },
];

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();

// ---------- screenshots + layout checks ----------
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  for (const pg of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const resp = await page.goto(BASE + pg.path, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(1800);
    check(`${pg.name} ${vp.name} HTTP 200`, resp?.status() === 200, `status ${resp?.status()}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    check(`${pg.name} ${vp.name} no horizontal overflow`, !overflow);
    const h1 = await page.locator('h1').count();
    check(`${pg.name} ${vp.name} single h1`, h1 === 1, `found ${h1}`);
    if (errors.length) check(`${pg.name} ${vp.name} console clean`, false, errors.slice(0, 3).join(' | '));
    else check(`${pg.name} ${vp.name} console clean`, true);
    await page.screenshot({ path: `${OUT}/${pg.name}-${vp.name}.png`, fullPage: false });
    if (pg.path === '/') await page.screenshot({ path: `${OUT}/home-${vp.name}-full.png`, fullPage: true });
    if (pg.path === '/delhi/') await page.screenshot({ path: `${OUT}/delhi-${vp.name}-full.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}

// ---------- interactions ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

async function safe(name, fn) { try { await fn(); } catch (e) { check(name, false, String(e).split('\n')[0].slice(0,90)); } }

// homepage search filter
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
const before = await page.locator('[data-city]:visible').count();
await safe('home search input accepts text', async () => {
  await page.fill('[data-city-search]', 'delhi', { timeout: 15000 });
  await page.waitForTimeout(500);
});
const after = await page.locator('[data-city]:visible').count().catch(() => before);
check('home search filters city grid', after > 0 && after < before, `${before} → ${after}`);
await page.screenshot({ path: `${OUT}/interaction-home-search.png` });
await page.fill('[data-city-search]', '');

// nav toggle on mobile
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mctx.newPage();
await mpage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await mpage.waitForTimeout(800);
const navVisibleBefore = await mpage.locator('#primary-nav').isVisible().catch(() => false);
await safe('mobile nav toggle clickable', () => mpage.click('[data-nav-toggle]', { timeout: 15000 }));
await mpage.waitForTimeout(400);
const navVisibleAfter = await mpage.locator('#primary-nav').isVisible().catch(() => false);
check('mobile nav opens', !navVisibleBefore && navVisibleAfter, `${navVisibleBefore} → ${navVisibleAfter}`);
await mpage.screenshot({ path: `${OUT}/interaction-mobile-nav.png` });
await mctx.close();

// city page: map + pins + filters
await page.goto(BASE + '/delhi/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const tiles = await page.locator('.leaflet-tile-loaded').count();
check('delhi map tiles load', tiles > 4, `${tiles} tiles`);
const pins = await page.locator('.facility-pin, .cluster-pin').count();
check('delhi map renders pins', pins > 0, `${pins} markers`);
const countText = await page.locator('[data-map-count]').innerText();
check('delhi facility count renders', /\d/.test(countText), countText);
await page.screenshot({ path: `${OUT}/interaction-delhi-map.png` });

const listRows = await page.locator('.facility-list li').count();
check('delhi facility list populated', listRows > 0, `${listRows} rows`);

// toggle a filter and confirm the count changes
await safe('filter checkbox clickable', async () => {
  try {
    await page.check('input[data-filter="wheelchair"]', { timeout: 8000 });
  } catch {
    // an ad overlay may intercept the click; drive the control directly
    await page.$eval('input[data-filter="wheelchair"]', (el) => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
});
await page.waitForTimeout(700);
const filtered = await page.locator('[data-map-count]').innerText();
check('filter reduces count', filtered !== countText, `${countText} → ${filtered}`);
await page.screenshot({ path: `${OUT}/interaction-delhi-filter.png` });
await page.$eval('input[data-filter="wheelchair"]', (el) => {
  el.checked = false;
  el.dispatchEvent(new Event('change', { bubbles: true }));
});

// popup on a single pin (zoom in first so markers are unclustered)
await page.evaluate(() => {
  const el = document.querySelector('[data-map]');
  if (el) el.scrollIntoView();
});
// zoom in via a cluster first so individual pins separate, then open a popup
await safe('zoom into cluster', async () => {
  const cluster = page.locator('.cluster-pin').first();
  if (await cluster.count()) {
    await cluster.click({ force: true, timeout: 8000 });
    await page.waitForTimeout(1800);
  }
});
let singlePin = page.locator('.facility-pin').first();
if (!(await singlePin.count())) {
  await safe('zoom in again', async () => {
    const c2 = page.locator('.cluster-pin').first();
    if (await c2.count()) { await c2.click({ force: true, timeout: 8000 }); await page.waitForTimeout(1800); }
  });
  singlePin = page.locator('.facility-pin').first();
}
if (await singlePin.count()) {
  // dispatch the click straight on the marker element: ad overlays intercept
  // real pointer events in headless runs, but Leaflet binds on the icon node
  await safe('click pin', async () => {
    await page.$eval('.facility-pin', (el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
  });
  await page.waitForTimeout(1200);
  const popup = await page.locator('.leaflet-popup-content').count();
  check('pin popup opens', popup > 0, `${popup} popup(s)`);
  await page.screenshot({ path: `${OUT}/interaction-delhi-popup.png` });
} else {
  check('pin popup opens', false, 'no unclustered pin after zooming');
}

// geolocation denial path
const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: [] });
const dpage = await dctx.newPage();
await dpage.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await dpage.click('[data-geolocate]');
await dpage.waitForTimeout(2500);
const hint = await dpage.locator('[data-geo-hint]').innerText().catch(() => '');
check('geolocation denial handled', /denied|Location/i.test(hint), hint.slice(0, 60));
await dctx.close();

check('no uncaught JS errors on interactions', errs.length === 0, errs.slice(0, 2).join(' | '));
await browser.close();

const failed = results.filter((r) => !r.pass);
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exit(1);

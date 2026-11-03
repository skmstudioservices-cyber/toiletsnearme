#!/usr/bin/env node
/**
 * attr-sync.mjs — pull crowdsourced facility updates from KV (ATTR_KV)
 * and write data/attr-updates.json so the static pages can show them.
 *
 * Runs on a 5-hourly cron AND whenever >= 20 new updates are pending.
 * KV has no "capacity %" — the honest threshold is pending-update count.
 */
import fs from 'node:fs';

const KEY = process.env.CLOUDFLARE_API_TOKEN;
const ACC = process.env.CLOUDFLARE_ACCOUNT_ID;
const NS  = process.env.ATTR_KV_NAMESPACE_ID || '866cf289f096456382fcf0cbb5bf260d';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACC}/storage/kv/namespaces/${NS}`;
const OUT = 'data/attr-updates.json';
const MIN_PENDING = 20;

if (!KEY || !ACC) { console.log('CF creds missing — skipping'); process.exit(0); }

const h = { Authorization: `Bearer ${KEY}` };

async function listKeys() {
  const r = await fetch(`${API}/keys?prefix=upd%3A&limit=1000`, { headers: h });
  if (!r.ok) throw new Error(`list keys ${r.status}`);
  return (await r.json()).result || [];
}

async function getValue(name) {
  const r = await fetch(`${API}/values/${encodeURIComponent(name)}`, { headers: h });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { syncedAt: null, count: 0, cities: {} };
const keys = await listKeys();
const pending = keys.length - (prev.count || 0);

if (keys.length === 0) { console.log('no updates yet'); process.exit(0); }
if (pending < MIN_PENDING && process.env.FORCE !== '1') {
  console.log(`pending ${pending} < ${MIN_PENDING} — waiting for the next scheduled run`);
  process.exit(0);
}

const cities = {};
for (const k of keys.slice(-500)) {
  const rec = await getValue(k.name);
  if (!rec || !rec.city) continue;
  const c = (cities[rec.city] ||= { updates: 0, facilities: {} });
  c.updates++;
  const f = (c.facilities[rec.facility] ||= { reported: 0, attrs: {}, clean: [], safety: [] });
  f.reported++;
  for (const a of Object.keys(rec.attrs || {})) f.attrs[a] = (f.attrs[a] || 0) + 1;
  if (rec.clean) f.clean.push(rec.clean);
  if (rec.safety) f.safety.push(rec.safety);
}

const out = { syncedAt: new Date().toISOString(), count: keys.length, cities };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`wrote ${OUT}: ${keys.length} updates across ${Object.keys(cities).length} cities`);

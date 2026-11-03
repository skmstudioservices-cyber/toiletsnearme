import fs from 'node:fs';
import path from 'node:path';

export type City = {
  slug: string;
  name: string;
  count: number;
  free: number;
  paid: number;
  open24: number;
  wheelchair: number;
  women: number;
  baby: number;
  named: number;
  customers: number;
  lat: number;
  lon: number;
  dataFile: string;
};

export type Facility = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  fee: 'free' | 'paid' | 'unknown';
  feeRaw: string;
  open24: boolean;
  openingHours: string;
  wheelchair: boolean;
  wheelchairRaw: string;
  women: boolean;
  men: boolean;
  baby: boolean;
  customers: boolean;
  water: boolean;
  soap: boolean;
  parking: boolean;
  operator: string;
  description: string;
  unisex: boolean;
};

const DATA = path.resolve('./data');

function titleise(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function readFeatureCollection(slug: string): any[] {
  const p = path.join(DATA, `${slug}.json`);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).features || [];
  } catch {
    return [];
  }
}

export function toFacility(f: any, i: number): Facility | null {
  const lat = f?.geometry?.coordinates?.[1];
  const lon = f?.geometry?.coordinates?.[0];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const p = f.properties || {};
  const fee = p.fee === 'no' ? 'free' : p.fee === 'yes' ? 'paid' : 'unknown';
  return {
    id: String(f.id ?? p['@id'] ?? `${lat},${lon},${i}`),
    lat,
    lon,
    name: (p.name || '').trim(),
    fee,
    feeRaw: (p.fee || '').trim(),
    open24: p.opening_hours === '24/7',
    openingHours: (p.opening_hours || '').trim(),
    wheelchair: p.wheelchair === 'yes' || p.wheelchair === 'designated',
    wheelchairRaw: (p.wheelchair || '').trim(),
    women: p.female === 'yes' || p.unisex === 'yes',
    men: p.male === 'yes',
    baby: p.changing_table === 'yes',
    customers: p.access === 'customers',
    water: p.water === 'yes' || p.drinking_water === 'yes',
    soap: p.soap === 'yes' || p.handwashing === 'yes',
    parking: p.parking === 'yes',
    operator: (p.operator || '').trim(),
    description: (p.description || '').trim(),
    unisex: p.unisex === 'yes',
  };
}

export function getAllCities(): City[] {
  const out: City[] = [];
  for (const file of fs.readdirSync(DATA)) {
    if (!file.endsWith('.json')) continue;
    if (file === 'cities-added.json' || file === 'attributes.json') continue;
    const slug = file.replace(/\.json$/, '');
    const feats = readFeatureCollection(slug);
    if (!feats.length) continue;

    let free = 0, paid = 0, open24 = 0, wheelchair = 0, women = 0, baby = 0, named = 0, customers = 0;
    let latSum = 0, lonSum = 0, n = 0;
    for (let i = 0; i < feats.length; i++) {
      const f = toFacility(feats[i], i);
      if (!f) continue;
      if (f.fee === 'free') free++;
      else if (f.fee === 'paid') paid++;
      if (f.open24) open24++;
      if (f.wheelchair) wheelchair++;
      if (f.women) women++;
      if (f.baby) baby++;
      if (f.name) named++;
      if (f.customers) customers++;
      latSum += f.lat; lonSum += f.lon; n++;
    }
    if (!n) continue;

    out.push({
      slug, name: titleise(slug), count: n, free, paid, open24, wheelchair, women, baby, named, customers,
      lat: latSum / n, lon: lonSum / n, dataFile: file,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function getCity(slug: string): City | undefined {
  return getAllCities().find((c) => c.slug === slug);
}

export function getCityFacilities(slug: string): Facility[] {
  return readFeatureCollection(slug)
    .map((f, i) => toFacility(f, i))
    .filter((f): f is Facility => f !== null);
}

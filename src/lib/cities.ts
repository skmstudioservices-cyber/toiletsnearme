import fs from 'node:fs';
import path from 'node:path';

export type City = {
  slug: string;
  name: string;
  state: string;
  count: number;
  free: number;
  paid: number;
  open24: number;
  wheelchair: number;
  women: number;
  baby: number;
  dataFile: string;
};

const DATA = path.resolve('./data');

function titleise(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function getAllCities(): City[] {
  const out: City[] = [];
  for (const file of fs.readdirSync(DATA)) {
    if (!file.endsWith('.json')) continue;
    if (file === 'cities-added.json' || file === 'attributes.json') continue;
    const slug = file.replace(/\.json$/, '');
    let fc: any;
    try { fc = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); } catch { continue; }
    const feats: any[] = fc.features || [];
    if (!feats.length) continue;
    let free = 0, paid = 0, open24 = 0, wheelchair = 0, women = 0, baby = 0;
    for (const f of feats) {
      const p = f.properties || {};
      if (p.fee === 'no') free++;
      else if (p.fee === 'yes') paid++;
      if (p.opening_hours === '24/7') open24++;
      if (p.wheelchair === 'yes' || p.wheelchair === 'designated') wheelchair++;
      if (p.female === 'yes' || p.unisex === 'yes') women++;
      if (p.changing_table === 'yes') baby++;
    }
    out.push({
      slug, name: titleise(slug), state: '', count: feats.length,
      free, paid, open24, wheelchair, women, baby, dataFile: file,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function getCityData(slug: string) {
  const p = path.join(DATA, `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

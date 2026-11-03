import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type Facility = {
  id: string; lat: number; lon: number; name: string;
  fee: 'free' | 'paid' | 'unknown'; feeRaw: string;
  open24: boolean; openingHours: string;
  wheelchair: boolean; wheelchairRaw: string;
  women: boolean; men: boolean; baby: boolean; customers: boolean;
  water: boolean; soap: boolean; parking: boolean;
  operator: string; description: string; unisex: boolean;
};

type FilterKey = 'free' | 'paid' | 'open24' | 'wheelchair' | 'women' | 'baby';

const PIN: Record<string, string> = { free: '#0d9488', paid: '#f59e0b', unknown: '#64748b' };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function tagsOf(f: Facility): string[] {
  const t: string[] = [];
  if (f.fee === 'free') t.push('Free');
  else if (f.fee === 'paid') t.push(f.feeRaw ? `Paid (${f.feeRaw})` : 'Paid (₹5–10 typical)');
  if (f.open24) t.push('Open 24 hours');
  else if (f.openingHours) t.push(f.openingHours);
  if (f.wheelchair) t.push('Wheelchair accessible');
  else if (f.wheelchairRaw === 'no') t.push('No wheelchair access');
  if (f.women) t.push("Women's section");
  if (f.men) t.push("Men's section");
  if (f.baby) t.push('Baby changing');
  if (f.water) t.push('Water');
  if (f.soap) t.push('Soap / wash basin');
  if (f.parking) t.push('Parking');
  if (f.customers) t.push('Customers only');
  return t;
}

function matches(f: Facility, active: Set<FilterKey>): boolean {
  for (const k of active) {
    if (k === 'free' && f.fee !== 'free') return false;
    if (k === 'paid' && f.fee !== 'paid') return false;
    if (k === 'open24' && !f.open24) return false;
    if (k === 'wheelchair' && !f.wheelchair) return false;
    if (k === 'women' && !f.women) return false;
    if (k === 'baby' && !f.baby) return false;
  }
  return true;
}

function popupHtml(f: Facility, cityName: string, slug: string): string {
  const title = displayName(f, cityName);
  const rows = tagsOf(f).map((t) => `<span>${esc(t)}</span>`).join('');
  const op = f.operator ? `<div class="popup-op">${esc(f.operator)}</div>` : '';
  const desc = f.description ? `<div class="popup-desc">${esc(f.description)}</div>` : '';
  return `<div class="popup-card"><strong>${esc(title)}</strong>${op}${desc}
    ${rows ? `<div class="popup-tags">${rows}</div>` : ''}
    <a class="popup-link" href="https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lon}#map=19/${f.lat}/${f.lon}" target="_blank" rel="noopener noreferrer">Open in OpenStreetMap →</a>
    <a class="popup-link" href="/${slug}/">More toilets in ${esc(cityName)} →</a></div>`;
}

function displayName(f: Facility, cityName: string): string {
  if (f.name) return f.name;
  if (f.operator) return `Public toilet · ${f.operator}`;
  if (f.description) return f.description;
  return `Public toilet in ${cityName}`;
}

function cardHtml(f: Facility, cityName: string, slug: string, withCity: boolean): string {
  const title = displayName(f, cityName);
  const locator = `${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}`;
  const tags = tagsOf(f).slice(0, 6).map((t) => `<span class="fchip">${esc(t)}</span>`).join('');
  const op = f.operator && f.name ? `<span class="fcard-op">${esc(f.operator)}</span>` : `<span class="fcard-op">${esc(locator)}</span>`;
  const city = withCity ? `<a class="fcard-city" href="/${slug}/">${esc(cityName)}</a>` : '';
  return `<li class="fcard">
    <div class="fcard-head"><span class="fcard-name">${esc(title)}</span>${city}</div>
    ${op}
    <div class="fcard-tags">${tags || '<span class="fchip fchip-empty">No details recorded</span>'}</div>
    <div class="fcard-actions">
      <a href="https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lon}#map=19/${f.lat}/${f.lon}" target="_blank" rel="noopener noreferrer">Directions</a>
      <button type="button" class="fcard-zoom" data-lat="${f.lat}" data-lon="${f.lon}">Show on map</button>
    </div>
  </li>`;
}

export function initFacilityMap(root: HTMLElement) {
  const mapEl = root.querySelector<HTMLElement>('[data-map]');
  if (!mapEl) return;

  const dataEl = root.querySelector<HTMLScriptElement>('[data-map-points]');
  const src = root.dataset.mapSrc || '';
  const withCity = root.dataset.mapCities === '1';

  const countEl = root.querySelector<HTMLElement>('[data-map-count]');
  const listEl = root.querySelector<HTMLElement>('[data-map-list]');
  const emptyEl = root.querySelector<HTMLElement>('[data-map-empty]');
  const locateBtn = root.querySelector<HTMLButtonElement>('[data-map-locate]');
  const filterEls = Array.from(root.querySelectorAll<HTMLInputElement>('[data-filter]'));
  const statusEl = root.querySelector<HTMLElement>('[data-map-status]');

  const active = new Set<FilterKey>();
  let all: Facility[] = [];
  let cityName = 'India';
  let slug = '';

  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([22.97, 78.65], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  map.once('click', () => map.scrollWheelZoom.enable());

  const layer = L.layerGroup().addTo(map);

  function render() {
    layer.clearLayers();
    const visible = all.filter((f) => matches(f, active));
    const zoom = map.getZoom();
    const cell = zoom >= 14 ? 0 : 64;
    const buckets = new Map<string, Facility[]>();

    for (const f of visible) {
      const key = cell
        ? `${Math.floor(map.project([f.lat, f.lon], zoom).x / cell)}:${Math.floor(map.project([f.lat, f.lon], zoom).y / cell)}`
        : f.id;
      const arr = buckets.get(key);
      if (arr) arr.push(f); else buckets.set(key, [f]);
    }

    for (const group of buckets.values()) {
      if (group.length === 1 || !cell) {
        for (const f of group) {
          L.marker([f.lat, f.lon], {
            icon: L.divIcon({
              className: 'facility-pin',
              html: `<span style="--pin:${PIN[f.fee]}"></span>`,
              iconSize: [16, 16], iconAnchor: [8, 8],
            }),
            title: f.name || 'Public toilet',
          }).bindPopup(popupHtml(f, (f as any).cityName || cityName, (f as any).slug || slug), { maxWidth: 280 }).addTo(layer);
        }
      } else {
        const lat = group.reduce((s, f) => s + f.lat, 0) / group.length;
        const lon = group.reduce((s, f) => s + f.lon, 0) / group.length;
        const m = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'cluster-pin',
            html: `<span>${group.length}</span>`,
            iconSize: [38, 38], iconAnchor: [19, 19],
          }),
        });
        m.on('click', () => map.setView([lat, lon], Math.min(map.getZoom() + 2, 16)));
        m.addTo(layer);
      }
    }

    if (countEl) countEl.textContent = visible.length.toLocaleString('en-IN');
    if (emptyEl) emptyEl.hidden = visible.length !== 0;

    if (listEl) {
      const shown = visible.slice(0, 30);
      listEl.innerHTML = shown
        .map((f: any) => cardHtml(f, f.cityName || cityName, f.slug || slug, withCity))
        .join('');
      if (visible.length > shown.length) {
        listEl.innerHTML += `<li class="fcard fcard-more">+ ${(visible.length - shown.length).toLocaleString('en-IN')} more facilities — use the filters or zoom the map to narrow down.</li>`;
      }
      listEl.querySelectorAll<HTMLButtonElement>('.fcard-zoom').forEach((btn) => {
        btn.addEventListener('click', () => {
          map.setView([Number(btn.dataset.lat), Number(btn.dataset.lon)], 17);
          mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
  }

  filterEls.forEach((el) =>
    el.addEventListener('change', () => {
      const key = el.dataset.filter as FilterKey;
      if (el.checked) active.add(key); else active.delete(key);
      render();
    }),
  );

  locateBtn?.addEventListener('click', () => {
    if (!('geolocation' in navigator)) { locateBtn.textContent = 'Location not supported'; return; }
    const original = locateBtn.textContent;
    locateBtn.disabled = true;
    locateBtn.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);
        L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 })
          .addTo(layer).bindPopup('Your location');
        locateBtn.disabled = false;
        locateBtn.textContent = original;
      },
      () => {
        locateBtn.disabled = false;
        locateBtn.textContent = 'Location blocked — enable it in your browser';
        window.setTimeout(() => { locateBtn.textContent = original; }, 3500);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

  function fitAll() {
    if (!all.length) return;
    map.fitBounds(L.latLngBounds(all.map((f) => [f.lat, f.lon] as [number, number])).pad(0.12), { maxZoom: 13 });
  }

  function hydrate(rows: Facility[]) {
    all = rows;
    if (statusEl) statusEl.hidden = true;
    fitAll();
    render();
  }

  map.on('zoomend', render);
  window.setTimeout(() => map.invalidateSize(), 200);

  if (dataEl?.textContent && dataEl.textContent.trim() !== '[]') {
    try {
      all = JSON.parse(dataEl.textContent);
      cityName = root.dataset.mapCity || 'India';
      slug = root.dataset.mapSlug || '';
      fitAll();
      render();
    } catch { /* fall through to empty state */ }
  } else if (src) {
    if (statusEl) statusEl.hidden = false;
    const load = () => {
      fetch(src).then((r) => r.json()).then((rows: any[]) => {
        hydrate(rows.map((r) => ({
          id: `${r[0]},${r[1]}`, lat: Number(r[0]), lon: Number(r[1]),
          name: r[4] || '', fee: r[5] === 0 ? 'free' : r[5] === 1 ? 'paid' : 'unknown',
          feeRaw: '', open24: !!r[6], openingHours: r[12] || '', wheelchair: !!r[7], wheelchairRaw: '',
          women: !!r[8], men: false, baby: !!r[9], customers: !!r[16],
          water: !!r[13], soap: !!r[14], parking: !!r[15],
          operator: r[10] || '', description: r[11] || '', unisex: false,
          slug: r[2], cityName: r[3],
        } as any)));
      }).catch(() => { if (statusEl) statusEl.textContent = 'Map data could not load — refresh to retry.'; });
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: '300px' });
    io.observe(root);
  } else {
    render();
  }
}

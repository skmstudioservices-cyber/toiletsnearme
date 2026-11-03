import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type Facility = {
  id: string; lat: number; lon: number; name: string;
  fee: 'free' | 'paid' | 'unknown';
  open24: boolean; wheelchair: boolean; women: boolean; baby: boolean; customers: boolean; operator: string;
};

type FilterKey = 'free' | 'paid' | 'open24' | 'wheelchair' | 'women' | 'baby';

const COLORS: Record<string, string> = {
  free: '#0d9488',
  paid: '#f59e0b',
  unknown: '#64748b',
};

function matches(f: Facility, active: Set<FilterKey>): boolean {
  if (!active.size) return true;
  for (const k of active) {
    if (k === 'free' && f.fee !== 'free') return false;
    if (k === 'paid' && f.fee !== 'paid') return false;
    if (k !== 'free' && k !== 'paid' && !(f as any)[k]) return false;
  }
  return true;
}

function popupHtml(f: Facility): string {
  const bits: string[] = [];
  if (f.name) bits.push(`<strong>${escapeHtml(f.name)}</strong>`);
  else bits.push('<strong>Public toilet</strong>');
  const tags: string[] = [];
  if (f.fee === 'free') tags.push('Free');
  if (f.fee === 'paid') tags.push('Paid (₹5–10 typical)');
  if (f.open24) tags.push('Open 24 hours');
  if (f.wheelchair) tags.push('Wheelchair accessible');
  if (f.women) tags.push("Women's section");
  if (f.baby) tags.push('Baby changing');
  if (f.customers) tags.push('Customers only');
  if (f.operator) tags.push(escapeHtml(f.operator));
  return `${bits.join('')}${tags.length ? `<div class="popup-tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div>` : ''}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function initFacilityMap(root: HTMLElement) {
  const mapEl = root.querySelector<HTMLElement>('[data-map]');
  const dataEl = root.querySelector<HTMLScriptElement>('[data-map-points]');
  if (!mapEl || !dataEl) return;

  let all: Facility[] = [];
  try { all = JSON.parse(dataEl.textContent || '[]'); } catch { all = []; }

  const countEl = root.querySelector<HTMLElement>('[data-map-count]');
  const listEl = root.querySelector<HTMLElement>('[data-map-list]');
  const emptyEl = root.querySelector<HTMLElement>('[data-map-empty]');
  const locateBtn = root.querySelector<HTMLButtonElement>('[data-map-locate]');
  const filterEls = Array.from(root.querySelectorAll<HTMLInputElement>('[data-filter]'));

  const active = new Set<FilterKey>();

  const map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true }).setView(
    all.length ? [all[0].lat, all[0].lon] : [22.9734, 78.6569],
    all.length ? 11 : 4,
  );
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  map.once('click', () => map.scrollWheelZoom.enable());

  const layer = L.layerGroup().addTo(map);
  let markers: L.Marker[] = [];

  function render() {
    layer.clearLayers();
    markers = [];
    const visible = all.filter((f) => matches(f, active));

    // grid clustering in pixel space — no extra dependency
    const zoom = map.getZoom();
    const cluster = new Map<string, Facility[]>();
    const cell = zoom >= 14 ? 0 : 64;
    for (const f of visible) {
      const key = cell ? `${Math.floor(map.project([f.lat, f.lon], zoom).x / cell)}:${Math.floor(map.project([f.lat, f.lon], zoom).y / cell)}` : f.id;
      const arr = cluster.get(key);
      if (arr) arr.push(f); else cluster.set(key, [f]);
    }

    for (const group of cluster.values()) {
      if (group.length === 1 || !cell) {
        for (const f of group) {
          const m = L.marker([f.lat, f.lon], {
            icon: L.divIcon({
              className: 'facility-pin',
              html: `<span style="--pin:${COLORS[f.fee]}"></span>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
            title: f.name || 'Public toilet',
          }).bindPopup(popupHtml(f), { closeButton: true, maxWidth: 260 });
          m.addTo(layer);
          markers.push(m);
        }
      } else {
        const lat = group.reduce((s, f) => s + f.lat, 0) / group.length;
        const lon = group.reduce((s, f) => s + f.lon, 0) / group.length;
        const m = L.marker([lat, lon], {
          icon: L.divIcon({
            className: 'cluster-pin',
            html: `<span>${group.length}</span>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        });
        m.on('click', () => map.setView([lat, lon], Math.min(map.getZoom() + 2, 16)));
        m.addTo(layer);
        markers.push(m);
      }
    }

    if (countEl) countEl.textContent = visible.length.toLocaleString('en-IN');
    if (emptyEl) emptyEl.hidden = visible.length !== 0;

    if (listEl) {
      const shown = visible.slice(0, 24);
      listEl.innerHTML = shown
        .map((f) => {
          const label = f.name || 'Public toilet';
          const tag = f.fee === 'free' ? 'Free' : f.fee === 'paid' ? 'Paid' : 'Fee not recorded';
          return `<li class="facility-row">
            <div class="facility-main"><span class="facility-name">${escapeHtml(label)}</span>
            <span class="facility-meta">${tag}${f.open24 ? ' · 24h' : ''}${f.wheelchair ? ' · ♿' : ''}${f.women ? ' · Women' : ''}</span></div>
            <a class="facility-link" href="https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lon}#map=18/${f.lat}/${f.lon}" target="_blank" rel="noopener noreferrer">Map</a>
          </li>`;
        })
        .join('');
      if (visible.length > shown.length) {
        listEl.innerHTML += `<li class="facility-more">+ ${(visible.length - shown.length).toLocaleString('en-IN')} more — zoom the map or narrow the filters</li>`;
      }
    }
  }

  filterEls.forEach((el) =>
    el.addEventListener('change', () => {
      const key = el.dataset.filter as FilterKey;
      if (el.checked) active.add(key); else active.delete(key);
      render();
    }),
  );

  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        locateBtn.textContent = 'Location not supported';
        return;
      }
      const original = locateBtn.textContent;
      locateBtn.disabled = true;
      locateBtn.textContent = 'Locating…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 14);
          L.circleMarker([latitude, longitude], { radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9 })
            .addTo(layer)
            .bindPopup('Your location');
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
  }

  if (all.length) {
    const bounds = L.latLngBounds(all.map((f) => [f.lat, f.lon] as [number, number]));
    map.fitBounds(bounds.pad(0.15), { maxZoom: 13 });
  }
  map.on('zoomend', render);
  render();
  window.setTimeout(() => map.invalidateSize(), 200);
}

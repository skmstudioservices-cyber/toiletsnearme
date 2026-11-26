/* SKM first-party analytics beacon.
   Sends pageview, engagement, scroll depth, area visibility and click heatmap
   to skm-analytics.india-in.workers.dev/collect.
   Privacy: only a 7-character geohash is sent, never coordinates. */
(function () {
  var ENDPOINT = 'https://skm-analytics.india-in.workers.dev/collect';
  var SITE = location.hostname;
  if (navigator.doNotTrack === '1') return;

  var sid = sessionStorage.getItem('skm_sid');
  if (!sid) { sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); sessionStorage.setItem('skm_sid', sid); }

  var geohash = null;
  try { var g = localStorage.getItem('skm_gh'); if (g) geohash = g; } catch (e) {}

  function b32encode(lat, lon, len) {
    var B = '0123456789bcdefghjkmnpqrstuvwxyz', latR = [-90, 90], lonR = [-180, 180], out = '', bit = 0, ch = 0, even = true;
    while (out.length < len) {
      if (even) { var m = (lonR[0] + lonR[1]) / 2; if (lon >= m) { ch = ch * 2 + 1; lonR[0] = m; } else { ch = ch * 2; lonR[1] = m; } }
      else { var m2 = (latR[0] + latR[1]) / 2; if (lat >= m2) { ch = ch * 2 + 1; latR[0] = m2; } else { ch = ch * 2; latR[1] = m2; } }
      even = !even; if (++bit === 5) { out += B[ch]; bit = 0; ch = 0; }
    }
    return out;
  }

  if (navigator.geolocation && !geohash) {
    navigator.geolocation.getCurrentPosition(function (p) {
      geohash = b32encode(p.coords.latitude, p.coords.longitude, 7);
      try { localStorage.setItem('skm_gh', geohash); } catch (e) {}
    }, function () {}, { timeout: 6000, maximumAge: 3600000 });
  }

  var queue = { pageviews: [], events: [], heatmap: [], areas: [] };

  /* Facility clicks — which toilet someone actually opened, and in what state
     of the UI (zoom, active filters, search term). Answers "is the map doing
     anything" instead of "did anyone move a mouse". */
  window.addEventListener('skm:facility', function (ev) {
    var d = ev.detail || {};
    if (queue.events.length < 100) {
      queue.events.push({ type: 'facility_click', path: location.pathname, at: new Date().toISOString(), facility: d });
    }
  });

  /* UI layout snapshot — geometry of the key blocks at the moment of load.
     When a design change moves a block, the top/height here changes, so any
     drop in engagement or click volume can be tied to a real layout shift
     instead of guessed at. */
  function layoutSnapshot() {
    var out = [];
    var sel = ['header', 'main > section', '.facility-map', '#india-map', 'form', 'footer', '.stat-strip', '.faq'];
    sel.forEach(function (s) {
      var els = document.querySelectorAll(s);
      for (var i = 0; i < els.length && i < 6; i++) {
        var r = els[i].getBoundingClientRect();
        out.push({ sel: s, i: i, top: Math.round(r.top + window.scrollY), h: Math.round(r.height), w: Math.round(r.width), visible: r.height > 0 });
      }
    });
    return out;
  }
  var layout = [];
  function takeLayout() { try { layout = layoutSnapshot(); } catch (e) { layout = []; } }
  if (document.readyState === 'complete') takeLayout(); else window.addEventListener('load', takeLayout);
  var entered = Date.now(), maxScroll = 0, areas = {};

  function areaName(el) {
    if (el.id) return '#' + el.id;
    var c = el.className && String(el.className).split(' ')[0];
    return (el.tagName.toLowerCase()) + (c ? '.' + c : '');
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var n = areaName(en.target);
        var rec = areas[n] || (areas[n] = { area_name: n, visible_ms: 0, clicks: 0, _in: 0 });
        if (en.isIntersecting) { rec._in = Date.now(); }
        else if (rec._in) { rec.visible_ms += Date.now() - rec._in; rec._in = 0; }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('main > *, section, header, footer, .facility-map, form').forEach(function (el) { io.observe(el); });
  }

  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = Math.round((h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100);
    if (pct > maxScroll) maxScroll = Math.min(100, pct);
  }, { passive: true });

  document.addEventListener('click', function (e) {
    var x = Math.round((e.clientX / Math.max(1, window.innerWidth)) * 100);
    var y = Math.round(((e.clientY + window.scrollY) / Math.max(1, document.documentElement.scrollHeight)) * 100);
    if (queue.heatmap.length < 200) queue.heatmap.push({ path: location.pathname, x_pct: x, y_pct: Math.min(100, y), kind: 'click' });
  }, true);

  function send() {
    var now = new Date();
    var dur = Date.now() - entered;
    queue.pageviews.push({ path: location.pathname, title: document.title, entered_at: new Date(entered).toISOString(), left_at: now.toISOString(), engaged_ms: dur, scroll_max_pct: maxScroll });
    Object.keys(areas).forEach(function (k) { queue.areas.push({ area_name: k, visible_ms: areas[k].visible_ms, clicks: areas[k].clicks }); });
    var payload = {
      site: SITE,
      session: { id: sid, started_at: new Date(entered).toISOString(), landing_path: location.pathname, referrer: document.referrer || null, geohash: geohash, geo_source: geohash ? 'browser' : 'edge', device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop' },
      pageviews: queue.pageviews, events: queue.events, heatmap: queue.heatmap, areas: queue.areas,
      layout: layout,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }
    };
    try {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
      fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(function () {});
    } catch (err) {}
  }

  window.addEventListener('pagehide', send);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(); });
})();

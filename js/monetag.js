/**
 * monetag.js — conditional Monetag ad loader for SKM sites.
 *
 * RULE (user, 18 Oct 2026): ZERO ad markup renders until a zone is set.
 * Set window.SKM_MONETAG_ZONE (or the AD_CLIENT build var) to activate.
 *
 * Usage in a page:
 *   <script>window.SKM_MONETAG_ZONE = "1234567";</script>
 *   <script src="/js/monetag.js" defer></script>
 *
 * If SKM_MONETAG_ZONE is empty/undefined -> this script does nothing at all
 * (no network call, no ad element). Safe for AdSense-policy compliance too.
 */
(function () {
  'use strict';
  try {
    var ZONE = (window.SKM_MONETAG_ZONE || '').toString().trim();
    if (!ZONE || !/^\d{3,}$/.test(ZONE)) return;           // no zone -> no ads, ever
    if (navigator.doNotTrack === '1') return;               // respect DNT
    if (location.pathname.indexOf('/privacy') === 0) return; // never on privacy pages

    // Monetag Multitag / zone loader. The zone id is the only value needed.
    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = 'https://upgulpinon.com/1?z=' + encodeURIComponent(ZONE);
    document.head.appendChild(s);
  } catch (e) { /* ads must never break the page */ }
})();

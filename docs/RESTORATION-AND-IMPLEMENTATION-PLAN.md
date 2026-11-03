# Toilets Near Me — Restoration & Implementation Plan

**Status:** Phase 0 audit started; implementation not yet production-verified  
**Primary branch:** `main` · **Production:** https://toiletsnearme.pages.dev  
**Stack:** Astro 7, Tailwind CSS 4, Leaflet, Cloudflare Pages (GitHub deployment)

## Product direction

Rebuild the current Astro site as a faithful, deeper and more maintainable continuation of the original Toilets Near Me experience. This is not a replacement brand or a thin directory. Preserve the original identity, useful legacy pages, map behaviours, data, URLs, search intent, Monetag integration and PWA assets while improving component architecture, accessibility, mobile experience, navigation and content quality.

## Non-negotiable constraints

1. Commit implementation directly to `main`; do not create new feature branches.
2. Keep the original logo, favicon, brand palette and recognizable UI. Verify against the archived site before changing.
3. Preserve public URLs and redirects. Do not remove or rename pages without a redirect and an SEO reason.
4. Preserve source data and OpenStreetMap attribution/licensing. Never fabricate facilities, hours, prices, accessibility, ratings or reviews.
5. Preserve Monetag and analytics unless a deliberate, tested change is approved. Ads must not cover map controls.
6. The map is a reusable component, not inline page-specific code.
7. Keep map, filters, search, DIGIPIN, directions and reporting working on desktop and mobile.
8. Deploy only after build, route, asset, map and responsive checks pass. A commit is not proof of deployment.
9. Keep historical source as recovery material until all required features/assets have been identified and preserved.

## Phase 0 — Baseline, recovery and inventory

- Record the current `main` SHA and inspect recent commits before each edit batch.
- Compare the archived pre-Astro site and `astro-migration` reference with current `main`.
- Inventory legacy pages, city datasets, keyword guides, images, logo variants, favicons, CSS, scripts, map configuration, PWA files, redirects and Monetag snippets.
- Build a route inventory: old URL → current Astro URL → expected status/redirect.
- Record dataset counts and per-city feature counts; validate GeoJSON structure and coordinates.
- Capture production screenshots at mobile, tablet and desktop sizes.
- Establish Lighthouse/Core Web Vitals and Search Console baselines when exports are available.

**Acceptance:** inventory is recorded; no existing URL, dataset or integration is removed during the audit.

## Phase 1 — Brand and shared site shell

Create reusable Astro components:
- `SiteHeader`: original logo, responsive navigation, accessible mobile menu.
- `SiteFooter`: about/privacy/contact, OSM attribution and useful internal links.
- `BrandLogo`: single source for logo variants and accessible alt text.
- `BaseLayout` / SEO head: title, description, canonical, robots, OG/Twitter metadata and JSON-LD.
- `AdSlot`: reserved layout space and safe Monetag placement; never overlays map controls.
- `Breadcrumbs`, `Button`, `Card`, `Badge`, `SectionHeading`, `EmptyState`, `LoadingState`.

Use original brand colours and spacing as design tokens in `src/styles/global.css`. Keep the existing analytics measurement ID and Monetag zone/meta configuration intact while verifying the third-party service-worker integration.

**Acceptance:** consistent branding across page types; favicon, manifest, OG image and touch icons load; keyboard navigation and contrast checked.

## Phase 2 — Reusable map system (first functional milestone)

Extract the map from the city page into reusable components:
- `MapSection.astro`: semantic wrapper, heading, helper text and status area.
- `ToiletMap.astro`: Leaflet container and client-side entry point.
- `MapControls.astro`: search, filters, locate-me, map theme and reset.
- Facility popup: escaped details, DIGIPIN copy and route action.
- `MapLegend`: free / paid / unknown markers and OSM data limitations.

Use a typed configuration/data contract between Astro and browser code. Reuse `public/mapapp.js` only after auditing and adapting it to Astro; do not load a script that expects missing DOM elements or missing data assets.

**Critical audit finding:** current city GeoJSON files are in repository-root `data/*.json`, while the legacy map script fetches `/data/<city>.json`. The current tree has no `public/data/`. Fix this explicitly with a build-time copy/validation step or a controlled Astro data endpoint before relying on the legacy all-city map loader.

Implement in order:
1. Reliable map/tile initialization, loading/error/empty states and OSM attribution.
2. City-specific and all-city datasets, with clustering or viewport rendering for large datasets.
3. Search and filters for known tags: free/paid/unknown, 24-hour, wheelchair, gender facilities, baby changing, water/soap and other recorded attributes.
4. Locate-me with explicit permission, accuracy feedback and safe fallback.
5. DIGIPIN encode/decode; validate against known reference vectors.
6. Route-to-pin with walking/cycling/driving, route line, distance, ETA, rerouting and provider attribution.
7. Optional voice guidance after route steps and permissions are stable.
8. Report/suggest facility with abuse controls; do not imply submissions are live until moderation/storage exists.

**Acceptance:** map works on intended pages; counts reconcile; no failed data requests; filters are correct; mobile controls remain usable.

## Phase 3 — City pages and useful content depth

Use structured page components:
- City hero and breadcrumb.
- City-specific map.
- Verified data summary with “not recorded” explanation.
- Facility attribute breakdown based only on source tags.
- Neighbourhood navigation only where data supports it.
- Facility-type sections (stations, malls, petrol pumps, parks) only when evidence exists.
- Useful FAQs, related city/guide links and data freshness/source notes.

Avoid thin programmatic pages. Each indexable guide must provide distinct local information, not merely swap a city name into repeated text. Preserve useful legacy keyword pages and improve them in place.

## Phase 4 — PWA and offline resilience

- Audit manifest, icons and service-worker registration before modifying.
- Keep one deliberate service-worker strategy.
- Cache app shell and essential assets safely.
- Provide honest offline states; do not claim live map tiles/routing work offline unless tested.
- Add install guidance and update handling.
- Test iOS/Android install behaviour and storage limits.

## Phase 5 — Community, data quality and payments

- Define facility schema with source, source ID, coordinates, last-verified time and confidence.
- Add user reports through moderation, rate limits and spam protection.
- Ratings/reviews require persistent storage, moderation and privacy controls.
- Payment UI only after a real provider, merchant account, settlement and refund flow are configured. Never fake a payment action.
- Distinguish OSM facts, community reports and operator-confirmed information.

## Phase 6 — SEO, URLs, performance and scale

- Preserve canonical URLs and test 301 redirects for legacy paths.
- Validate sitemap, robots, canonical tags, structured data and internal links.
- Retain valuable guides; avoid mass near-duplicate pages.
- Optimize large GeoJSON (simplification, per-city chunks, compression, viewport loading) without losing required detail.
- Use clustering or canvas/vector rendering for dense datasets.
- Lazy-load map code where appropriate; avoid loading every city's full GeoJSON on first paint.
- Optimize images, dimensions and formats.
- Monitor Core Web Vitals, errors, map-data requests and Search Console.

## Phase 7 — Verification and release

Before production:
- Astro production build succeeds on configured Node.
- All routes return expected status.
- Every image, logo, icon, CSS, JS, manifest and data URL loads.
- Representative small and large city maps show expected markers.
- Search, filters, DIGIPIN, locate-me permission success/denial, route modes and mobile controls pass.
- Monetag and analytics remain present and do not obstruct controls.
- Responsive screenshots at 390px, 768px and 1280px; no horizontal overflow.
- Accessibility basics: labels, keyboard, focus, contrast, reduced motion and screen-reader names.
- Cloudflare Pages deployment for `main` succeeds; verify the deployed site in a real browser after cache propagation.
- Preserve a rollback commit and report exact test results and limitations.

## Target component structure

```text
src/
  components/
    brand/BrandLogo.astro
    layout/SiteHeader.astro
    layout/SiteFooter.astro
    layout/Breadcrumbs.astro
    map/MapSection.astro
    map/ToiletMap.astro
    map/MapControls.astro
    map/MapLegend.astro
    map/MapStatus.astro
    facility/FacilityCard.astro
    facility/FacilityAttributes.astro
    seo/JsonLd.astro
    ui/Button.astro
    ui/Card.astro
    ui/Badge.astro
  layouts/Base.astro
  lib/
    cities.ts
    geojson.ts
    digipin.ts
    map-config.ts
    routes.ts
  pages/
    index.astro
    [city]/index.astro
    ...
  styles/global.css
public/
  images/
  icons/
  mapapp.js (only if retained as the audited shared client module)
scripts/
  prepare-data.mjs
docs/
  RESTORATION-AND-IMPLEMENTATION-PLAN.md
  ROUTE-INVENTORY.md
  LEGACY-FEATURE-INVENTORY.md
```

This is a target structure, not a requirement to move every file immediately. Refactor in small, tested increments.

## Immediate execution order

1. Finish legacy asset/feature/route inventory and verify the old logo and palette.
2. Resolve the `data/*.json` versus `/data/*.json` delivery mismatch.
3. Extract the existing city map into a reusable Astro map component.
4. Restore legacy map interactions incrementally, testing each one.
5. Restore the homepage as useful map-first discovery while retaining city and guide links.
6. Run CI and browser checks; deploy only after they pass.

## Current audit notes — 3 November 2026

- `main` uses Astro 7.4.4, Tailwind 4 and Leaflet.
- `src/pages/index.astro` currently renders city cards and informational cards; it does not render the main interactive map.
- `src/pages/[city]/index.astro` has a simple inline Leaflet map, not the complete legacy interaction system.
- `public/mapapp.js` contains legacy capabilities including city-data loading, clustering fallback, DIGIPIN, search/geocoding, routing controls and UI parity helpers. It needs compatibility and security review before reuse.
- Root `data/` contains city GeoJSON and a large attributes dataset. The public tree has no `public/data/`, although the legacy loader requests it.
- `Base.astro` imports global CSS and contains Monetag meta/script, favicon/manifest, JSON-LD and Google Analytics.
- `public/sw.js` imports a third-party service worker from `5gvci.com`; confirm its purpose and compatibility before replacing/extending it.
- Pre-Astro HTML pages and assets remain in Git history / `astro-migration` reference branch. Active branches currently include `main`, `astro-migration` and `toilets-near-me-redesign`. Work targets `main`; historical source remains reference until inventory and recovery are complete.
- Existing CI workflows include SEO/PWA/Monetag and browser checks; their live-site assumptions must be reviewed before treating them as proof of a new build.

## Progress log

- [x] Confirmed current Astro/Tailwind/Leaflet stack and key page files.
- [x] Located legacy map engine and current GeoJSON source directory.
- [x] Identified missing public data path expected by legacy map engine.
- [x] Added this restoration and implementation plan to the repository.
- [ ] Compare original brand assets and legacy homepage/map markup in detail.
- [ ] Fix and test data asset delivery.
- [ ] Extract and restore reusable map components.
- [ ] Complete functional, SEO, responsive and deployment verification.

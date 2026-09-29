# Site Structure & Incremental Improvement Protocol

This file is the contract for how this site is built. Read it before changing anything.
Goal: improve incrementally — one thing at a time, never break seven things while building one.

## Page types (5)

| Type | Path | Must-keep blocks (never remove) |
|---|---|---|
| Home | `/index.html` | header, hero (h1 + search `#q` + chips `#chips`), mapbar (`#count`, `#routeinfo`, `#filters`, `#addbtn`), `#addhint`, `#map`, legend, all guide cards, city grid, footer |
| City | `/<city>/index.html` | same as home + `#citycount` in hero + startCity in CFG |
| Keyword guide | `/<slug>/index.html` | Quick-answer block, all `<h2>` section cards, map card (`#kwmap`, `#kwchips`, `#kwnear`, `#kwcount`), FAQ, related-guides chips, city grid, freshness line, JSON-LD (FAQPage + BreadcrumbList) |
| Privacy | `/privacy/` | all policy cards |
| About | `/about/` | all about cards |

Every page: `<footer>` with Privacy + About links, `feedback.js` include, canonical, robots index.

## File roles

- `mapapp.js` — the ONE shared map engine (all page types). Clusters, rich popups, place/pincode/DIGIPIN search, origin-based routing. Do not fork it per page.
- `feedback.js` — feedback popup (voice/text/quick buttons) → Supabase per-site table. Publishable key only.
- `data/<city>.json` — OSM features per city (generated, never hand-edit). `data/manifest.json` — counts.
- `scripts/fetch_data.py` — Overpass → data/*.json (run by Actions, monthly + manual).
- `.github/workflows/data-refresh.yml` — data refresh + auto-commit.
- `scripts/prediff_check.py` — pre-deploy regression gate (see below).
- `sitemap.xml`, `robots.txt`, `llms.txt` — SEO plumbing; update on page add/remove.

## DOM id contract (mapapp.js ↔ pages)

Home/city: `#map #count #routeinfo #filters #q #chips #locbtn #addbtn #addhint #toast #citycount #origin #origingo #originme`
Keyword embed: `#kwmap #kwchips #kwnear #kwcount #kwq`
Feedback: `#fbkx #fbktxt #fbkmic #fbkok #fbkno #fbkst #fbkqk`
If you rename any of these, update mapapp.js/feedback.js in the SAME change.

## Pre-deploy regression gate (MANDATORY)

Before pushing any HTML change, run:

    python3 scripts/prediff_check.py old.html new.html

It extracts every structural block (headings, cards, script srcs, ids, links, JSON-LD) and reports anything PRESENT IN OLD BUT MISSING IN NEW. Any removal must be intentional and explained in the commit message. Never push with unexpected removals.

Workflow for every change:
1. Pull current file from the repo (never edit from memory).
2. Build the new version.
3. `prediff_check.py old new` → zero unexpected removals.
4. JS changed → `node --check`.
5. Push (one purpose per push, neutral commit message).
6. Live-verify after deploy (fresh `?cb=` fetch).

## Public repo rules (this repo stays public for the 30–90 day build phase)

- Secrets NEVER live here. Only publishable keys (Supabase `sb_publishable_*`, GA ids) — insert-only, no read access.
- No user/visitor data, no internal logs, no customer data in this repo or its issues.
- Commit messages: neutral, content-descriptive. No internal process details.
- Data is OpenStreetMap (ODbL) — keep the attribution in footers and map tiles.

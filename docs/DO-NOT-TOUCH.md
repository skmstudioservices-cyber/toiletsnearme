# DO NOT TOUCH — frozen files

Read this before editing anything on this site. Every entry below is a thing
that has already broken something.

## The rule

If a file is listed here, you may change it only when the owner asks for that
exact change in that exact conversation. A cron, a sweep, an audit or an
"improvement" may **not** touch it.

Why: between 25 and 26 Nov 2026 the homepage title was rewritten **five times in
twenty hours** by five different well-meant changes. Google could not settle on a
snippet and "washroom near me" fell from position 4.1 to 8.3. The churn cost more
than any single change gained.

## Frozen

| File | What is frozen | Why |
|---|---|---|
| `src/pages/index.astro` | the `<Base title={...}>` and `description={...}` lines | five rewrites in 20 hours cost a ranking phrase |
| `src/layouts/Base.astro` | the `google-site-verification` meta line | removing it revoked GSC ownership on 26 Nov |
| `src/pages/cities/index.astro` | PAGE_SIZE, the `hidden`-attribute filter, the trailing slash on `/cities/` | pagination and the homepage search share the same attribute |
| `public/beacon.js` | the payload shape (`site`, `session`, `pageviews`, `events`, `heatmap`, `areas`, `layout`, `viewport`) | the collector reads these field names; renaming silently drops data |
| `scripts/preflight.mjs` | the checks themselves | this is the gate that stops a bad deploy reaching production |

## Before you change a title or meta

1. Check `git log -5 -- src/pages/index.astro`. If it changed in the last 14 days, stop.
2. One change, then fourteen days of quiet. Not two changes in a week.
3. Never remove a phrase that is currently ranking. Add to it.

## If you must change a frozen file

- Say which file, what line, why, and what the rollback is.
- Commit the reason in the message.
- Watch the next 48 hours of GSC before touching anything else on that page.

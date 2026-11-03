# Legacy archive

The pre-Astro static HTML site (121 hand-generated pages, Python generators) was removed from the repo root on 3 Nov 2026 when the site moved to Astro 7.4.4 + Tailwind 4.

It is preserved in git history and on the `astro-migration` branch:

- `git log --before=2026-11-03 -- '*/index.html'`
- branch `astro-migration`

Nothing in this folder is deployed: Cloudflare Pages now publishes only the Astro build output (`dist/`).

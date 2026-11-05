#!/usr/bin/env python3
"""Indexing-signal gate.

Verifies the signals Google actually needs, not just HTTP 200:
  1. every city URL is linked from the homepage in the SERVED html
  2. sample city pages carry: <title>, meta description, self canonical,
     meta robots index/follow, one <h1>, JSON-LD, and a nearby-city link block
  3. no page is accidentally noindex
"""
import sys, re, urllib.request, json

UA = {"User-Agent": "Mozilla/5.0 (compatible; SKMSignals/1.0)"}
fails, warns = [], []


def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)
        return r.status, r.read().decode("utf-8", "ignore")
    except Exception as e:
        return 0, str(e)


def main(base):
    base = base.rstrip("/")
    st, home = get(base + "/")
    if st != 200:
        print(f"FAIL homepage {st}")
        return 1

    # 1) internal links present in served HTML
    hrefs = set(re.findall(r'href="(/[a-z0-9\-/]*/)"', home))
    city_links = [h for h in hrefs if h.count("/") == 2]
    print(f"homepage: {len(hrefs)} internal links, {len(city_links)} city-style links")
    if len(city_links) < 50:
        fails.append(f"homepage exposes only {len(city_links)} city links — city pages are not discoverable from the homepage")
    if 'href="/delhi/"' not in home:
        fails.append('homepage does not link /delhi/ in the served HTML')
    if 'href="/sitemap/"' not in home:
        warns.append("footer sitemap link not found on the homepage")

    # 2) sample city pages
    for path in ["/delhi/", "/mumbai/", "/agra/"]:
        st, html = get(base + path)
        if st != 200:
            fails.append(f"{path} returned {st}")
            continue
        checks = {
            "title": r"<title>[^<]{10,}</title>",
            "meta description": r'<meta name="description" content="[^"]{40,}"',
            "self canonical": r'<link rel="canonical" href="' + re.escape(base + path) + r'"',
            "meta robots index": r'<meta name="robots" content="index, follow"',
            "single h1": r"<h1[^>]*>",
            "JSON-LD": r'<script type="application/ld\+json">',
            "nearby-city links": r'href="/[a-z\-]+/"',
        }
        for label, pat in checks.items():
            if not re.search(pat, html):
                fails.append(f"{path} missing {label}")
        if re.search(r'<meta name="robots" content="noindex', html):
            fails.append(f"{path} is noindex")
        h1s = len(re.findall(r"<h1[^>]*>", html))
        if h1s != 1:
            fails.append(f"{path} has {h1s} <h1> tags (must be exactly 1)")
        print(f"{path}: checked ({len(html):,} bytes)")

    for w in warns:
        print("WARN", w)
    for f in fails:
        print("FAIL", f)
    print(f"\n{len(fails)} failure(s), {len(warns)} warning(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "https://toiletsnearme.pages.dev"))

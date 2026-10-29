#!/usr/bin/env python3
"""Interlinking: nearby cities (by real distance), same-state cluster,
cross-site links (toilets/washrooms/rest areas) and guide links."""
import json, os, re, html, math

ROOT = os.environ.get("REPO", ".")
SITE = os.environ.get("SITE", "https://toiletsnearme.pages.dev")
NOUN = os.environ.get("NOUN", "toilets")
NET = [("https://toiletsnearme.pages.dev", "Toilets"),
       ("https://washroomsnearme.pages.dev", "Washrooms"),
       ("https://restareanearme.pages.dev", "Highway rest areas")]
GUIDES = [("/free-public-toilets-near-me/", "Free public toilets near me"),
          ("/pay-and-use-toilets-near-me/", "Pay and use toilets near me"),
          ("/public-toilets-near-me-open-now/", "Public toilets open now"),
          ("/sulabh-toilets-near-me/", "Sulabh toilets near me"),
          ("/public-toilets-at-malls/", "Toilets at malls"),
          ("/toilets-at-railway-stations/", "Toilets at railway stations"),
          ("/wheelchair-accessible-toilets-near-me/", "Wheelchair accessible toilets"),
          ("/toilets-at-petrol-pumps/", "Toilets at petrol pumps")]

def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    d = 2 * math.asin(math.sqrt(math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))
    return 6371 * d

def main():
    man = json.load(open(os.path.join(ROOT, "data", "manifest.json")))["cities"]
    info = {}
    for slug in man:
        p = os.path.join(ROOT, slug, "index.html")
        dp = os.path.join(ROOT, "data", f"{slug}.json")
        if not os.path.exists(p): continue
        h = open(p).read()
        m = re.search(r'"addressRegion":\s*"([^"]+)"', h)
        state = m.group(1) if m else ""
        # centroid from features
        lat = lon = None
        if os.path.exists(dp):
            try:
                feats = json.load(open(dp)).get("features", [])
                pts = [f["geometry"]["coordinates"] for f in feats if f.get("geometry")]
                if pts:
                    lon = sum(x[0] for x in pts)/len(pts); lat = sum(x[1] for x in pts)/len(pts)
            except Exception: pass
        if lat is None:
            g = re.search(r'"latitude":\s*([\d.]+),\s*"longitude":\s*([\d.]+)', h)
            if g: lat, lon = float(g.group(1)), float(g.group(2))
        info[slug] = {"name": man[slug]["name"], "n": man[slug]["n"], "state": state, "lat": lat, "lon": lon}
    print(f"parsed {len(info)} cities ({sum(1 for v in info.values() if v['lat'] is not None)} with coords)")

    done = 0
    for slug, c in info.items():
        if c["lat"] is None: continue
        p = os.path.join(ROOT, slug, "index.html")
        h = open(p).read()
        # nearby by distance
        near = []
        for s2, c2 in info.items():
            if s2 == slug or c2["lat"] is None: continue
            d = hav((c["lat"], c["lon"]), (c2["lat"], c2["lon"]))
            if d <= 400: near.append((d, s2, c2))
        near.sort()
        near = near[:6]
        same = [(s2, c2) for s2, c2 in info.items() if s2 != slug and c2["state"] == c["state"]][:10]
        near_html = "".join(f'<a href="/{s}/">{html.escape(c2["name"])} ({c2["n"]})</a>' for _, s, c2 in near)
        same_html = "".join(f'<a href="/{s}/">{html.escape(c2["name"])} ({c2["n"]})</a>' for s, c2 in same)
        net_html = "".join(f'<a href="{u}/{slug}/">{html.escape(lbl)} in {html.escape(c["name"])}</a>' for u, lbl in NET)
        guide_html = "".join(f'<a href="{u}">{html.escape(lbl)}</a>' for u, lbl in GUIDES)
        block = f'''<div class="card" id="block-interlink-{slug}"><h2>🧭 Nearby cities &amp; related pages</h2>
<h3>Cities within 400 km of {html.escape(c["name"])}</h3><div class="cities">{near_html or "<i>None mapped yet</i>"}</div>
<h3>More {NOUN} in {html.escape(c["state"] or "this state")}</h3><div class="cities">{same_html or "<i>None yet</i>"}</div>
<h3>Also on our network</h3><div class="cities">{net_html}</div>
<h3>Guides</h3><div class="cities">{guide_html}</div></div>'''
        h = re.sub(r'<div class="card" id="block-interlink-.*?</div>\s*</div>', "", h, flags=re.S)
        if "</main>" in h: h = h.replace("</main>", block + "\n</main>", 1)
        else: h = h.replace("</body>", block + "\n</body>", 1)
        open(p, "w").write(h)
        done += 1
    print(f"interlink block added to {done} city pages")

    # homepage: all cities grouped by state
    idx = os.path.join(ROOT, "index.html")
    if os.path.exists(idx):
        h = open(idx).read()
        by_state = {}
        for s, c in info.items(): by_state.setdefault(c["state"] or "India", []).append((s, c))
        parts = []
        for st in sorted(by_state):
            links = "".join(f'<a href="/{s}/">{html.escape(c["name"])} ({c["n"]})</a>'
                            for s, c in sorted(by_state[st], key=lambda x: -x[1]["n"]))
            parts.append(f'<h3>{html.escape(st)}</h3><div class="cities">{links}</div>')
        block = ('<div class="card" id="block-all-cities"><h2>🗺 All cities by state</h2>'
                 + "".join(parts) + '</div>')
        h = re.sub(r'<div class="card" id="block-all-cities">.*?</div>\s*</div>\s*</div>', "", h, flags=re.S)
        if "</main>" in h: h = h.replace("</main>", block + "\n</main>", 1)
        else: h = h.replace("</body>", block + "\n</body>", 1)
        open(idx, "w").write(h)
        print(f"homepage: all {len(info)} cities grouped into {len(by_state)} states")

if __name__ == "__main__":
    main()

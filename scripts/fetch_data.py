#!/usr/bin/env python3
"""Fetch OSM data via Overpass and write city-wise GeoJSON into data/."""
import json, math, os, sys, time, urllib.request, urllib.parse

CITIES = {"delhi": ["Delhi NCR", 28.61, 77.21, 0.38], "mumbai": ["Mumbai", 19.08, 72.88, 0.32], "bengaluru": ["Bengaluru", 12.97, 77.59, 0.3], "hyderabad": ["Hyderabad", 17.39, 78.49, 0.3], "chennai": ["Chennai", 13.08, 80.27, 0.28], "kolkata": ["Kolkata", 22.57, 88.36, 0.3], "pune": ["Pune", 18.52, 73.86, 0.26], "ahmedabad": ["Ahmedabad", 23.03, 72.58, 0.26], "jaipur": ["Jaipur", 26.91, 75.79, 0.24], "lucknow": ["Lucknow", 26.85, 80.95, 0.24], "surat": ["Surat", 21.17, 72.83, 0.22], "indore": ["Indore", 22.72, 75.86, 0.22]}
QUERY = "[\"amenity\"=\"toilets\"]"
MIN_TOTAL = 300

def bbox(lat, lon, r):
    return (lat - r, lon - r, lat + r, lon + r)

parts = []
for slug, (name, lat, lon, r) in CITIES.items():
    s, w, n, e = bbox(lat, lon, r)
    for typ in ("node", "way"):
        parts.append('%s%s(%s,%s,%s,%s);' % (typ, QUERY, s, w, n, e))
q = "[out:json][timeout:180];(" + "".join(parts) + ");out center tags;"

url = "https://overpass-api.de/api/interpreter"
req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(),
                             headers={"User-Agent": "SKM-OSM-pipeline/1.0 (github)"})
print("querying overpass...")
data = json.loads(urllib.request.urlopen(req, timeout=200).read().decode())
els = data.get("elements", [])
print("total elements:", len(els))

def dist(a, b, c, d):
    return math.hypot(a - c, (b - d) * 0.78)

best = {}
for el in els:
    la, lo = el.get("lat"), el.get("lon")
    if la is None:
        c = el.get("center") or {}
        la, lo = c.get("lat"), c.get("lon")
    if la is None:
        continue
    tags = el.get("tags") or {}
    bc, bd, bs = None, 1e9, None
    for slug, (name, clat, clon, r) in CITIES.items():
        d = dist(la, lo, clat, clon)
        if d < bd:
            bd, bc, bs = d, slug, (clat, clon, r)
    if bc is None or bd > 1.2:
        continue
    f = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lo, 6), round(la, 6)]},
         "properties": {k: v for k, v in tags.items() if k in ["name", "operator", "opening_hours", "access", "fee", "wheelchair", "changing_table", "toilets:wheelchair", "indoor", "female", "male", "description"]}}
    best.setdefault(bc, []).append(f)

os.makedirs("data", exist_ok=True)
manifest = {}
total = 0
for slug, feats in best.items():
    fc = {"type": "FeatureCollection", "features": feats}
    with open("data/%s.json" % slug, "w") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    manifest[slug] = {"name": CITIES[slug][0], "n": len(feats)}
    total += len(feats)
    print(slug, len(feats))
with open("data/manifest.json", "w") as f:
    json.dump({"cities": manifest, "generated": time.strftime("%Y-%m-%d")}, f, ensure_ascii=False)
print("TOTAL:", total)
if total < MIN_TOTAL:
    print("TOO FEW — aborting, not wiping existing data")
    sys.exit(1)

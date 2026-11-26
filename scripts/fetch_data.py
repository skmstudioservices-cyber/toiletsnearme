#!/usr/bin/env python3
"""Fetch OSM data via Overpass and write city-wise GeoJSON into data/."""
import json, math, os, sys, time, urllib.request, urllib.parse

CITIES = {"delhi": ["Delhi", 28.61, 77.21, 0.38], "mumbai": ["Mumbai", 19.08, 72.88, 0.32], "bengaluru": ["Bengaluru", 12.97, 77.59, 0.3], "hyderabad": ["Hyderabad", 17.39, 78.49, 0.3], "chennai": ["Chennai", 13.08, 80.27, 0.28], "kolkata": ["Kolkata", 22.57, 88.36, 0.3], "pune": ["Pune", 18.52, 73.86, 0.26], "ahmedabad": ["Ahmedabad", 23.03, 72.58, 0.26], "jaipur": ["Jaipur", 26.91, 75.79, 0.24], "lucknow": ["Lucknow", 26.85, 80.95, 0.24], "surat": ["Surat", 21.17, 72.83, 0.22], "indore": ["Indore", 22.72, 75.86, 0.22], "chandigarh": ["Chandigarh", 30.73, 76.78, 0.2], "bhopal": ["Bhopal", 23.26, 77.41, 0.22], "nagpur": ["Nagpur", 21.15, 79.09, 0.22],
    "agra": ["Agra", 27.18, 78.01, 0.30],
    "ajmer": ["Ajmer", 26.45, 74.64, 0.30],
    "aligarh": ["Aligarh", 27.9, 78.08, 0.30],
    "alwar": ["Alwar", 27.55, 76.63, 0.30],
    "ambala": ["Ambala", 30.38, 76.78, 0.30],
    "amravati": ["Amravati", 20.93, 77.75, 0.30],
    "amritsar": ["Amritsar", 31.63, 74.87, 0.30],
    "anand": ["Anand", 22.56, 72.95, 0.30],
    "asansol": ["Asansol", 23.68, 86.98, 0.30],
    "aurangabad": ["Aurangabad", 19.88, 75.34, 0.30],
    "ballari": ["Ballari", 15.14, 76.92, 0.30],
    "bareilly": ["Bareilly", 28.37, 79.43, 0.30],
    "bathinda": ["Bathinda", 30.21, 74.94, 0.30],
    "belagavi": ["Belagavi", 15.85, 74.5, 0.30],
    "bhagalpur": ["Bhagalpur", 25.24, 86.97, 0.30],
    "bharuch": ["Bharuch", 21.7, 72.99, 0.30],
    "bhavnagar": ["Bhavnagar", 21.76, 72.15, 0.30],
    "bhilai": ["Bhilai", 21.19, 81.35, 0.30],
    "bhilwara": ["Bhilwara", 25.35, 74.64, 0.30],
    "bhubaneswar": ["Bhubaneswar", 20.3, 85.82, 0.30],
    "bikaner": ["Bikaner", 28.02, 73.31, 0.30],
    "bilaspur": ["Bilaspur", 22.08, 82.15, 0.30],
    "bokaro": ["Bokaro", 23.67, 86.15, 0.30],
    "chandrapur": ["Chandrapur", 19.95, 79.3, 0.30],
    "coimbatore": ["Coimbatore", 11.02, 76.96, 0.30],
    "cuttack": ["Cuttack", 20.46, 85.88, 0.30],
    "darbhanga": ["Darbhanga", 26.15, 85.9, 0.30],
    "davanagere": ["Davanagere", 14.47, 75.92, 0.30],
    "dehradun": ["Dehradun", 30.32, 78.03, 0.30],
    "dhanbad": ["Dhanbad", 23.8, 86.43, 0.30],
    "dharamshala": ["Dharamshala", 32.22, 76.32, 0.30],
    "durgapur": ["Durgapur", 23.52, 87.31, 0.30],
    "erode": ["Erode", 11.34, 77.72, 0.30],
    "faridabad": ["Faridabad", 28.41, 77.31, 0.30],
    "gandhinagar": ["Gandhinagar", 23.22, 72.65, 0.30],
    "gaya": ["Gaya", 24.79, 85.0, 0.30],
    "ghaziabad": ["Ghaziabad", 28.67, 77.44, 0.30],
    "gorakhpur": ["Gorakhpur", 26.76, 83.37, 0.30],
    "guntur": ["Guntur", 16.31, 80.44, 0.30],
    "gurugram": ["Gurugram", 28.46, 77.03, 0.30],
    "guwahati": ["Guwahati", 26.14, 91.74, 0.30],
    "gwalior": ["Gwalior", 26.22, 78.18, 0.30],
    "hisar": ["Hisar", 29.15, 75.72, 0.30],
    "howrah": ["Howrah", 22.59, 88.31, 0.30],
    "hubballi": ["Hubballi", 15.36, 75.12, 0.30],
    "jabalpur": ["Jabalpur", 23.18, 79.99, 0.30],
    "jalandhar": ["Jalandhar", 31.33, 75.58, 0.30],
    "jalgaon": ["Jalgaon", 21.01, 75.56, 0.30],
    "jammu": ["Jammu", 32.73, 74.87, 0.30],
    "jamnagar": ["Jamnagar", 22.47, 70.06, 0.30],
    "jamshedpur": ["Jamshedpur", 22.8, 86.2, 0.30],
    "jhansi": ["Jhansi", 25.45, 78.57, 0.30],
    "jodhpur": ["Jodhpur", 26.24, 73.02, 0.30],
    "junagadh": ["Junagadh", 21.52, 70.46, 0.30],
    "kakinada": ["Kakinada", 16.99, 82.25, 0.30],
    "kalyan": ["Kalyan", 19.24, 73.13, 0.30],
    "kannur": ["Kannur", 11.87, 75.37, 0.30],
    "kanpur": ["Kanpur", 26.45, 80.33, 0.30],
    "karnal": ["Karnal", 29.69, 76.99, 0.30],
    "kochi": ["Kochi", 9.93, 76.27, 0.30],
    "kolhapur": ["Kolhapur", 16.7, 74.24, 0.30],
    "kollam": ["Kollam", 8.89, 76.61, 0.30],
    "kota": ["Kota", 25.21, 75.86, 0.30],
    "kozhikode": ["Kozhikode", 11.26, 75.78, 0.30],
    "kurnool": ["Kurnool", 15.83, 78.04, 0.30],
    "latur": ["Latur", 18.4, 76.57, 0.30],
    "ludhiana": ["Ludhiana", 30.9, 75.86, 0.30],
    "madurai": ["Madurai", 9.93, 78.12, 0.30],
    "mangaluru": ["Mangaluru", 12.91, 74.86, 0.30],
    "mathura": ["Mathura", 27.49, 77.67, 0.30],
    "meerut": ["Meerut", 28.98, 77.71, 0.30],
    "moradabad": ["Moradabad", 28.84, 78.77, 0.30],
    "muzaffarpur": ["Muzaffarpur", 26.12, 85.39, 0.30],
    "mysuru": ["Mysuru", 12.3, 76.65, 0.30],
    "nanded": ["Nanded", 19.15, 77.3, 0.30],
    "nashik": ["Nashik", 19.99, 73.79, 0.30],
    "navi-mumbai": ["Navi Mumbai", 19.03, 73.02, 0.30],
    "nellore": ["Nellore", 14.44, 79.99, 0.30],
    "noida": ["Noida", 28.54, 77.39, 0.30],
    "panipat": ["Panipat", 29.39, 76.96, 0.30],
    "patiala": ["Patiala", 30.34, 76.39, 0.30],
    "patna": ["Patna", 25.59, 85.14, 0.30],
    "prayagraj": ["Prayagraj", 25.44, 81.85, 0.30],
    "puducherry": ["Puducherry", 11.94, 79.83, 0.30],
    "raipur": ["Raipur", 21.25, 81.63, 0.30],
    "rajahmundry": ["Rajahmundry", 17.0, 81.8, 0.30],
    "rajkot": ["Rajkot", 22.3, 70.8, 0.30],
    "ranchi": ["Ranchi", 23.34, 85.31, 0.30],
    "rohtak": ["Rohtak", 28.9, 76.57, 0.30],
    "rourkela": ["Rourkela", 22.26, 84.85, 0.30],
    "saharanpur": ["Saharanpur", 29.97, 77.55, 0.30],
    "salem": ["Salem", 11.66, 78.15, 0.30],
    "sangli": ["Sangli", 16.85, 74.58, 0.30],
    "shillong": ["Shillong", 25.57, 91.88, 0.30],
    "shimla": ["Shimla", 31.1, 77.17, 0.30],
    "silchar": ["Silchar", 24.83, 92.78, 0.30],
    "siliguri": ["Siliguri", 26.73, 88.4, 0.30],
    "solapur": ["Solapur", 17.66, 75.91, 0.30],
    "srinagar": ["Srinagar", 34.08, 74.8, 0.30],
    "thane": ["Thane", 19.22, 72.98, 0.30],
    "thanjavur": ["Thanjavur", 10.79, 79.14, 0.30],
    "thiruvananthapuram": ["Thiruvananthapuram", 8.52, 76.94, 0.30],
    "thrissur": ["Thrissur", 10.53, 76.21, 0.30],
    "tiruchirappalli": ["Tiruchirappalli", 10.79, 78.7, 0.30],
    "tirunelveli": ["Tirunelveli", 8.71, 77.76, 0.30],
    "tirupati": ["Tirupati", 13.63, 79.42, 0.30],
    "udaipur": ["Udaipur", 24.58, 73.71, 0.30],
    "ujjain": ["Ujjain", 23.18, 75.78, 0.30],
    "vadodara": ["Vadodara", 22.31, 73.19, 0.30],
    "varanasi": ["Varanasi", 25.32, 82.97, 0.30],
    "vasai": ["Vasai", 19.39, 72.83, 0.30],
    "vellore": ["Vellore", 12.92, 79.13, 0.30],
    "vijayawada": ["Vijayawada", 16.51, 80.65, 0.30],
    "visakhapatnam": ["Visakhapatnam", 17.69, 83.22, 0.30],
    "warangal": ["Warangal", 17.97, 79.59, 0.30]
}
QUERY = "[\"amenity\"=\"toilets\"]"
MIN_TOTAL = 300
KEEP = ["name", "operator", "opening_hours", "access", "fee", "wheelchair", "changing_table", "toilets:wheelchair", "indoor", "female", "male", "description"]

def bbox(lat, lon, r):
    return (lat - r, lon - r, lat + r, lon + r)

# 130 cities in one Overpass query times out, so the cities are sent in batches
# of BATCH and the elements are merged. One process, one manifest.
BATCH = 22
_city_items = sorted(CITIES.items())
batches = [ _city_items[i:i+BATCH] for i in range(0, len(_city_items), BATCH) ]
print("cities:", len(_city_items), "in", len(batches), "batches")

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
els = []
for bi, batch in enumerate(batches):
    parts = []
    for slug, (name, lat, lon, r) in batch:
        bs, bw, bn, be = bbox(lat, lon, r)
        for typ in ("node", "way"):
            parts.append('%s%s(%s,%s,%s,%s);' % (typ, QUERY, bs, bw, bn, be))
    q = "[out:json][timeout:180];(" + "".join(parts) + ");out center tags;"
    data = None
    for attempt in range(6):
        ep = ENDPOINTS[attempt % len(ENDPOINTS)]
        try:
            req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": q}).encode(),
                                         headers={"User-Agent": "SKM-OSM-pipeline/1.0 (github)"})
            data = json.loads(urllib.request.urlopen(req, timeout=240).read().decode())
            break
        except Exception as e:
            print("batch", bi, "attempt", attempt, ep, "failed:", str(e)[:120])
            time.sleep(10 * (attempt + 1))
    if data is None:
        print("batch", bi, "gave up after retries, continuing")
        continue
    got = data.get("elements", [])
    els.extend(got)
    print("batch %d/%d: %d cities -> %d elements" % (bi + 1, len(batches), len(batch), len(got)))
    time.sleep(3)
print("total elements:", len(els))
if not els:
    print("no data at all - aborting so the existing files are not wiped")
    sys.exit(1)

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
    bc, bd = None, 1e9
    for slug, (name, clat, clon, r) in CITIES.items():
        d = dist(la, lo, clat, clon)
        if d < bd:
            bd, bc = d, slug
    if bc is None or bd > 1.2:
        continue
    f = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lo, 6), round(la, 6)]},
         "properties": {k: v for k, v in tags.items() if k in KEEP}}
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
    print("TOO FEW - aborting, not wiping existing data")
    sys.exit(1)

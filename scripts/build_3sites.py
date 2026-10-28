#!/usr/bin/env python3
"""Expand 3 sites (toiletsnearme, washroomsnearme, restareanearme) with 50+ cities
using a 100 km radius, respecting each repo's own architecture."""
import json, os, time, urllib.request, urllib.parse, html, re, shutil, subprocess, sys

OVERPASS = "https://overpass-api.de/api/interpreter"
RADIUS = 100000  # 100 km
SITE_TOILET = "https://toiletsnearme.pages.dev"
SITE_WASH = "https://washroomsnearme.pages.dev"

# slug: (name, state, lat, lon, [areas])
NEW = {
 "aligarh": ("Aligarh","Uttar Pradesh",27.8974,78.0880,["Centre Point","Railway Road","Ramghat Road","Civil Lines","Quarsi"]),
 "moradabad": ("Moradabad","Uttar Pradesh",28.8386,78.7733,["Civil Lines","Budh Bazaar","Ram Ganga Vihar","Kanth Road","Majhola"]),
 "bareilly": ("Bareilly","Uttar Pradesh",28.3670,79.4304,["Civil Lines","Kotwali","Izatnagar","Rajendra Nagar","Subhash Nagar"]),
 "gorakhpur": ("Gorakhpur","Uttar Pradesh",26.7606,83.3732,["Golghar","Civil Lines","Rapti Nagar","Betiahata","Asuran Chowk"]),
 "jhansi": ("Jhansi","Uttar Pradesh",25.4484,78.5685,["Civil Lines","Sipri Bazar","Elite Crossing","Railway Station","Nagra"]),
 "mathura": ("Mathura","Uttar Pradesh",27.4924,77.6737,["Krishna Janmabhoomi","Holi Gate","Civil Lines","Vrindavan Road","Junction Road"]),
 "ayodhya": ("Ayodhya","Uttar Pradesh",26.7996,82.2044,["Ram Mandir","Naya Ghat","Faizabad Road","Civil Lines","Sahadatganj"]),
 "saharanpur": ("Saharanpur","Uttar Pradesh",29.9640,77.5460,["Court Road","Civil Lines","Delhi Road","Ambala Road","Janta Road"]),
 "patiala": ("Patiala","Punjab",30.3398,76.3869,["Leela Bhawan","Urban Estate","Lower Mall","Sirhind Road","Bus Stand"]),
 "bathinda": ("Bathinda","Punjab",30.2110,74.9455,["Goniana Road","Civil Lines","Bibi Wala Road","Bus Stand","Model Town"]),
 "mohali": ("Mohali","Punjab",30.7046,76.7179,["Phase 7","Phase 5","Sector 70","Aerocity","Kharar"]),
 "karnal": ("Karnal","Haryana",29.6857,76.9905,["Sector 12","Kunjpura Road","Railway Road","Model Town","GT Road"]),
 "rohtak": ("Rohtak","Haryana",28.8955,76.6066,["Model Town","Civil Lines","Delhi Road","Jhajjar Road","Sunaria"]),
 "hisar": ("Hisar","Haryana",29.1492,75.7217,["Model Town","Civil Lines","Red Square","Delhi Road","Sector 14"]),
 "ambala": ("Ambala","Haryana",30.3752,76.7821,["Ambala Cantt","Mahesh Nagar","Model Town","Jagadhri Road","Babyal"]),
 "rishikesh": ("Rishikesh","Uttarakhand",30.0869,78.2676,["Ram Jhula","Laxman Jhula","Triveni Ghat","Tapovan","Muni Ki Reti"]),
 "nainital": ("Nainital","Uttarakhand",29.3803,79.4636,["Mall Road","Tallital","Mallital","Snow View","Bhowali Road"]),
 "haldwani": ("Haldwani","Uttarakhand",29.2183,79.5130,["Rampur Road","Kaladhungi Road","Civil Lines","Kathgodam","Nainital Road"]),
 "mandi": ("Mandi","Himachal Pradesh",31.7080,76.9318,["Indira Market","Bus Stand","Seri Manch","Bhutto Colony","Paddal"]),
 "solan": ("Solan","Himachal Pradesh",30.9045,77.0967,["Mall Road","Chambaghat","Rajgarh Road","Kumarhatti","Saproon"]),
 "kargil": ("Kargil","Ladakh",34.5539,76.1349,["Main Bazaar","Baroo","Kurbathang","Hospital Road","Bus Stand"]),
 "alwar": ("Alwar","Rajasthan",27.5530,76.6346,["Company Bagh","Hope Circus","Manu Marg","Delhi Road","Bus Stand"]),
 "sikar": ("Sikar","Rajasthan",27.6094,75.1399,["Station Road","Civil Lines","Piprali Road","Silver Jubilee Road","Bus Stand"]),
 "pali": ("Pali","Rajasthan",25.7711,73.3234,["Sumarpur","Mandia Road","Civil Lines","Station Road","Bus Stand"]),
 "bhilwara": ("Bhilwara","Rajasthan",25.3407,74.6313,["Gandhi Nagar","Bhopalganj","Azad Nagar","Pur Road","Bus Stand"]),
 "bharatpur": ("Bharatpur","Rajasthan",27.2152,77.5030,["Krishna Nagar","Civil Lines","Mathura Road","Station Road","Bus Stand"]),
 "bharuch": ("Bharuch","Gujarat",21.7051,72.9959,["Station Road","Panch Batti","Zadeshwar","Kasak","Bus Stand"]),
 "anand": ("Anand","Gujarat",22.5645,72.9289,["Station Road","Vallabh Vidyanagar","Gamdi","Karamsad","Bus Stand"]),
 "junagadh": ("Junagadh","Gujarat",21.5222,70.4579,["Station Road","Talav Gate","Joshipura","Zanzarda Road","Bus Stand"]),
 "latur": ("Latur","Maharashtra",18.4088,76.5604,["Station Road","Chandra Nagar","Ganj Golai","Ausar","Bus Stand"]),
 "ahmednagar": ("Ahmednagar","Maharashtra",19.0948,74.7480,["Station Road","Savedi","Pipeline Road","Maliwada","Bus Stand"]),
 "jalgaon": ("Jalgaon","Maharashtra",21.0077,75.5626,["Ring Road","Station Road","Shivaji Nagar","Mehrun","Bus Stand"]),
 "chandrapur": ("Chandrapur","Maharashtra",19.9615,79.2961,["Bangali Camp","Ram Nagar","Station Road","Tukum","Bus Stand"]),
 "satara": ("Satara","Maharashtra",17.6805,74.0183,["Powai Naka","Station Road","Sadar Bazar","Karanje","Bus Stand"]),
 "ratnagiri": ("Ratnagiri","Maharashtra",16.9902,73.3120,["Maruti Mandir","Station Road","Nachne","Bhatye","Bus Stand"]),
 "nanded": ("Nanded","Maharashtra",19.1383,77.3210,["Station Road","Shivaji Nagar","Vazirabad","Taroda","Bus Stand"]),
 "kurnool": ("Kurnool","Andhra Pradesh",15.8281,78.0373,["Bellary Chowrasta","Station Road","Ashok Nagar","Budhawarpet","Bus Stand"]),
 "nellore": ("Nellore","Andhra Pradesh",14.4426,79.9865,["Gandhi Nagar","Trunk Road","Magunta Layout","Vedayapalem","Bus Stand"]),
 "rajahmundry": ("Rajahmundry","Andhra Pradesh",17.0005,81.8040,["Danavaipeta","T Nagar","Main Road","Kotipalli","Bus Stand"]),
 "kakinada": ("Kakinada","Andhra Pradesh",16.9891,82.2475,["Main Road","Suryaraopeta","Bhanugudi","Gandhi Nagar","Bus Stand"]),
 "anantapur": ("Anantapur","Andhra Pradesh",14.6819,77.6006,["Clock Tower","Station Road","Sai Nagar","Ramnagar","Bus Stand"]),
 "ballari": ("Ballari","Karnataka",15.1394,76.9214,["Station Road","Gandhi Nagar","Cowl Bazaar","Kappagal Road","Bus Stand"]),
 "davanagere": ("Davanagere","Karnataka",14.4644,75.9218,["PB Road","Station Road","Vidyanagar","MCC B Block","Bus Stand"]),
 "shivamogga": ("Shivamogga","Karnataka",13.9299,75.5681,["Savalanga Road","BH Road","Gandhi Bazaar","Vinobha Nagar","Bus Stand"]),
 "vellore": ("Vellore","Tamil Nadu",12.9165,79.1325,["Katpadi","Gandhi Nagar","Officer's Line","Sathuvachari","Bus Stand"]),
 "erode": ("Erode","Tamil Nadu",11.3410,77.7172,["Perundurai Road","Brough Road","Sampath Nagar","Surampatti","Bus Stand"]),
 "thanjavur": ("Thanjavur","Tamil Nadu",10.7870,79.1378,["Big Temple","Medical College Road","South Main Street","Nanjikottai","Bus Stand"]),
 "kanyakumari": ("Kanyakumari","Tamil Nadu",8.0883,77.5385,["Vivekananda Rock","Beach Road","Kovalam","Suchindram","Bus Stand"]),
 "thrissur": ("Thrissur","Kerala",10.5276,76.2144,["Swaraj Round","MG Road","Vadakkunnathan","Punkunnam","Bus Stand"]),
 "kannur": ("Kannur","Kerala",11.8745,75.3704,["Fort Road","Caltex","Thana","Payyanur Road","Bus Stand"]),
 "kollam": ("Kollam","Kerala",8.8932,76.6141,["Chinnakada","Beach Road","Kilikolloor","Ashramam","Bus Stand"]),
 "cuttack": ("Cuttack","Odisha",20.4625,85.8828,["Badambadi","College Square","Buxi Bazaar","Link Road","Bus Stand"]),
 "rourkela": ("Rourkela","Odisha",22.2604,84.8536,["Civil Township","Sector 2","Bisra Road","Panposh","Bus Stand"]),
 "silchar": ("Silchar","Assam",24.8333,92.7789,["Central Road","Tarapur","Ambicapatty","Sonai Road","Bus Stand"]),
 "dibrugarh": ("Dibrugarh","Assam",27.4728,94.9120,["Chowkidinghee","Naliapool","Jalan Nagar","Barbari","Bus Stand"]),
 "jamshedpur": ("Jamshedpur","Jharkhand",22.8046,86.2029,["Bistupur","Sakchi","Kadma","Sonari","Bus Stand"]),
 "dhanbad": ("Dhanbad","Jharkhand",23.7957,86.4304,["Bank More","Hirapur","Saraidhela","Jharia Road","Bus Stand"]),
 "bhagalpur": ("Bhagalpur","Bihar",25.2425,86.9842,["Khalifabagh","Tilkamanjhi","Station Road","Nathnagar","Bus Stand"]),
 "muzaffarpur": ("Muzaffarpur","Bihar",26.1209,85.3647,["Kalambagh Chowk","Motijheel","Mithanpura","Bhagwanpur","Bus Stand"]),
 "bilaspur": ("Bilaspur","Chhattisgarh",22.0797,82.1409,["Vyapar Vihar","Gol Bazaar","Sarkanda","Link Road","Bus Stand"]),
 "bhilai": ("Bhilai","Chhattisgarh",21.1938,81.3509,["Sector 6","Nehru Nagar","Supela","Power House","Bus Stand"]),
}

EXISTING15 = {
 "delhi": ("Delhi","Delhi",28.61,77.21), "mumbai": ("Mumbai","Maharashtra",19.08,72.88),
 "bengaluru": ("Bengaluru","Karnataka",12.97,77.59), "hyderabad": ("Hyderabad","Telangana",17.39,78.49),
 "chennai": ("Chennai","Tamil Nadu",13.08,80.27), "kolkata": ("Kolkata","West Bengal",22.57,88.36),
 "pune": ("Pune","Maharashtra",18.52,73.86), "ahmedabad": ("Ahmedabad","Gujarat",23.03,72.58),
 "jaipur": ("Jaipur","Rajasthan",26.91,75.79), "lucknow": ("Lucknow","Uttar Pradesh",26.85,80.95),
 "surat": ("Surat","Gujarat",21.17,72.83), "indore": ("Indore","Madhya Pradesh",22.72,75.86),
 "chandigarh": ("Chandigarh","Chandigarh",30.73,76.78), "bhopal": ("Bhopal","Madhya Pradesh",23.26,77.41),
 "nagpur": ("Nagpur","Maharashtra",21.15,79.09),
}

def overpass(q, tries=4):
    data = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for i, wait in enumerate((0, 30, 75, 150)):
        if wait: time.sleep(wait)
        try:
            req = urllib.request.Request(OVERPASS, data=data, headers={"User-Agent":"skm-citybuild/2.0"})
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.load(r)
        except Exception as e:
            last = e
    raise last

def fetch_toilets(lat, lon):
    q = f'[out:json][timeout:180];node(around:{RADIUS},{lat},{lon})["amenity"="toilets"];out body;'
    return overpass(q)

def fetch_rest(lat, lon):
    q = (f'[out:json][timeout:180];('
         f'node(around:{RADIUS},{lat},{lon})["highway"~"rest_area|services"];'
         f'node(around:{RADIUS},{lat},{lon})["highway"="service_area"];'
         f');out body;')
    return overpass(q)

def geojson(els):
    f = []
    for e in els:
        lat, lon = e.get("lat"), e.get("lon")
        if lat is None or lon is None: continue
        t = e.get("tags", {}) or {}
        p = {k: t[k] for k in ("name","operator","fee","access","wheelchair","opening_hours","changing_table","description") if t.get(k)}
        f.append({"type":"Feature","geometry":{"@type":"Point","coordinates":[lon,lat]},"properties":p})
    for x in f: x["geometry"].pop("@type", None)
    return {"type":"FeatureCollection","features":f}

FILTERS = [{"k":"h24","l":"24 hours","t":"p['opening_hours']=='24/7'"},
 {"k":"free","l":"Free","t":"p['fee']=='no'"},
 {"k":"acc","l":"Wheelchair \u267f","t":"p['wheelchair']=='yes'||p['wheelchair']=='limited'"},
 {"k":"baby","l":"Baby change","t":"p['changing_table']=='yes'"}]
POPUP = [{"k":"operator","l":"Operator"},{"k":"opening_hours","l":"Hours"},
 {"k":"fee","l":"Fee","b":1},{"k":"access","l":"Access"},{"k":"wheelchair","l":"Wheelchair","b":1},
 {"k":"changing_table","l":"Baby change","b":1}]

def page(slug, name, state, lat, lon, areas, n, allc, noun, site, accent):
    title = f"{noun} in {name} \u2014 Live Map & Areas"
    desc = (f"{n} mapped public {noun.lower()} within 100 km of {name}, {state} \u2014 live map, "
            f"free vs paid, 24-hour and wheelchair-accessible stops near {areas[0]} and {areas[1]}.")[:155]
    canon = f"{site}/{slug}/"
    cityobj = {k:{"name":v[0],"lat":v[2],"lon":v[3]} for k,v in allc.items()}
    cfg = {"cities":cityobj,"filters":FILTERS,"popup":POPUP,"poiname":"toilet",
           "ac":accent,"data":None,"startCity":slug}
    J = lambda o: json.dumps(o, ensure_ascii=False)
    bc = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":site+"/"},
        {"@type":"ListItem","position":2,"name":f"{noun} in {name}","item":canon}]}
    faq = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":f"Where can I find {noun.lower()} near {name}?",
         "acceptedAnswer":{"@type":"Answer","text":f"This map covers public toilets within 100 km of {name}, {state} \u2014 including highway rest areas and petrol-pump facilities on the approach roads."}},
        {"@type":"Question","name":f"Are {noun.lower()} near {name} free?",
         "acceptedAnswer":{"@type":"Answer","text":f"Many community toilets are free; pay-and-use ones usually cost Rs 5-10 and are often cleaner. Highway rest areas are generally free."}},
        {"@type":"Question","name":f"Are there highway rest areas within 100 km of {name}?",
         "acceptedAnswer":{"@type":"Answer","text":f"Yes \u2014 use the map on this page; NHAI wayside amenities and fuel-station food courts are marked along the corridors leading into {name}."}}]}
    place = {"@context":"https://schema.org","@type":"Place","name":f"{noun} near {name}",
             "address":{"@type":"PostalAddress","addressLocality":name,"addressRegion":state,"addressCountry":"IN"},
             "geo":{"@type":"GeoCoordinates","latitude":lat,"longitude":lon}}
    chips = "".join(f'<span class="area">{html.escape(a)}</span>' for a in areas)
    others = "".join(f'<a href="/{k}/">{v[0]}</a>' for k,v in sorted(allc.items(), key=lambda x:x[1][0]))
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-D74LPRXWDW"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-D74LPRXWDW');</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{canon}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{site}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{site}/og-image.png">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="/theme.css">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0F172A">
<script type="application/ld+json">{J(bc)}</script>
<script type="application/ld+json">{J(faq)}</script>
<script type="application/ld+json">{J(place)}</script>
</head>
<body>
<header id="block-header"><div class="wrap"><img class="brandlogo" src="/favicon.svg" alt="{noun} Near Me" width="40" height="40"><div><b>{noun} Near Me</b><small>SKM Studio Network \u00b7 live OSM data</small></div></div></header>
<div class="hero" id="block-hero"><div class="wrap">
<h1 id="block-hero-h1">{noun} near {html.escape(name)} \u2014 live map</h1>
<p>Tap a pin for directions. <b>{n}</b> public toilets and rest stops mapped within 100 km of {html.escape(name)}, {html.escape(state)}. Data \u00a9 OpenStreetMap contributors.</p>
<div class="search"><input id="q" placeholder="Search by name / area / operator\u2026"><button id="locbtn">\U0001F4CD Near me</button></div>
<div class="chips" id="chips"></div>
</div></div>
<div class="wrap">
<div class="mapbar" id="block-mapbar"><span id="count">Loading {html.escape(name)}\u2026</span><span id="routeinfo"></span><span id="filters"></span></div>
<div id="map"></div>
<div class="legend">\u25cf green = free \u00b7 tap any pin \u2192 directions \u00b7 100 km radius \u00b7 data \u00a9 OpenStreetMap contributors (ODbL)</div>
<div id="toast"></div>
<main id="block-content">
<div id="block-{slug}" class="card"><h2>{noun} near {html.escape(name)}</h2>
<p>Every mapped toilet and rest stop within <b>100 km</b> of {html.escape(name)}, {html.escape(state)} \u2014 from {html.escape(areas[0])} out to the highway corridors.</p>
<p><b>{n} facilities</b> mapped. Filter by need, tap a pin for details and directions.</p>
<div class="areas">{chips}</div></div>
<div class="card"><h2>\U0001F6E3 Highway rest areas near {html.escape(name)}</h2>
<p>Driving in or out of {html.escape(name)}? NHAI wayside amenities and fuel-station food courts along the corridors are included in this map. Filter by <b>24 hours</b> and <b>Free</b> for the most reliable stops.</p>
<p>Reliable defaults on Indian highways: large petrol pumps with food courts, NHAI wayside amenities, and dhabas with parking.</p></div>
<div class="card"><h2>\U0001F469 Women, children &amp; accessibility</h2>
<ul><li>Most public toilets near {html.escape(name)} have separate women's sections \u2014 look for "Mahila" signage.</li>
<li>Swachh Bharat guidelines require accessible facilities in public toilets \u2014 use the \u267f filter.</li>
<li>At night, prefer lit, attended facilities inside petrol pumps, hotels or 24\u00d77 chains.</li></ul></div>
<div class="card"><h2>\u2753 {noun} near {html.escape(name)} \u2014 FAQ</h2>
<details><summary>How do I find {noun.lower()} near {html.escape(name)} right now?</summary><p>Use the map on this page. Petrol pumps, metro stations and malls are reliable fallbacks.</p></details>
<details><summary>Are they free?</summary><p>Many community toilets are free. Pay-and-use facilities typically charge \u20b95\u2013\u20b910.</p></details>
<details><summary>Are there rest areas within 100 km?</summary><p>Yes \u2014 highway rest areas and NHAI wayside amenities appear on this map.</p></details></div>
<div id="block-other-cities" class="card"><h2>\U0001F5FA Other cities</h2><div class="cities">{others}</div></div>
</main>
<footer id="block-footer">{noun} Near Me \u2014 an SKM Studio Network site \u00b7 <a href="{site}/">{site}</a> \u00b7 Map data \u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL)<br>
General information only \u00b7 Emergency? Call <b>112</b></footer>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>window.CFG={J(cfg)};</script>
<script src="/mapapp.js" defer></script>
<script defer src="/feedback.js" data-site="{"toilets" if noun=="Toilets" else "washrooms"}"></script></body>
</html>
'''

def build_site(repo_dir, site, noun, accent, allc, counts):
    for slug, (name, state, lat, lon, areas) in NEW.items():
        if slug not in counts: continue
        d = os.path.join(repo_dir, slug); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, "index.html"), "w").write(page(slug, name, state, lat, lon, areas, counts[slug], allc, noun, site, accent))
    # also regenerate existing cities so CFG lists all
    for slug, (name, state, lat, lon) in EXISTING15.items():
        if slug not in counts: continue
        d = os.path.join(repo_dir, slug)
        if not os.path.isdir(d): continue
        open(os.path.join(d, "index.html"), "w").write(page(slug, name, state, lat, lon,
            ["City Centre","Main Market","Bus Stand","Railway Station","Old Town"], counts[slug], allc, noun, site, accent))
    urls = [f"{site}/"] + [f"{site}/{k}/" for k in sorted(counts)]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"<url><loc>{u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n" for u in urls)
    sm += "</urlset>\n"
    open(os.path.join(repo_dir, "sitemap.xml"), "w").write(sm)
    print(f"  {noun}: {len(counts)} city pages + sitemap ({len(urls)} urls)")

def main():
    base = os.environ.get("WORK", "/tmp/work")
    t_dir = os.path.join(base, "toiletsnearme")
    w_dir = os.path.join(base, "washroomsnearme")
    r_dir = os.path.join(base, "restareanearme")
    allc = dict(EXISTING15)
    allc.update({k: (v[0], v[1], v[2], v[3]) for k, v in NEW.items()})

    counts, added, skipped = {}, [], []
    rest_feats = []
    for slug, (name, state, lat, lon, areas) in NEW.items():
        cache = os.path.join(t_dir, "data", f"{slug}.json")
        if os.path.exists(cache):
            try:
                n = len(json.load(open(cache)).get("features", []))
                if n >= 3:
                    counts[slug] = n; added.append([slug, name, state, n]); print(f"OK {slug}: {n} (cached)"); continue
            except Exception: pass
        try:
            gj = geojson(fetch_toilets(lat, lon).get("elements", []))
            n = len(gj["features"])
        except Exception as e:
            print(f"SKIP {slug}: {e}"); skipped.append([slug, f"fetch: {e}"]); continue
        if n < 3:
            print(f"SKIP {slug}: only {n}"); skipped.append([slug, f"only {n}"]); continue
        os.makedirs(os.path.join(t_dir, "data"), exist_ok=True)
        json.dump(gj, open(cache, "w"), separators=(",", ":"))
        counts[slug] = n; added.append([slug, name, state, n])
        print(f"OK {slug}: {n} within 100km")
        time.sleep(2)

    # rest areas (for restareanearme)
    try:
        for slug, (name, state, lat, lon, areas) in list(NEW.items())[:20]:
            try:
                els = fetch_rest(lat, lon).get("elements", [])
                for e in els:
                    t = e.get("tags", {}) or {}
                    if e.get("lat") is None: continue
                    rest_feats.append({"name": t.get("name", "Rest area"),
                                       "nearest_city": name, "state": state,
                                       "lat": e["lat"], "lon": e["lon"],
                                       "operator": t.get("operator", "")})
                time.sleep(1)
            except Exception as e:
                print(f"  rest skip {slug}: {e}")
    except Exception as e:
        print("rest err", e)

    # copy toilet data into washrooms
    os.makedirs(os.path.join(w_dir, "data"), exist_ok=True)
    for slug in counts:
        src = os.path.join(t_dir, "data", f"{slug}.json")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(w_dir, "data", f"{slug}.json"))

    build_site(t_dir, SITE_TOILET, "Toilets", "#0d9488", allc, counts)
    build_site(w_dir, SITE_WASH, "Washrooms", "#7c3aed", allc, counts)

    # restareanearme: additive data file only (respects its static architecture)
    os.makedirs(os.path.join(r_dir, "data"), exist_ok=True)
    json.dump({"generated": time.strftime("%Y-%m-%d"), "count": len(rest_feats),
               "rest_areas": rest_feats}, open(os.path.join(r_dir, "data", "rest-areas-100km.json"), "w"), indent=1)
    print(f"  restareas: {len(rest_feats)} facilities written to data/rest-areas-100km.json")

    json.dump({"added": added, "skipped": skipped, "generated": time.strftime("%Y-%m-%d %H:%M IST"),
               "radius_km": 100, "total_cities": len(counts)},
              open(os.path.join(base, "cities-added-3sites.json"), "w"), indent=1)
    print(f"\nDONE added={len(added)} skipped={len(skipped)} total={len(counts)} rest={len(rest_feats)}")

if __name__ == "__main__":
    main()

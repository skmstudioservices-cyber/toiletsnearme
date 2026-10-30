#!/usr/bin/env python3
"""Add 50 Indian cities to toiletsnearme with REAL OSM data + generated pages."""
import json, os, time, urllib.request, urllib.parse, html, re

OVERPASS = "https://overpass-api.de/api/interpreter"
SITE = "https://toiletsnearme.pages.dev"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXISTING = {
 "delhi": ("Delhi","Delhi",28.61,77.21), "mumbai": ("Mumbai","Maharashtra",19.08,72.88),
 "bengaluru": ("Bengaluru","Karnataka",12.97,77.59), "hyderabad": ("Hyderabad","Telangana",17.39,78.49),
 "chennai": ("Chennai","Tamil Nadu",13.08,80.27), "kolkata": ("Kolkata","West Bengal",22.57,88.36),
 "pune": ("Pune","Maharashtra",18.52,73.86), "ahmedabad": ("Ahmedabad","Gujarat",23.03,72.58),
 "jaipur": ("Jaipur","Rajasthan",26.91,75.79), "lucknow": ("Lucknow","Uttar Pradesh",26.85,80.95),
 "surat": ("Surat","Gujarat",21.17,72.83), "indore": ("Indore","Madhya Pradesh",22.72,75.86),
 "chandigarh": ("Chandigarh","Chandigarh",30.73,76.78), "bhopal": ("Bhopal","Madhya Pradesh",23.26,77.41),
 "nagpur": ("Nagpur","Maharashtra",21.15,79.09),
}

# slug: (name, state, lat, lon, [areas])
NEW = {
 "agra": ("Agra","Uttar Pradesh",27.1767,78.0081,["Taj Ganj","Sadar Bazaar","Kamla Nagar","Dayalbagh","Sikandra"]),
 "varanasi": ("Varanasi","Uttar Pradesh",25.3176,82.9739,["Godowlia","Dashashwamedh","Assi Ghat","Cantt","Lanka"]),
 "kanpur": ("Kanpur","Uttar Pradesh",26.4499,80.3319,["Civil Lines","Swaroop Nagar","Mall Road","Kidwai Nagar","Govind Nagar"]),
 "meerut": ("Meerut","Uttar Pradesh",28.9845,77.7064,["Sadar Bazaar","Cantt","Shastri Nagar","Ganga Nagar","Pallavpuram"]),
 "ghaziabad": ("Ghaziabad","Uttar Pradesh",28.6692,77.4538,["Raj Nagar","Vaishali","Indirapuram","Kavi Nagar","Vasundhara"]),
 "noida": ("Noida","Uttar Pradesh",28.5355,77.3910,["Sector 18","Sector 62","Sector 15","Greater Noida","Sector 137"]),
 "prayagraj": ("Prayagraj","Uttar Pradesh",25.4358,81.8463,["Civil Lines","Chowk","Allahpur","Katra","Naini"]),
 "amritsar": ("Amritsar","Punjab",31.6340,74.8723,["Golden Temple","Hall Bazaar","Lawrence Road","Ranjit Avenue","Majitha Road"]),
 "ludhiana": ("Ludhiana","Punjab",30.9010,75.8573,["Ferozepur Road","Model Town","Sarabha Nagar","Civil Lines","Jalandhar Bypass"]),
 "jalandhar": ("Jalandhar","Punjab",31.3260,75.5762,["Model Town","Civil Lines","Bus Stand","Nakodar Road","Urban Estate"]),
 "gurugram": ("Gurugram","Haryana",28.4595,77.0266,["Cyber Hub","Sector 29","MG Road","Sohna Road","Golf Course Road"]),
 "faridabad": ("Faridabad","Haryana",28.4089,77.3178,["NIT","Sector 15","Ballabgarh","Old Faridabad","Neharpar"]),
 "dehradun": ("Dehradun","Uttarakhand",30.3165,78.0322,["Clock Tower","Rajpur Road","Clement Town","Patel Nagar","ISBT"]),
 "haridwar": ("Haridwar","Uttarakhand",29.9457,78.1642,["Har Ki Pauri","Jwalapur","Kankhal","Bhupatwala","Railway Station"]),
 "shimla": ("Shimla","Himachal Pradesh",31.1048,77.1734,["Mall Road","The Ridge","Lakkar Bazaar","Sanjauli","ISBT"]),
 "dharamshala": ("Dharamshala","Himachal Pradesh",32.2190,76.3234,["McLeod Ganj","Kotwali Bazaar","Bhagsu","Sidhbari","Naddi"]),
 "jammu": ("Jammu","Jammu and Kashmir",32.7266,74.8570,["Raghunath Bazaar","Gandhi Nagar","Channi Himmat","Talab Tillo","Railway Station"]),
 "srinagar": ("Srinagar","Jammu and Kashmir",34.0837,74.7973,["Dal Lake","Lal Chowk","Boulevard Road","Hazratbal","Sonwar"]),
 "leh": ("Leh","Ladakh",34.1526,77.5771,["Main Bazaar","Changspa","Skara","Housing Colony","Airport Road"]),
 "jodhpur": ("Jodhpur","Rajasthan",26.2389,73.0243,["Clock Tower","Sardarpura","Mandore","Ratanada","PWD Road"]),
 "udaipur": ("Udaipur","Rajasthan",24.5854,73.7125,["Lake Pichola","Fateh Sagar","Hathipole","Bapu Bazaar","Sukhadia Circle"]),
 "kota": ("Kota","Rajasthan",25.2138,75.8648,["Talwandi","Rajeev Gandhi Nagar","Gumanpura","Station Road","Dadabari"]),
 "ajmer": ("Ajmer","Rajasthan",26.4499,74.6399,["Dargah Bazaar","Naya Bazaar","Civil Lines","Adarsh Nagar","Railway Station"]),
 "bikaner": ("Bikaner","Rajasthan",28.0229,73.3119,["Junagarh","Kote Gate","Station Road","Civil Lines","Rampuria"]),
 "jaisalmer": ("Jaisalmer","Rajasthan",26.9157,70.9083,["Fort","Gadisar Lake","Station Road","Gandhi Chowk","Amar Sagar"]),
 "vadodara": ("Vadodara","Gujarat",22.3072,73.1812,["Alkapuri","Sayajigunj","Fatehgunj","Mandvi","Railway Station"]),
 "rajkot": ("Rajkot","Gujarat",22.3039,70.8022,["Kalawad Road","Race Course","Yagnik Road","Gondal Road","University Road"]),
 "jamnagar": ("Jamnagar","Gujarat",22.4707,70.0577,["Patel Colony","Teen Batti","Khambhalia Gate","Palace Road","Station Road"]),
 "gandhinagar": ("Gandhinagar","Gujarat",23.2156,72.6369,["Sector 11","Sector 21","Sector 16","Infocity","Akshardham"]),
 "nashik": ("Nashik","Maharashtra",19.9975,73.7898,["Panchavati","College Road","Gangapur Road","Nashik Road","Satpur"]),
 "aurangabad": ("Aurangabad","Maharashtra",19.8762,75.3433,["Kranti Chowk","CIDCO","Jalna Road","Station Road","Bibi Ka Maqbara"]),
 "solapur": ("Solapur","Maharashtra",17.6599,75.9064,["Saat Rasta","Railway Lines","Hotgi Road","Murarji Peth","Jule Solapur"]),
 "kolhapur": ("Kolhapur","Maharashtra",16.7050,74.2433,["Mahadwar Road","Rajarampuri","Station Road","Rankala","Shahupuri"]),
 "thane": ("Thane","Maharashtra",19.2183,72.9781,["Ghodbunder Road","Naupada","Wagle Estate","Kolshet","Majiwada"]),
 "navi-mumbai": ("Navi Mumbai","Maharashtra",19.0330,73.0297,["Vashi","Nerul","Belapur","Airoli","Kharghar"]),
 "visakhapatnam": ("Visakhapatnam","Andhra Pradesh",17.6868,83.2185,["RK Beach","MVP Colony","Gajuwaka","Dwaraka Nagar","Railway Station"]),
 "vijayawada": ("Vijayawada","Andhra Pradesh",16.5062,80.6480,["Benz Circle","MG Road","Governorpet","Gunadala","Auto Nagar"]),
 "tirupati": ("Tirupati","Andhra Pradesh",13.6288,79.4192,["Tirumala","Railway Station","Gandhi Road","Alipiri","Renigunta Road"]),
 "mysuru": ("Mysuru","Karnataka",12.2958,76.6394,["Devaraja Market","Sayyaji Rao Road","Vijayanagar","Chamundi Hill","Railway Station"]),
 "mangaluru": ("Mangaluru","Karnataka",12.9141,74.8560,["Hampankatta","Kadri","Balmatta","Panambur","State Bank"]),
 "hubballi": ("Hubballi","Karnataka",15.3647,75.1240,["Lamington Road","Gokul Road","Vidyanagar","Station Road","Keshwapur"]),
 "coimbatore": ("Coimbatore","Tamil Nadu",11.0168,76.9558,["RS Puram","Gandhipuram","Town Hall","Peelamedu","Ukkadam"]),
 "madurai": ("Madurai","Tamil Nadu",9.9252,78.1198,["Meenakshi Temple","Periyar","Anna Nagar","Mattuthavani","Railway Station"]),
 "tiruchirappalli": ("Tiruchirappalli","Tamil Nadu",10.7905,78.7047,["Srirangam","Thillai Nagar","Chathiram","Cantonment","Central Bus Stand"]),
 "kochi": ("Kochi","Kerala",9.9312,76.2673,["Fort Kochi","Marine Drive","Ernakulam","Edappally","Mattancherry"]),
 "thiruvananthapuram": ("Thiruvananthapuram","Kerala",8.5241,76.9366,["East Fort","Palayam","Kowdiar","Technopark","Kovalam"]),
 "bhubaneswar": ("Bhubaneswar","Odisha",20.2961,85.8245,["Master Canteen","Saheed Nagar","Patia","Old Town","Jaydev Vihar"]),
 "guwahati": ("Guwahati","Assam",26.1445,91.7362,["Paltan Bazaar","Fancy Bazaar","Zoo Road","Beltola","Six Mile"]),
 "patna": ("Patna","Bihar",25.5941,85.1376,["Gandhi Maidan","Kankarbagh","Boring Road","Patna Junction","Bailey Road"]),
 "raipur": ("Raipur","Chhattisgarh",21.2514,81.6296,["Pandri","Telibandha","Shankar Nagar","Raipur Station","Devendra Nagar"]),
 "siliguri": ("Siliguri","West Bengal",26.7271,88.3953,["Hong Kong Market","Sevoke Road","Pradhan Nagar","Matigara","Bidhan Road"]),
}

def fetch(lat, lon, radius=12000):
    q = f'[out:json][timeout:120];node(around:{radius},{lat},{lon})["amenity"="toilets"];out body;'
    data = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for attempt, wait in enumerate((0, 25, 60, 120)):
        if wait: time.sleep(wait)
        try:
            req = urllib.request.Request(OVERPASS, data=data, headers={"User-Agent":"toiletsnearme-build/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as e:
            last = e
            print(f"    retry {attempt+1} after {e}")
    raise last

def geojson(els):
    feats = []
    for e in els:
        lat, lon = e.get("lat"), e.get("lon")
        if lat is None or lon is None: continue
        t = e.get("tags", {}) or {}
        props = {}
        for k in ("name","operator","fee","access","wheelchair","opening_hours","changing_table","description","unisex","male","female"):
            if t.get(k): props[k] = t[k]
        feats.append({"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},"properties":props})
    return {"type":"FeatureCollection","features":feats}

CFG_FILTERS = [{"k":"h24","l":"24 hours","t":"p['opening_hours']=='24/7'"},
 {"k":"free","l":"Free","t":"p['fee']=='no'"},
 {"k":"acc","l":"Wheelchair \u267f","t":"p['wheelchair']=='yes'||p['wheelchair']=='limited'"},
 {"k":"baby","l":"Baby change","t":"p['changing_table']=='yes'"}]
CFG_POPUP = [{"k":"operator","l":"Operator"},{"k":"opening_hours","l":"Hours"},
 {"k":"fee","l":"Fee","b":1},{"k":"access","l":"Access"},{"k":"wheelchair","l":"Wheelchair","b":1},
 {"k":"changing_table","l":"Baby change","b":1}]

def page(slug, name, state, lat, lon, areas, n, allcities):
    title = f"Public toilets in {name} \u2014 Live Map & Areas"
    desc = (f"All mapped public toilets in {name}, {state} \u2014 free vs paid, "
            f"24-hour and wheelchair-accessible, on a live map.")
    if len(desc) > 158:  # never cut mid-word
        desc = desc[:158].rsplit(" ", 1)[0].rstrip(",;:") + "."
    canon = f"{SITE}/{slug}/"
    cityobj = {k:{"name":v[0],"lat":v[2],"lon":v[3]} for k,v in allcities.items()}
    cfg = {"cities":cityobj,"filters":CFG_FILTERS,"popup":CFG_POPUP,"poiname":"toilet",
           "ac":"#0d9488","data":None,"startCity":slug}
    bc = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Home","item":SITE+"/"},
        {"@type":"ListItem","position":2,"name":f"Public toilets in {name}","item":canon}]}
    faq = {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
        {"@type":"Question","name":f"Where can I find a public toilet in {name}?",
         "acceptedAnswer":{"@type":"Answer","text":f"Use the live map on this page to find public toilets across {name}, {state} \u2014 including 24x7 petrol-pump, mall and metro options, with directions."}},
        {"@type":"Question","name":f"Are public toilets in {name} free?",
         "acceptedAnswer":{"@type":"Answer","text":f"Many community toilets in {name} are free; pay-and-use ones usually cost Rs 5-10 and are often cleaner."}},
        {"@type":"Question","name":f"Are there women's toilets in {name}?",
         "acceptedAnswer":{"@type":"Answer","text":f"Yes \u2014 most public and pay-and-use toilets in {name} have separate women's sections, usually with attendants."}}]}
    place = {"@context":"https://schema.org","@type":"Place","name":f"Public toilets in {name}",
             "address":{"@type":"PostalAddress","addressLocality":name,"addressRegion":state,"addressCountry":"IN"},
             "geo":{"@type":"GeoCoordinates","latitude":lat,"longitude":lon}}
    areachips = "".join(f'<span class="area">{html.escape(a)}</span>' for a in areas)
    others = "".join(f'<a href="/{k}/">{v[0]}</a>' for k,v in sorted(allcities.items(), key=lambda x:x[1][0])
                     if os.path.isdir(os.path.join(ROOT, k)))  # never link a city that has no page
    J = lambda o: json.dumps(o, ensure_ascii=False)
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
<meta property="og:image" content="{SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og-image.png">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="/theme.css">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0F172A">
<script type="application/ld+json">{J(bc)}</script>
<script type="application/ld+json">{J(faq)}</script>
<script type="application/ld+json">{J(place)}</script>
</head>
<body>
<!-- BLOCK:HEADER -->
<header id="block-header"><div class="wrap"><img class="brandlogo" src="/favicon.svg" alt="Toilets Near Me" width="40" height="40"><div><b>Toilets Near Me</b><small>SKM Studio Network \u00b7 live OSM data \u00b7 DIGIPIN directions</small></div></div></header>
<!-- /BLOCK:HEADER -->
<!-- BLOCK:HERO -->
<div class="hero" id="block-hero"><div class="wrap">
<h1 id="block-hero-h1">Public toilets in {html.escape(name)} \u2014 live map</h1>
<p>Tap a pin to get exact directions on the map itself. {n} toilets mapped across {html.escape(name)}, {html.escape(state)}. Data \u00a9 OpenStreetMap contributors.</p>
<div class="search"><input id="q" placeholder="Search by name / area / operator\u2026"><button id="locbtn">\U0001F4CD Near me</button></div>
<div class="chips" id="chips"></div>
</div></div>
<!-- /BLOCK:HERO -->
<div class="wrap">
<!-- BLOCK:MAPBAR -->
<div class="mapbar" id="block-mapbar"><span id="count">Loading {html.escape(name)}\u2026</span><span id="routeinfo"></span><span id="filters"></span><button class="fbtn" id="addbtn">\u2795 Add a missing spot</button></div>
<!-- /BLOCK:MAPBAR -->
<div id="addhint">\U0001F4CD Now click the exact spot on the map \u2014 we'll generate its DIGIPIN and a suggestion you can submit for review.</div>
<div id="map"></div>
<div class="legend">\u25cf green = free \u00b7 tap any pin \u2192 DIGIPIN + \U0001F9ED directions drawn right here on the map \u00b7 data \u00a9 OpenStreetMap contributors (ODbL)</div>
<div id="toast"></div>
<!-- BLOCK:CONTENT -->
<main id="block-content">
<!-- BLOCK:CARD-public-toilets-in-{slug} -->
<div id="block-public-toilets-in-{slug}" class="card"><h2>Public toilets in {html.escape(name)}</h2>
<p>Every mapped public toilet in {html.escape(name)}, {html.escape(state)} \u2014 from {html.escape(areas[0])} to {html.escape(areas[2])} \u2014 on one live map.</p>
<p>The map above shows <b>{n} toilets</b> currently mapped across {html.escape(name)} \u2014 filter by your needs, tap a pin for its <b>DIGIPIN</b>, then tap <b>\U0001F9ED Directions</b> to draw the route on the map itself.</p>
<div class="areas">{areachips}</div>
<p class="legend" style="margin-top:10px">Popular {html.escape(name)} areas with mapped toilets \u2014 zoom into any of them on the map.</p></div>
<!-- /BLOCK:CARD-public-toilets-in-{slug} -->
<!-- BLOCK:CARD-the-fastest-ways-to-find-a-toilet-nearby -->
<div id="block-the-fastest-ways-to-find-a-toilet-nearby" class="card"><h2>\U0001F5FA The fastest ways to find a toilet nearby</h2>
<p>Open Google Maps and search <b>"public toilet near me"</b>, "restroom near me" or "Sulabh toilet near me". Results usually include distance, opening hours and user ratings.</p>
<p>If nothing shows up, search for <b>nearby landmarks instead</b>: "petrol pump", "metro station", "railway station", "bus stand", "mall" or "hotel". All of these have restrooms.</p></div>
<!-- /BLOCK:CARD-the-fastest-ways-to-find-a-toilet-nearby -->
<!-- BLOCK:CARD-public-toilets-in-india-what-to-expect -->
<div id="block-public-toilets-in-india-what-to-expect" class="card"><h2>\U0001F1EE\U0001F1F3 Public toilets in India \u2014 what to expect</h2>
<h3>1. Free community / public toilets</h3><p>Built and maintained by municipal bodies. Free or nominally priced, found near markets, bus stands and stations.</p>
<h3>2. Pay-and-use toilets (Sulabh and similar)</h3><p>A small fee (typically \u20b95\u2013\u20b910) gets you a cleaner, attended facility with water and soap.</p>
<h3>3. Facility toilets (malls, metros, petrol pumps)</h3><p>Often the cleanest and safest option, especially on highways and in city centres.</p></div>
<!-- /BLOCK:CARD-public-toilets-in-india-what-to-expect -->
<!-- BLOCK:CARD-women-children-accessibility -->
<div id="block-women-children-accessibility" class="card"><h2>\U0001F469 Women, children &amp; accessibility</h2>
<ul><li>Many community toilets in {html.escape(name)} have <b>separate women's sections</b> \u2014 look for "Mahila" signage.</li>
<li>Swachh Bharat guidelines require accessible toilets for persons with disabilities in public facilities.</li>
<li>At night, prefer lit, attended facilities inside petrol pumps, hotels or 24\u00d77 chains.</li></ul></div>
<!-- /BLOCK:CARD-women-children-accessibility -->
<!-- BLOCK:CARD-public-toilets-in-{slug}-faq -->
<div id="block-public-toilets-in-{slug}-faq" class="card"><h2>\u2753 Public toilets in {html.escape(name)} \u2014 FAQ</h2>
<details><summary>How do I find a public toilet in {html.escape(name)} right now?</summary><p>Use the live map on this page, or search 'public toilet near me' in Google Maps. Petrol pumps, metro stations and malls are reliable fallbacks.</p></details>
<details><summary>Are public toilets in {html.escape(name)} free?</summary><p>Many community toilets are free or cost a token amount. Pay-and-use toilets typically charge \u20b95\u2013\u20b910.</p></details>
<details><summary>Are there separate toilets for women in {html.escape(name)}?</summary><p>Yes \u2014 most public and pay-and-use toilets have separate women's sections, often marked 'Mahila'.</p></details>
<details><summary>Are wheelchair-accessible toilets available?</summary><p>Swachh Bharat guidelines require accessible facilities in public toilets. Use the \u267f filter on the map above.</p></details></div>
<!-- /BLOCK:CARD-public-toilets-in-{slug}-faq -->
<!-- BLOCK:CARD-other-cities -->
<div id="block-other-cities" class="card"><h2>\U0001F5FA Other cities</h2><div class="cities">{others}</div></div>
<!-- /BLOCK:CARD-other-cities -->
</main>
<!-- /BLOCK:CONTENT -->
<!-- BLOCK:FOOTER -->
<footer id="block-footer">Toilets Near Me \u2014 an SKM Studio Network site \u00b7 <a href="{SITE}/">{SITE}</a> \u00b7 Map data \u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL)<br>
General information only \u00b7 Emergency? Call <b>112</b> \u00b7 <a href="/privacy/">Privacy</a> \u00b7 <a href="/about/">About</a></footer>
<!-- /BLOCK:FOOTER -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>window.CFG={J(cfg)};</script>
<script src="/mapapp.js" defer></script>
<script defer src="/feedback.js" data-site="toilets"></script></body>
</html>
'''

def main():
    allcities = dict(EXISTING)
    allcities.update(NEW)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    manifest_path = os.path.join(ROOT, "data", "manifest.json")
    try:
        manifest = json.load(open(manifest_path))
    except Exception:
        manifest = {"cities": {}}
    counts = {}
    # existing counts from manifest
    for k, v in manifest.get("cities", {}).items():
        counts[k] = v.get("n", 0)

    added, skipped = [], []
    for slug, (name, state, lat, lon, areas) in NEW.items():
        cache = os.path.join(ROOT, "data", f"{slug}.json")
        if os.path.exists(cache):
            try:
                gj = json.load(open(cache))
                n = len(gj.get("features", []))
                if n >= 3:
                    counts[slug] = n; added.append((slug, name, state, n))
                    print(f"OK {slug}: {n} toilets (cached)")
                    continue
            except Exception:
                pass
        try:
            raw = fetch(lat, lon)
            gj = geojson(raw.get("elements", []))
            n = len(gj["features"])
        except Exception as e:
            print(f"SKIP {slug}: fetch error {e}")
            skipped.append((slug, "fetch error"))
            continue
        if n < 3:
            print(f"SKIP {slug}: only {n} toilets")
            skipped.append((slug, f"only {n} toilets"))
            continue
        with open(os.path.join(ROOT, "data", f"{slug}.json"), "w") as f:
            json.dump(gj, f, separators=(",", ":"))
        counts[slug] = n
        added.append((slug, name, state, n))
        print(f"OK {slug}: {n} toilets")
        time.sleep(2)

    # regenerate pages for every city that has data (existing + new)
    for slug, (name, state, lat, lon, areas) in list(NEW.items()) + [(k,(v[0],v[1],v[2],v[3],["City Centre","Main Market","Bus Stand","Railway Station","Old Town"])) for k,v in EXISTING.items()]:
        if slug not in counts: continue
        d = os.path.join(ROOT, slug)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as f:
            f.write(page(slug, name, state, lat, lon, areas, counts[slug], allcities))

    # manifest
    manifest["cities"] = {k: {"name": allcities[k][0], "n": counts.get(k, 0)} for k in allcities if k in counts}
    manifest["generated"] = time.strftime("%Y-%m-%d")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=1)

    # sitemap — ALWAYS rebuilt from what is actually on disk (never from the
    # latest batch only). Fixes the 30 Oct regression where a city-expansion run
    # overwrote the sitemap with 53 new cities and dropped Delhi/Mumbai/guides.
    def _page_dirs(root):
        cities, guides = [], []
        for d in sorted(os.listdir(root)):
            p = os.path.join(root, d)
            if not os.path.isdir(p) or not os.path.exists(os.path.join(p, "index.html")):
                continue
            if d in ("data", "scripts", "functions", "icons", "js", "sitemap"):
                continue
            if os.path.exists(os.path.join(root, "data", d + ".json")):
                cities.append(d)
            elif d not in ("about", "privacy"):
                guides.append(d)
        return cities, guides

    _c, _g = _page_dirs(ROOT)
    _urls = [f"{SITE}/"] + [f"{SITE}/{g}/" for g in _g] + [f"{SITE}/about/", f"{SITE}/privacy/"] + [f"{SITE}/{c}/" for c in _c]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"<url><loc>{u}</loc><changefreq>weekly</changefreq><priority>{'1.0' if u.rstrip('/')==SITE else '0.8'}</priority></url>\n" for u in _urls)
    sm += "</urlset>\n"
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write(sm)
    print(f"  sitemap rebuilt from disk: {len(_urls)} urls ({len(_c)} cities, {len(_g)} guides)")

    print(f"\nADDED {len(added)} cities, SKIPPED {len(skipped)}")
    for a in added: print("  +", a[1], a[2], a[3])
    for s in skipped: print("  -", s)
    with open(os.path.join(ROOT, "data", "cities-added.json"), "w") as f:
        json.dump({"added": added, "skipped": skipped, "generated": time.strftime("%Y-%m-%d %H:%M IST")}, f, indent=1)

if __name__ == "__main__":
    main()

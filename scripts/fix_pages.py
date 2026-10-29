#!/usr/bin/env python3
"""Rebuild city pages with (a) attribute block + crowdsource form baked in,
(b) count-led titles for CTR, (c) homepage 'browse by city' links."""
import json, os, re, html

ROOT = os.environ.get("REPO", ".")
SITE = os.environ.get("SITE", "https://toiletsnearme.pages.dev")
NOUN = os.environ.get("NOUN", "toilets")
NOUN1 = os.environ.get("NOUN1", "toilet")
DATA = os.path.join(ROOT, "data")
LABELS = [("free","Free entry"),("paid","Paid (₹5–10 typical)"),("open24","Open 24 hours"),
          ("wheelchair","Wheelchair accessible"),("baby_change","Baby changing"),
          ("women","Women's section"),("water","Water available"),("soap","Soap / wash basin"),
          ("parking","Parking nearby")]

def fmt(n): return f"{n:,}"

def attr_block(slug, name, total, counts):
    rows = "".join(f"<tr><td>{lab}</td><td><b>{fmt(counts.get(k,0))}</b> of {fmt(total)}</td></tr>"
                   for k, lab in LABELS)
    boxes = "".join(f'<label><input type="checkbox" name="{k}"> {lab}</label> '
                    for k, lab in LABELS if k not in ("paid",))
    return f'''<div class="card" id="block-attributes-{slug}"><h2>✅ What you'll actually find in {html.escape(name)}</h2>
<p>Counted from OpenStreetMap tags across all <b>{fmt(total)}</b> facilities mapped here. A low number means "not recorded yet" — not "not there". You can fix that below.</p>
<table class="attrs"><thead><tr><th>Feature</th><th>Reported</th></tr></thead><tbody>{rows}</tbody></table></div>
<div class="card" id="block-crowdsource-{slug}"><h2>🙋 Help other travellers — update a facility</h2>
<p>One tap, no login. Every update carries a <b>"last verified"</b> date so the next person knows how fresh it is. Shown as <i>reported by visitors, unverified</i>.</p>
<form id="attrform" onsubmit="return submitAttr(event,'{slug}')">
<fieldset><legend>What did you find?</legend>{boxes}</fieldset>
<label>Facility name or landmark <input type="text" name="facility" placeholder="e.g. Sulabh near bus stand" required></label>
<label>Cleanliness (1–5) <input type="number" name="clean" min="1" max="5" step="1"></label>
<label>Safety at night (1–5) <input type="number" name="safety" min="1" max="5" step="1"></label>
<label>Note (optional) <input type="text" name="note" maxlength="200" placeholder="e.g. water tap broken"></label>
<button type="submit">Submit update</button></form>
<script>
async function submitAttr(e,slug){{e.preventDefault();const f=e.target,d={{city:slug}};
new FormData(f).forEach((v,k)=>{{if(["facility","note","clean","safety"].includes(k))d[k]=v;else if(v)d["attr_"+k]=1;}});
const b=f.querySelector("button");b.disabled=true;b.textContent="Sending…";
try{{const r=await fetch("/api/attr",{{method:"POST",headers:{{"content-type":"application/json"}},body:JSON.stringify(d)}});
if(r.ok){{b.textContent="✅ Thanks — recorded";f.reset();}}else{{b.textContent="Could not save — try later";b.disabled=false;}}}}
catch(x){{b.textContent="Could not save — try later";b.disabled=false;}}return false;}}
</script></div>'''

def main():
    attrs = json.load(open(os.path.join(DATA, "attributes.json")))["cities"]
    man = json.load(open(os.path.join(DATA, "manifest.json")))["cities"]
    fixed = 0
    for slug, a in attrs.items():
        p = os.path.join(ROOT, slug, "index.html")
        if not os.path.exists(p): continue
        h = open(p).read()
        name = man.get(slug, {}).get("name", slug.title())
        total = a["total"]; counts = a["counts"]
        blk = attr_block(slug, name, total, counts)
        # strip any previous attempt
        h = re.sub(r"<!-- ATTRS:START -->.*?<!-- ATTRS:END -->", "", h, flags=re.S)
        h = re.sub(r'<div class="card" id="block-attributes-.*?</script></div>', "", h, flags=re.S)
        # insert before </main>
        if "</main>" in h:
            h = h.replace("</main>", blk + "\n</main>", 1)
        else:
            h = h.replace("</body>", blk + "\n</body>", 1)
        # count-led title for CTR
        new_title = f"Public {NOUN} in {name}: {fmt(total)} Locations — Live Map"
        h = re.sub(r"<title>.*?</title>", f"<title>{html.escape(new_title)}</title>", h, count=1, flags=re.S)
        new_desc = (f"{fmt(total)} public {NOUN} in {name} — free and pay-and-use, 24-hour and "
                    f"wheelchair-accessible, with directions. Map data © OpenStreetMap.")[:155]
        h = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{html.escape(new_desc)}"', h, count=1)
        h = re.sub(r'<meta property="og:title" content="[^"]*"', f'<meta property="og:title" content="{html.escape(new_title)}"', h, count=1)
        h = re.sub(r'<meta property="og:description" content="[^"]*"', f'<meta property="og:description" content="{html.escape(new_desc)}"', h, count=1)
        open(p, "w").write(h)
        fixed += 1
    print(f"city pages rebuilt with attribute block + count titles: {fixed}")

    # homepage: browse-by-city links
    idx = os.path.join(ROOT, "index.html")
    if os.path.exists(idx):
        h = open(idx).read()
        top = sorted(man.items(), key=lambda x: -attrs.get(x[0], {}).get("total", 0))[:24]
        links = "".join(f'<a href="/{s}/">{html.escape(v["name"])} ({fmt(attrs.get(s,{}).get("total",0))})</a>' for s, v in top)
        block = (f'<div class="card" id="block-browse-cities"><h2>🗺 Browse {NOUN} by city</h2>'
                 f'<p>Pick your city for a live map, counts and directions.</p>'
                 f'<div class="cities">{links}</div>'
                 f'<p><a href="/sitemap.xml">All cities in the sitemap →</a></p></div>')
        h = re.sub(r'<div class="card" id="block-browse-cities">.*?</div>\s*</div>', "", h, flags=re.S)
        if "</main>" in h: h = h.replace("</main>", block + "\n</main>", 1)
        elif "</body>" in h: h = h.replace("</body>", block + "\n</body>", 1)
        open(idx, "w").write(h)
        print(f"homepage: browse block added with {len(top)} city links")

if __name__ == "__main__":
    main()

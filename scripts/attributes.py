#!/usr/bin/env python3
"""Attribute layer: compute per-facility attributes from OSM, write data/attributes.json,
and inject a server-rendered attribute block + crowdsource form into every city page."""
import json, os, re, html, time

ROOT = os.environ.get("REPO", ".")
DATA = os.path.join(ROOT, "data")
SITE = os.environ.get("SITE", "https://toiletsnearme.pages.dev")
NOUN = os.environ.get("NOUN", "toilet")

ATTRS = ["free","paid","open24","wheelchair","baby_change","women","water","soap","parking"]

def classify(props):
    """Derive attribute flags from OSM tags only. Unknown stays unknown (None)."""
    p = {k.lower(): str(v).lower() for k, v in (props or {}).items()}
    fee = p.get("fee")
    free = True if fee == "no" else (False if fee == "yes" else None)
    oh = p.get("opening_hours", "")
    open24 = True if ("24/7" in oh or "24 hours" in oh) else (False if oh else None)
    wc = p.get("wheelchair")
    wheel = True if wc in ("yes","limited") else (False if wc == "no" else None)
    baby = True if p.get("changing_table") == "yes" else None
    unisex = p.get("unisex")
    female = p.get("female")
    women = True if (female == "yes" or unisex == "yes") else None
    desc = " ".join([p.get("description",""), p.get("name","")])
    water = True if re.search(r"water|tap|hand ?pump", desc) else None
    soap = True if re.search(r"soap|wash ?basin", desc) else None
    park = True if re.search(r"parking|car ?park", desc) else None
    return {"free":free,"paid":(not free) if free is not None else None,"open24":open24,
            "wheelchair":wheel,"baby_change":baby,"women":women,"water":water,"soap":soap,"parking":park}

def main():
    man_path = os.path.join(DATA, "manifest.json")
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {"cities": {}}
    cities = manifest.get("cities", {})
    out = {"generated": time.strftime("%Y-%m-%d %H:%M IST"), "schema_version": 1,
           "attributes": ATTRS, "cities": {}}
    total_fac = 0
    for slug in sorted(cities):
        fp = os.path.join(DATA, f"{slug}.json")
        if not os.path.exists(fp): continue
        gj = json.load(open(fp))
        feats = gj.get("features", [])
        counts = {a: 0 for a in ATTRS}
        known = {a: 0 for a in ATTRS}
        fac = []
        for i, f in enumerate(feats):
            props = f.get("properties", {}) or {}
            c = classify(props)
            for a in ATTRS:
                if c[a] is True:
                    counts[a] += 1; known[a] += 1
                elif c[a] is False:
                    known[a] += 1
            fac.append({"id": f"{slug}-{i}", "name": props.get("name") or f"{NOUN.title()} #{i+1}",
                        "operator": props.get("operator",""), "attrs": c,
                        "verified_at": None, "updates": 0})
        total_fac += len(feats)
        out["cities"][slug] = {"total": len(feats), "counts": counts, "known": known, "facilities": fac}
        # write page block
        d = os.path.join(ROOT, slug)
        if not os.path.isdir(d): continue
        page = os.path.join(d, "index.html")
        if not os.path.exists(page): continue
        h = open(page).read()
        block = build_block(slug, cities[slug]["name"], len(feats), counts)
        if "<!-- ATTRS:START -->" in h:
            h = re.sub(r"<!-- ATTRS:START -->.*?<!-- ATTRS:END -->", block, h, flags=re.S)
        else:
            h = h.replace("<!-- /BLOCK:CONTENT -->", block + "\n<!-- /BLOCK:CONTENT -->") if "<!-- /BLOCK:CONTENT -->" in h else h.replace("</main>", block + "\n</main>")
        open(page, "w").write(h)
    json.dump(out, open(os.path.join(DATA, "attributes.json"), "w"), indent=1)
    print(f"attributes.json written: {len(out['cities'])} cities, {total_fac} facilities")
    for s in list(out["cities"])[:5]:
        c = out["cities"][s]; print(f"  {s}: {c['total']} fac | free {c['counts']['free']} | 24h {c['counts']['open24']} | wc {c['counts']['wheelchair']}")

def build_block(slug, name, total, counts):
    rows = ""
    labels = {"free":"Free entry","paid":"Paid (₹5–10 typical)","open24":"Open 24 hours",
              "wheelchair":"Wheelchair accessible","baby_change":"Baby changing",
              "women":"Women's section","water":"Water available","soap":"Soap / wash basin",
              "parking":"Parking nearby"}
    for a in ATTRS:
        n = counts.get(a, 0)
        rows += f'<tr><td>{labels[a]}</td><td><b>{n}</b> of {total}</td></tr>\n'
    form = "".join(
        f'<label><input type="checkbox" name="{a}"> {labels[a]}</label> ' for a in
        ["open24","free","wheelchair","baby_change","women","water","soap","parking"])
    return f'''<!-- ATTRS:START -->
<div class="card" id="block-attributes-{slug}"><h2>✅ What you'll actually find ({total} facilities)</h2>
<p>Derived from OpenStreetMap tags for every facility mapped within 100 km of {html.escape(name)}. Blank means not recorded yet — you can fix that below.</p>
<table class="attrs"><thead><tr><th>Feature</th><th>Available</th></tr></thead><tbody>
{rows}</tbody></table></div>
<div class="card" id="block-crowdsource-{slug}"><h2>🙋 Help other travellers — update a facility</h2>
<p>Spot something wrong or missing? Tap what's true and submit. Every update shows a <b>"last verified"</b> date, so the next person knows how fresh it is.</p>
<form id="attrform" onsubmit="return submitAttr(event,'{slug}')">
<fieldset><legend>What did you find?</legend>{form}</fieldset>
<label>Facility name or landmark <input type="text" name="facility" placeholder="e.g. Sulabh near bus stand" required></label>
<label>Cleanliness (1–5) <input type="number" name="clean" min="1" max="5" step="1"></label>
<label>Safety at night (1–5) <input type="number" name="safety" min="1" max="5" step="1"></label>
<label>Note (optional) <input type="text" name="note" maxlength="200" placeholder="e.g. water tap broken"></label>
<button type="submit">Submit update</button>
<p class="legend">No login needed. One update per facility per day. Shown as "reported by visitors, unverified".</p>
</form>
<script>
async function submitAttr(e,slug){{e.preventDefault();const f=e.target;const d={{city:slug}};
new FormData(f).forEach((v,k)=>{{if(k==="facility"||k==="note"||k==="clean"||k==="safety")d[k]=v;else if(v)d["attr_"+k]=1;}});
const b=f.querySelector("button");b.disabled=true;b.textContent="Sending…";
try{{const r=await fetch("/api/attr",{{method:"POST",headers:{{"content-type":"application/json"}},body:JSON.stringify(d)}});
if(r.ok){{b.textContent="✅ Thanks — recorded";f.reset();}}else{{b.textContent="Could not save — try later";b.disabled=false;}}}}
catch(x){{b.textContent="Could not save — try later";b.disabled=false;}}return false;}}
</script></div>
<!-- ATTRS:END -->'''

if __name__ == "__main__":
    main()

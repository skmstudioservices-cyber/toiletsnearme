#!/usr/bin/env python3
"""prediff_check.py — pre-deploy regression gate.
Usage: python3 scripts/prediff_check.py old.html new.html
Extracts structural blocks from both files and reports anything present in OLD
but missing in NEW. Exit 1 if there are unexpected removals, 0 if clean."""
import json, re, sys

def blocks(h):
    b = set()
    b |= {"H1:"+t.strip() for t in re.findall(r"<h1[^>]*>(.*?)</h1>", h, re.S)}
    b |= {"H2:"+re.sub(r"<[^>]+>", "", t).strip() for t in re.findall(r"<h2[^>]*>(.*?)</h2>", h, re.S)}
    b |= {"H3:"+re.sub(r"<[^>]+>", "", t).strip() for t in re.findall(r"<h3[^>]*>(.*?)</h3>", h, re.S)}
    b |= {"SCRIPT:"+m for m in re.findall(r'<script[^>]+src="([^"]+)"', h)}
    b |= {"ID:"+i for i in re.findall(r'id="([^"]+)"', h)}
    b |= {"LINK:"+m for m in re.findall(r'<link[^>]+href="([^"]+)"', h)}
    b |= {"A:"+m for m in re.findall(r'href="(/[^"]*)"', h) if "'+" not in m and "+'" not in m}
    b |= {"JSONLD:"+t for t in re.findall(r'"@type":\s*"([^"]+)"', h)}
    b |= {"META:"+m for m in re.findall(r'<meta[^>]+name="(description|robots)"[^>]*>', h)}
    b |= {"CARD:x%d" % i for i in range(len(re.findall(r'class="card', h)))}
    b |= {"P:"+re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", t)).strip()[:60]
          for t in re.findall(r"<p[^>]*>(.*?)</p>", h, re.S) if len(t) > 40}
    return b

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(2)
    old, new = open(sys.argv[1], encoding="utf-8").read(), open(sys.argv[2], encoding="utf-8").read()
    gone = sorted(blocks(old) - blocks(new))
    added = sorted(blocks(new) - blocks(old))
    print("blocks removed (old -> missing in new):", len(gone))
    for g in gone: print("  -", g[:120])
    print("blocks added:", len(added))
    for a in added[:15]: print("  +", a[:120])
    if gone:
        print("\nREGRESSION GATE: FAIL — confirm each removal is intentional before pushing.")
        sys.exit(1)
    print("\nREGRESSION GATE: PASS — no unexpected removals.")

if __name__ == "__main__":
    main()

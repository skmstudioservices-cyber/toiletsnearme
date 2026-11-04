#!/usr/bin/env python3
"""Standing gate: robots.txt + sitemap validity.

Every failure mode below has actually broken this site at least once.
Exits non-zero on a hard fault so CI blocks the change.
"""
import sys, urllib.request, re, xml.etree.ElementTree as ET

UA = {"User-Agent": "Mozilla/5.0 (compatible; SKMValidator/1.0)"}
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
fails, warns = [], []


def fail(m): fails.append(m)
def warn(m): warns.append(m)


def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)
        return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), b""
    except Exception as e:
        return 0, {}, str(e).encode()


def check_robots(base):
    st, hdr, body = get(base + "/robots.txt")
    if st != 200:
        fail(f"robots.txt returned {st} — Google reports 'Couldn't fetch' for every sitemap")
        return []
    if body.startswith(b"\xef\xbb\xbf"):
        fail("robots.txt starts with a UTF-8 BOM")
    if len(body) > 512000:
        fail("robots.txt is over 500 KB")
    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError:
        fail("robots.txt is not valid UTF-8")
        return []

    seen_ua = in_group = False
    prev_blank = True
    current_ua = None
    sitemaps = []
    for i, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            prev_blank, in_group = True, False
            continue
        if re.match(r"(?i)^sitemap:", line):
            url = line.split(":", 1)[1].strip()
            sitemaps.append(url)
            if in_group:
                fail(f"line {i}: Sitemap directive is inside the '{current_ua}' group — it is file-level")
            if not url.startswith("https://"):
                fail(f"line {i}: Sitemap URL is not absolute https: {url}")
            prev_blank = False
            continue
        m = re.match(r"(?i)^user-agent:\s*(\S+)", line)
        if m:
            if seen_ua and not prev_blank:
                fail(f"line {i}: new User-agent group without a blank line separator")
            seen_ua, in_group, current_ua = True, True, m.group(1)
            prev_blank = False
            continue
        if not seen_ua:
            fail(f"line {i}: directive before the first User-agent: {line}")
        m = re.match(r"(?i)^disallow:\s*(.*)$", line)
        if m and m.group(1).strip() == "/" and current_ua in ("*", "Googlebot"):
            fail(f"line {i}: 'Disallow: /' inside the '{current_ua}' group blocks the whole site")
        prev_blank = False

    if not sitemaps:
        warn("no Sitemap directive found in robots.txt")
    return sitemaps


def check_sitemap(url, host):
    st, hdr, body = get(url)
    if st != 200:
        fail(f"{url} returned {st} — GSC shows 'Couldn't fetch'")
        return
    ct = (hdr.get("content-type") or hdr.get("Content-Type") or "").lower()
    if "xml" not in ct:
        fail(f"{url} content-type is '{ct}', not XML")
    if "noindex" in (hdr.get("x-robots-tag") or hdr.get("X-Robots-Tag") or "").lower():
        fail(f"{url} sends X-Robots-Tag: noindex — Google discards it")
    if body.startswith(b"\xef\xbb\xbf"):
        fail(f"{url} starts with a UTF-8 BOM")
    if len(body) > 50 * 1024 * 1024:
        fail(f"{url} is over 50 MB")
    try:
        root = ET.fromstring(body)
    except Exception as e:
        fail(f"{url} does not parse as XML: {e}")
        return
    if root.tag not in (f"{NS}urlset", f"{NS}sitemapindex"):
        fail(f"{url} root element is {root.tag} — wrong xmlns")
    locs = [e.text or "" for e in root.iter(f"{NS}loc")]
    if not locs:
        fail(f"{url} contains zero <loc> entries")
    if len(locs) > 50000:
        fail(f"{url} has {len(locs)} URLs — over the 50,000 limit")
    for loc in locs:
        if loc != loc.strip() or "\n" in loc:
            fail(f"whitespace inside <loc>: {loc!r}")
            break
    bad = [l for l in locs if not l.startswith("https://" + host)]
    if bad:
        fail(f"{len(bad)} <loc> values are not on https://{host} (first: {bad[0]})")
    print(f"  {url}: {len(locs)} URLs, content-type ok")


if __name__ == "__main__":
    base = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
    if not base.startswith("http"):
        print("usage: validate-robots-sitemap.py https://example.com")
        sys.exit(2)
    host = base.split("://", 1)[1]
    print(f"checking {base}")
    sms = check_robots(base) or [base + "/sitemap.xml"]
    for s in sms:
        check_sitemap(s, host)
    for w in warns:
        print("WARN", w)
    for f in fails:
        print("FAIL", f)
    print(f"\n{len(fails)} failure(s), {len(warns)} warning(s)")
    sys.exit(1 if fails else 0)

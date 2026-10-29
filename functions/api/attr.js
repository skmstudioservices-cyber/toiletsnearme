// Cloudflare Pages Function — crowdsourced facility attributes
// POST /api/attr  { city, facility, attr_open24, attr_free, ..., clean, safety, note }
// Stores in KV binding ATTR_KV (create once in the Pages dashboard).
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }

  if (!env.ATTR_KV) {
    return json({ error: "not_configured", hint: "Create a KV namespace and bind it as ATTR_KV in Pages settings." }, 503);
  }
  const city = String(body.city || "").slice(0, 60);
  const facility = String(body.facility || "").slice(0, 120).trim();
  if (!city || !facility) return json({ error: "city and facility required" }, 400);

  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";
  const ipHash = await sha(ip + "|" + city);
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = `rl:${ipHash}:${day}`;
  const used = parseInt((await env.ATTR_KV.get(rlKey)) || "0", 10);
  if (used >= 10) return json({ error: "rate_limited", hint: "Max 10 updates per day." }, 429);
  await env.ATTR_KV.put(rlKey, String(used + 1), { expirationTtl: 86400 });

  const attrs = {};
  for (const k of Object.keys(body)) if (k.startsWith("attr_")) attrs[k.slice(5)] = true;
  const rec = {
    city, facility,
    attrs,
    clean: clamp(body.clean), safety: clamp(body.safety),
    note: String(body.note || "").slice(0, 200),
    at: new Date().toISOString(), ip_hash: ipHash,
  };
  const key = `upd:${city}:${Date.now()}:${ipHash.slice(0, 8)}`;
  await env.ATTR_KV.put(key, JSON.stringify(rec));
  return json({ ok: true, message: "Thanks — recorded. Shown as reported by visitors, unverified." });
}

function clamp(v) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : null; }
async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

(function () {
  var SB_URL = "https://timnrnmmmmuqmcnuaend.supabase.co";
  var SB_KEY = "sb_publishable_HDo7lgQV4FBbLmfmSmTVmA_mT7NJIJ8";
  var SB_TABLE = "popup_feedback_toilets";
  var MIN = 30, MAX = 300;
  var page = location.pathname; // Never collect query strings, fragments, referrers or identifiers.

  try {
    var last = +localStorage.getItem("fbk_shown_at") || 0;
    if (Date.now() - last < 86400000) return;
  } catch (e) {}

  var delay = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  var shownAt = null;

  // Store only an intentional answer. Dismissals/impressions are not tracked.
  function log(responseType, transcript) {
    try {
      fetch(SB_URL + "/rest/v1/" + SB_TABLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_KEY,
          "Authorization": "Bearer " + SB_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          path: page,
          delay_seconds: delay,
          shown_at: shownAt,
          responded: true,
          response_type: responseType,
          transcript: String(transcript || "").slice(0, 500)
        })
      }).catch(function () {});
    } catch (e) {}
  }

  setTimeout(function () {
    shownAt = new Date().toISOString();
    try { localStorage.setItem("fbk_shown_at", Date.now()); } catch (e) {}
    if (document.getElementById("fbkx")) return;

    var ov = document.createElement("div");
    ov.id = "fbkx";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px";
    var card = document.createElement("div");
    card.style.cssText = "background:#fff;border-radius:16px;max-width:420px;width:100%;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit";
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1rem">🎤 Help us improve</b><button id="fbkno" style="border:none;background:none;font-size:1.1rem;cursor:pointer;color:#64748b" aria-label="Skip">✕</button></div>'
      + '<p style="margin:8px 0 10px;color:#334155;font-size:.92rem">What is the <b>one thing</b> missing on this site?</p>'
      + '<div style="display:flex;gap:8px;align-items:flex-start">'
      + '<button id="fbkmic" type="button" style="flex:none;width:44px;height:44px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:1.15rem;cursor:pointer" title="Answer with voice">🎤</button>'
      + '<textarea id="fbktxt" rows="3" maxlength="500" placeholder="…or type it here" style="flex:1;padding:10px;border-radius:10px;border:1px solid #cbd5e1;font:inherit;font-size:.9rem;resize:vertical"></textarea></div>'
      + '<div id="fbkqk" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"></div>'
      + '<div id="fbkst" role="status" aria-live="polite" style="font-size:.75rem;color:#64748b;margin-top:6px;min-height:1em"></div>'
      + '<button id="fbkok" type="button" style="margin-top:8px;width:100%;padding:10px;border-radius:10px;border:none;background:#0f172a;color:#fff;font-weight:700;cursor:pointer;font-size:.9rem">Send feedback</button>'
      + '<div style="font-size:.68rem;color:#94a3b8;margin-top:8px;text-align:center">Only feedback you submit and this page path are sent. Skipping is not recorded. See the <a href="/privacy/" style="color:inherit;text-decoration:underline" target="_blank" rel="noopener noreferrer">privacy policy</a>.</div>';
    ov.appendChild(card);
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    var quick = ["✅ Found one on this map", "❌ Nothing usable near me", "ℹ️ Details were wrong", "➕ Add more places"];
    var qk = document.getElementById("fbkqk");
    quick.forEach(function (label) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "padding:8px 12px;border-radius:999px;border:2px solid #cbd5e1;background:#fff;font-weight:700;font-size:.8rem;cursor:pointer;font-family:inherit;color:#0f172a";
      b.onclick = function () {
        log("quick", label);
        card.innerHTML = '<div style="text-align:center;padding:8px 0"><div style="font-size:1.6rem">👍</div><b>Thank you!</b><p style="color:#64748b;font-size:.85rem;margin-top:4px">Your feedback shapes what we build next.</p></div>';
        setTimeout(close, 1600);
      };
      qk.appendChild(b);
    });

    document.getElementById("fbkno").onclick = close;
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });

    var responseType = "text", rec = null;
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var mic = document.getElementById("fbkmic");
    if (!SpeechRecognition) {
      mic.disabled = true;
      mic.style.opacity = ".4";
      mic.title = "Voice input is not supported in this browser";
    } else {
      mic.onclick = function () {
        if (rec) { rec.stop(); return; }
        rec = new SpeechRecognition();
        rec.lang = "en-IN";
        rec.interimResults = true;
        rec.continuous = false;
        var status = document.getElementById("fbkst");
        rec.onstart = function () {
          responseType = "voice";
          status.textContent = "🎤 Listening… speak now";
          mic.style.background = "#16a34a";
        };
        rec.onresult = function (e) {
          var value = "";
          for (var i = 0; i < e.results.length; i++) value += e.results[i][0].transcript;
          document.getElementById("fbktxt").value = value.slice(0, 500);
        };
        rec.onerror = function () {
          status.textContent = "Could not hear you — type instead?";
          mic.style.background = "#ef4444";
          rec = null;
        };
        rec.onend = function () {
          if (status.textContent === "🎤 Listening… speak now") status.textContent = "Voice captured — edit if needed, then Send";
          mic.style.background = "#ef4444";
          rec = null;
        };
        rec.start();
      };
    }

    document.getElementById("fbkok").onclick = function () {
      var value = document.getElementById("fbktxt").value.trim().slice(0, 500);
      if (!value) {
        document.getElementById("fbkst").textContent = "Type or speak something first — or skip with ✕";
        return;
      }
      log(responseType, value);
      card.innerHTML = '<div style="text-align:center;padding:8px 0"><div style="font-size:1.6rem">👍</div><b>Thank you!</b><p style="color:#64748b;font-size:.85rem;margin-top:4px">Your feedback shapes what we build next.</p></div>';
      setTimeout(close, 1600);
    };
  }, delay * 1000);
})();
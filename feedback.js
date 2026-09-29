(function(){
  var SB_URL="https://timnrnmmmmuqmcnuaend.supabase.co", SB_KEY="sb_publishable_HDo7lgQV4FBbLmfmSmTVmA_mT7NJIJ8", SB_TABLE="popup_feedback_toilets";
  var SITE=(document.currentScript&&document.currentScript.dataset.site)||location.hostname;
  var MIN=30,MAX=300;
  try{var last=+localStorage.getItem('fbk_shown_at')||0;if(Date.now()-last<86400000)return;}catch(e){}
  var sid=null;try{sid=sessionStorage.getItem('fbk_sid');if(!sid){sid=(crypto.randomUUID?crypto.randomUUID():'s'+Date.now()+Math.random().toString(36).slice(2));sessionStorage.setItem('fbk_sid',sid);}}catch(e){sid='err';}
  var delay=Math.floor(Math.random()*(MAX-MIN+1))+MIN;
  function log(row){try{fetch(SB_URL+'/rest/v1/'+SB_TABLE,{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Prefer':'return=minimal'},body:JSON.stringify(row)}).catch(function(){});}catch(e){}}
  var page=location.pathname, url=location.href, referrer=document.referrer||'';
  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  setTimeout(function(){
    try{localStorage.setItem('fbk_shown_at',Date.now());}catch(e){}
    log({url:url,path:page,referrer:referrer,delay_seconds:delay,shown_at:new Date().toISOString(),responded:false,response_type:null,transcript:null,session_id:sid,user_agent:navigator.userAgent.slice(0,200)});
    if(document.getElementById('fbkx'))return;
    var ov=document.createElement('div');ov.id='fbkx';
    ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:16px';
    var card=document.createElement('div');
    card.style.cssText='background:#fff;border-radius:16px;max-width:420px;width:100%;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:1rem">\uD83C\uDFA4 Help us improve</b><button id="fbkno" style="border:none;background:none;font-size:1.1rem;cursor:pointer;color:#64748b" aria-label="Skip">\u2715</button></div>'
      +'<p style="margin:8px 0 10px;color:#334155;font-size:.92rem">What is the <b>one thing</b> missing on this site?</p>'
      +'<div style="display:flex;gap:8px;align-items:flex-start">'
      +'<button id="fbkmic" style="flex:none;width:44px;height:44px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:1.15rem;cursor:pointer" title="Answer with voice">\uD83C\uDFA4</button>'
      +'<textarea id="fbktxt" rows="3" placeholder="\u2026or type it here" style="flex:1;padding:10px;border-radius:10px;border:1px solid #cbd5e1;font:inherit;font-size:.9rem;resize:vertical"></textarea></div>'
      +'<div id="fbkst" style="font-size:.75rem;color:#64748b;margin-top:6px;min-height:1em"></div>'
      +'<button id="fbkok" style="margin-top:8px;width:100%;padding:10px;border-radius:10px;border:none;background:#0f172a;color:#fff;font-weight:700;cursor:pointer;font-size:.9rem">Send feedback</button>'
      +'<div style="font-size:.68rem;color:#94a3b8;margin-top:8px;text-align:center">Only your answer, page and browser info \u2014 see the <a href=\'/privacy/\' style=\'color:inherit;text-decoration:underline\' target=\'_blank\'>privacy policy</a>.</div>';
    ov.appendChild(card);document.body.appendChild(ov);
    function close(){ov.remove();}
    document.getElementById('fbkno').onclick=close;
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    var rtype='text', rec=null, SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){var m=document.getElementById('fbkmic');m.disabled=true;m.style.opacity=.4;m.title='Voice not supported in this browser';}
    else{
      document.getElementById('fbkmic').onclick=function(){
        if(rec){rec.stop();return;}
        rec=new SR();rec.lang='en-IN';rec.interimResults=true;rec.continuous=false;
        var st=document.getElementById('fbkst');
        rec.onstart=function(){rtype='voice';st.textContent='\uD83C\uDFA4 Listening\u2026 speak now';document.getElementById('fbkmic').style.background='#16a34a';};
        rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;document.getElementById('fbktxt').value=t;};
        rec.onerror=function(){st.textContent='Could not hear you \u2014 type instead?';document.getElementById('fbkmic').style.background='#ef4444';rec=null;};
        rec.onend=function(){st.textContent=st.textContent==('\uD83C\uDFA4 Listening\u2026 speak now')?'Voice captured \u2014 edit if needed, then Send':st.textContent;document.getElementById('fbkmic').style.background='#ef4444';rec=null;};
        rec.start();
      };
    }
    document.getElementById('fbkok').onclick=function(){
      var v=document.getElementById('fbktxt').value.trim();
      if(!v){document.getElementById('fbkst').textContent='Type or speak something first \u2014 or skip with \u2715';return;}
      log({url:url,path:page,referrer:referrer,delay_seconds:delay,shown_at:new Date().toISOString(),responded:true,response_type:rtype,transcript:v.slice(0,500),session_id:sid,user_agent:navigator.userAgent.slice(0,200)});
      card.innerHTML='<div style="text-align:center;padding:8px 0"><div style="font-size:1.6rem">\uD83D\uDC4D</div><b>Thank you!</b><p style="color:#64748b;font-size:.85rem;margin-top:4px">Your feedback shapes what we build next.</p></div>';
      setTimeout(close,1600);
    };
  }, delay*1000);
})();
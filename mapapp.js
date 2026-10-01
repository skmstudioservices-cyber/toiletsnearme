/* mapapp.js — unified map for SKM "near me" sites.
   All-city data · numbered clusters · rich popups · place/pincode/DIGIPIN search
   · origin-based on-page routing (place / DIGIPIN / lat,lon / pincode / my location).
   Runs on home+city pages (window.CFG) and keyword-page embeds (window.KWMAP_CFG). */
(function(){
"use strict";
var C = window.CFG;
var EMBED = false;
if (!C) { C = window.KWMAP_CFG; EMBED = true; if (!C) return; }
var ac = C.ac || "#0d9488";
var mapEl = EMBED ? document.getElementById("kwmap") : document.getElementById("map");
if (!mapEl) return;

/* ---------- cluster CSS ---------- */
if (!document.getElementById("mc-css")) {
  [["mc-css","https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"],
   ["mc-css2","https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"]]
  .forEach(function(p){
    var l=document.createElement("link"); l.id=p[0]; l.rel="stylesheet"; l.href=p[1];
    document.head.appendChild(l);
  });
}

/* ---------- DIGIPIN encode + decode ---------- */
var GRID=[["F","C","9","8"],["J","3","2","7"],["K","4","5","6"],["L","M","P","T"]];
var B={minLat:2.5,maxLat:38.5,minLon:63.5,maxLon:99.5};
function getDigiPin(lat,lon){
  if(lat<B.minLat||lat>B.maxLat||lon<B.minLon||lon>B.maxLon)return null;
  var mnLt=B.minLat,mxLt=B.maxLat,mnLn=B.minLon,mxLn=B.maxLon,pin="";
  for(var i=0;i<10;i++){
    var ld=(mxLt-mnLt)/4,nd=(mxLn-mnLn)/4;
    var row=3-Math.floor((lat-mnLt)/ld),col=Math.floor((lon-mnLn)/nd);
    row=Math.max(0,Math.min(row,3));col=Math.max(0,Math.min(col,3));
    pin+=GRID[row][col];
    mxLt=mnLt+ld*(4-row);mnLt=mnLt+ld*(3-row);mnLn=mnLn+nd*col;mxLn=mnLn+nd*(col+1);
  }
  return pin.toUpperCase();
}
function fromDigiPin(pin){
  pin=(pin||"").toUpperCase().replace(/[^FC98J327K456LMPT]/g,"");
  if(pin.length!==10)return null;
  var mnLt=B.minLat,mxLt=B.maxLat,mnLn=B.minLon,mxLn=B.maxLon;
  for(var i=0;i<10;i++){
    var ld=(mxLt-mnLt)/4,nd=(mxLn-mnLn)/4,r=-1,c=-1;
    for(var y=0;y<4;y++)for(var x=0;x<4;x++)if(GRID[y][x]===pin[i]){r=y;c=x;}
    if(r<0)return null;
    mxLt=mnLt+ld*(4-r);mnLt=mnLt+ld*(3-r);mnLn=mnLn+nd*c;mxLn=mnLn+nd*(c+1);
  }
  return {lat:+((mnLt+mxLt)/2).toFixed(6),lon:+((mnLn+mxLn)/2).toFixed(6)};
}

/* ---------- state ---------- */
var L_=window.L,map,cluster=null,routeL=null,all=[],flts={},q="",dest=null,TF={};
var searchMk=null,routeinfo=null,resultsEl=null,geoTimer=null;
(C.filters||[]).forEach(function(f){TF[f.k]=new Function("p","return ("+f.t+")");});
var count=document.getElementById(EMBED?"kwcount":"count");
var toastEl=document.getElementById("toast");
function toast(m){
  if(!toastEl){if(count)count.textContent=m;return;}
  toastEl.textContent=m;toastEl.classList.add("show");
  setTimeout(function(){toastEl.classList.remove("show");},2000);
}
window.copyT=function(t){if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast("Copied \u2713");});};

/* ---------- map init ---------- */
map=L_.map(mapEl);
if(C.startCity&&C.cities[C.startCity])map.setView([C.cities[C.startCity].lat,C.cities[C.startCity].lon],11);
else if(EMBED){var dk=C.def||Object.keys(C.cities)[0];map.setView([C.cities[dk].lat,C.cities[dk].lon],11);}
else map.setView([22.8,79],4);
L_.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
function ICONFN(c){
  var n=c.getChildCount(),s=n<100?"small":(n<1000?"medium":"large");
  return L_.divIcon({html:'<div><span>'+n.toLocaleString("en-IN")+"</span></div>",
    className:"marker-cluster marker-cluster-"+s,iconSize:L_.point(40,40)});
}
/* markercluster plugin was never loaded (CSS only) -> L.markerClusterGroup was undefined.
   Load it; if it fails, fall back to a plain layerGroup so pins ALWAYS render. */
if(!(window.L&&window.L.markerClusterGroup)){
  (function(){var s=document.createElement("script");
    s.src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";s.async=true;
    s.onload=function(){try{if(typeof render==="function"&&all.length)render();}catch(e){}};
    document.head.appendChild(s);})();
}
function mkCluster(){
  if(!L_.markerClusterGroup)return L_.layerGroup();
  return L_.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:55,spiderfyOnMaxZoom:true,iconCreateFunction:ICONFN});
}
cluster=mkCluster();

/* ---------- load ALL cities ---------- */
function loadAll(){
  var keys=Object.keys(C.cities),done=0;
  keys.forEach(function(s){
    fetch("/data/"+s+".json").then(function(r){return r.json();}).then(function(g){
      (g.features||[]).forEach(function(f){f._city=s;all.push(f);});
    }).catch(function(){}).then(function(){
      done++;
      if(done===keys.length){
        if(count)count.textContent=all.length.toLocaleString("en-IN")+" "+C.poiname+"s across "+keys.length+" cities \u00b7 \u00a9 OpenStreetMap";
        var cc=document.getElementById("citycount");
        if(cc&&C.startCity){var cn=0;all.forEach(function(f){if(f._city===C.startCity)cn++;});cc.textContent=cn.toLocaleString("en-IN");}
        render();
      }
    });
  });
}

/* ---------- popup ---------- */
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
function pp(f){
  var p=f.properties||{},lat=f.geometry.coordinates[1],lon=f.geometry.coordinates[0];
  var title=p.name||p.operator||p.brand||C.poiname;
  var h='<div class="pp"><b>'+esc(title)+'</b>';
  (C.popup||[]).forEach(function(fld){
    if(!p[fld.k])return;
    var v=esc(p[fld.k]);
    if(fld.b)v=({yes:"\u2705 yes",no:"\u274c no",limited:"\ud83d\udfe1 limited"}[p[fld.k]]||v);
    h+='<div class="row">'+fld.l+": "+v+'</div>';
  });
  if(p.description)h+='<div class="row">\ud83d\udcd3 '+esc(p.description).slice(0,140)+'</div>';
  if(C.cities[f._city])h+='<div class="row">\ud83d\udccd <a href="/'+f._city+'/">'+esc(C.cities[f._city].name)+" guide</a></div>";
  var dp=getDigiPin(lat,lon);
  if(dp)h+='<div class="row">\ud83d\uded1 DIGIPIN <b>'+dp+"</b> <span class='cpl' onclick=\"copyT('"+dp+"')\">copy</span></div>";
  h+='<button class="dirb" onclick="MA.routeTo('+lat+','+lon+')">\ud83e\udded Route to this '+esc(C.poiname)+"</button></div>";
  return h;
}

/* ---------- render ---------- */
function render(){
  if(cluster)map.removeLayer(cluster);
  cluster=mkCluster();
  all.forEach(function(f){
    var p=f.properties||{};
    if(q&&JSON.stringify(p).toLowerCase().indexOf(q)<0)return;
    for(var k in flts)if(flts[k]&&!TF[k](p))return;
    var lat=f.geometry.coordinates[1],lon=f.geometry.coordinates[0];
    var m=L_.circleMarker([lat,lon],{radius:7,weight:1.5,color:"#0f172a",
      fillColor:p.fee==="no"?"#34d399":(p.fee==="yes"?"#f59e0b":ac),fillOpacity:.95});
    m.bindPopup(pp(f),{maxWidth:300});
    cluster.addLayer(m);
  });
  map.addLayer(cluster);
  updateCount();
}
function updateCount(){
  if(!count)return;
  var b=map.getBounds(),n=0;
  for(var i=0;i<all.length;i++){
    var la=all[i].geometry.coordinates[1],lo=all[i].geometry.coordinates[0];
    if(b.contains([la,lo]))n++;
  }
  count.textContent=n.toLocaleString("en-IN")+" "+C.poiname+"s in view \u00b7 total "+all.length.toLocaleString("en-IN")+" \u00b7 \u00a9 OpenStreetMap";
}
map.on("moveend zoomend",updateCount);

/* ---------- geocoding ---------- */
function closeResults(){if(resultsEl){resultsEl.remove();resultsEl=null;}}
function showResults(list,cb,inp){
  closeResults();
  resultsEl=document.createElement("div");
  resultsEl.style.cssText="position:absolute;z-index:9999;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 10px 30px rgba(15,23,42,.18);max-height:250px;overflow:auto;min-width:260px;font-size:.85rem";
  list.forEach(function(it){
    var d=document.createElement("div");
    d.style.cssText="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9";
    d.textContent=it.label;
    d.onmouseover=function(){d.style.background="#f1f5f9";};
    d.onmouseout=function(){d.style.background="";};
    d.onclick=function(){cb(it);closeResults();};
    resultsEl.appendChild(d);
  });
  document.body.appendChild(resultsEl);
  var r=inp.getBoundingClientRect();
  resultsEl.style.left=r.left+"px";resultsEl.style.top=(r.bottom+6)+"px";
  resultsEl.style.width=Math.max(260,r.width)+"px";
}
function geocode(term,cb,isPostal){
  var u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in&"+(isPostal?("postalcode="+encodeURIComponent(term)):("q="+encodeURIComponent(term)));
  fetch(u,{headers:{Accept:"application/json"}}).then(function(r){return r.json();}).then(function(d){
    cb((d||[]).map(function(x){return{label:x.display_name,lat:+x.lat,lon:+x.lon};}));
  }).catch(function(){cb([]);});
}
function parseOrigin(v,cb){
  v=(v||"").trim();
  var m=v.match(/^(-?\d{1,2}\.\d+)[ ,]+(-?\d{1,3}\.\d+)$/);
  if(m)return cb({lat:+m[1],lon:+m[2],label:v});
  var d=v.replace(/\s/g,"");
  if(/^[FfCc98Jj327Kk456LlMmPpTt]{10}$/.test(d)){
    var g=fromDigiPin(d);
    if(g)return cb({lat:g.lat,lon:g.lon,label:"DIGIPIN "+d.toUpperCase()});
    return cb(null);
  }
  if(/^\d{6}$/.test(v))return geocode(v,function(r){cb(r[0]||null);},true);
  if(v.length<3)return cb(null);
  geocode(v,function(r){cb(r[0]||null);});
}

/* ---------- search ---------- */
function resolveQuery(v,cb){
  v=(v||"").trim();
  var m=v.match(/^(-?\d{1,2}\.\d+)[ ,]+(-?\d{1,3}\.\d+)$/);
  if(m)return cb([{label:"\ud83d\udccd "+v,lat:+m[1],lon:+m[2]}]);
  var d=v.replace(/\s/g,"");
  if(/^[FfCc98Jj327Kk456LlMmPpTt]{10}$/.test(d)){
    var g=fromDigiPin(d);
    if(g)return cb([{label:"\ud83d\uded1 DIGIPIN "+d.toUpperCase()+" (4m precision)",lat:g.lat,lon:g.lon}]);
  }
  if(/^\d{6}$/.test(v))return geocode(v,cb,true);
  if(v.length>=3)return geocode(v,cb,false);
  cb([]);
}
function bindSearch(inp){
  inp.placeholder="Search any place, pincode, DIGIPIN or lat,lon\u2026";
  inp.setAttribute("autocomplete","off");
  inp.addEventListener("input",function(e){
    q=e.target.value.toLowerCase();render();
    clearTimeout(geoTimer);
    var v=e.target.value.trim();
    if(!v){closeResults();return;}
    geoTimer=setTimeout(function(){
      resolveQuery(v,function(list){
        if(!list.length)return;
        showResults(list,function(it){
          map.flyTo([it.lat,it.lon],Math.max(map.getZoom(),13),{duration:1});
          if(searchMk)map.removeLayer(searchMk);
          searchMk=L_.circleMarker([it.lat,it.lon],{radius:9,color:"#0f172a",weight:3,fillColor:ac,fillOpacity:1})
            .addTo(map).bindPopup("<b>"+esc(it.label)+"</b><br><span class='cpl' onclick='MA.clearPin()'>clear \u2715</span>").openPopup();
        },inp);
      });
    },550);
  });
  inp.addEventListener("keydown",function(e){
    if(e.key==="Enter"){
      clearTimeout(geoTimer);closeResults();
      resolveQuery(inp.value.trim(),function(list){
        if(!list.length){toast("Nothing found \u2014 try a place, pincode, DIGIPIN or lat,lon");return;}
        map.flyTo([list[0].lat,list[0].lon],Math.max(map.getZoom(),13),{duration:1});
      });
    }
  });
}
var qEl=document.getElementById(EMBED?"kwq":"q");
if(qEl)bindSearch(qEl);
window.MA={clearPin:function(){if(searchMk){map.removeLayer(searchMk);searchMk=null;}}};

/* ---------- origin bar + routing ---------- */
var originWrap=document.createElement("div");
originWrap.style.cssText="display:none;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0 0";
originWrap.innerHTML='<input id="origin" placeholder="From: place name, DIGIPIN, lat,lon or pincode" '+
  'style="flex:1;min-width:220px;padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1;font-family:inherit;font-size:.9rem">'+
  '<button id="origingo" style="padding:10px 14px;border-radius:10px;border:none;background:'+ac+';color:#fff;font-weight:700;cursor:pointer;font-size:.85rem">\ud83e\udded Draw route</button>'+
  '<button id="originme" style="padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;font-weight:700;cursor:pointer;font-size:.85rem">\ud83d\udccd My location</button>'+
  '<span style="font-size:.72rem;color:#94a3b8">routes \u00b7 OSRM \u00b7 search \u00b7 Nominatim (OSM)</span>';
var mapbar=(EMBED?mapEl.parentNode:mapEl.parentNode.querySelector(".mapbar"))||mapEl.parentNode;
try{ mapEl.parentNode.insertBefore(originWrap,mapEl); }catch(e){ mapbar.appendChild(originWrap); }
routeinfo=document.getElementById("routeinfo");
if(!routeinfo){
  routeinfo=document.createElement("span");routeinfo.id="routeinfo";
  routeinfo.style.cssText="display:none;font-size:.85rem;font-weight:700;color:#0f172a;background:"+(C.acsoft||"#ccfbf1")+";border:1px solid "+ac+";padding:6px 12px;border-radius:8px";
  try{ originWrap.parentNode.insertBefore(routeinfo,originWrap); }catch(e){ originWrap.parentNode.appendChild(routeinfo); }
}
MA.routeTo=function(lat,lon){
  originWrap.style.display="flex";
  if(routeinfo){routeinfo.style.display="inline-block";routeinfo.textContent="Pick your starting point \u2193";}

  dest=[lat,lon];
  try{originWrap.scrollIntoView({behavior:"smooth",block:"nearest"});}catch(e){}
  toast("Enter your starting point below");
  document.getElementById("origin").focus();
};
function setRouteInfo(html){if(routeinfo){routeinfo.style.display="inline-block";routeinfo.innerHTML=html;}}
function drawRoute(fLat,fLon,quiet){
  if(!dest){toast("Tap a "+C.poiname+" pin first");return;}
  if(!quiet)toast("Finding route\u2026");
  fetch("https://router.project-osrm.org/route/v1/driving/"+fLon+","+fLat+";"+dest[1]+","+dest[0]+"?overview=full&geometries=geojson")
   .then(function(r){return r.json();}).then(function(d){
     if(routeL)map.removeLayer(routeL);
     if(!d.routes||!d.routes[0]){drawLine(fLat,fLon);return;}
     var hadGeom=!!nav.geom;
     routeL=L_.geoJSON(d.routes[0].geometry,{style:{color:ac,weight:5,opacity:.85}}).addTo(map);
     if(!quiet||!nav.active||!hadGeom)map.fitBounds(routeL.getBounds(),{padding:[30,30]});
     nav.geom=d.routes[0].geometry.coordinates;
     nav.from=[fLat,fLon];
     var km=(d.routes[0].distance/1000).toFixed(1),min=Math.round(d.routes[0].duration/60);
     setRouteInfo("\ud83e\udded "+km+" km \u00b7 ~"+min+" min "+(nav.active?"left":"drive")+" <span class='cpl' onclick='MA.stopNav()'>\u25a0 stop live</span> <span class='cpl' onclick='MA.clearRoute()'>\u2715</span>");
     if(!quiet)toast("Route drawn on map \u2713 \u2014 tap \u25b6 Start live to follow");
   }).catch(function(){if(!quiet)drawLine(fLat,fLon);});
}
/* ---------- live follow navigation ---------- */
var nav={active:false,watch:null,umk:null,acirc:null,geom:null,from:null,lastCalc:0};
function hav(a,b,c,d){var R=6371000,t=Math.PI/180,dl=(c-a)*t,dn=(d-b)*t;
  var x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a*t)*Math.cos(c*t)*Math.sin(dn/2)*Math.sin(dn/2);
  return 2*R*Math.asin(Math.sqrt(x));}
function distToRoute(la,lo){
  if(!nav.geom)return 1e9;
  var best=1e9;
  for(var i=0;i<nav.geom.length;i+=2){
    var d=hav(la,lo,nav.geom[i][1],nav.geom[i][0]);
    if(d<best)best=d;
  }
  return best;
}
function startNav(){
  if(!dest){toast("Pick a destination pin first");return;}
  if(!navigator.geolocation){toast("Geolocation not supported");return;}
  MA.stopNav();
  nav.active=true;
  toast("Live navigation on \u2014 follow the line");
  setRouteInfo("\ud83d\udccd locating you\u2026 <span class='cpl' onclick='MA.stopNav()'>\u25a0 stop</span>");
  nav.watch=navigator.geolocation.watchPosition(function(p){
    var la=p.coords.latitude,lo=p.coords.longitude,acc=p.coords.accuracy;
    if(!nav.umk){
      nav.umk=L_.circleMarker([la,lo],{radius:9,color:"#fff",weight:3,fillColor:"#2563eb",fillOpacity:1,zIndexOffset:1000}).addTo(map)
        .bindTooltip("You",{permanent:true,direction:"top",offset:[0,-10]});
      nav.acirc=L_.circle([la,lo],{radius:acc||50,color:"#2563eb",weight:1,fillColor:"#2563eb",fillOpacity:.12}).addTo(map);
      map.setView([la,lo],Math.max(map.getZoom(),15));
    }else{
      nav.umk.setLatLng([la,lo]);
      nav.acirc.setLatLng([la,lo]).setRadius(acc||50);
      if(!map.getBounds().pad(-.25).contains([la,lo]))map.panTo([la,lo]);
    }
    var dTo=hav(la,lo,dest[0],dest[1]);
    if(dTo<60){toast("\ud83c\udf89 You have arrived!");MA.stopNav();return;}
    var off=distToRoute(la,lo),now=Date.now();
    var moved=nav.from?hav(la,lo,nav.from[0],nav.from[1]):1e9;
    if(off>200){toast("Re-routing\u2026");drawRoute(la,lo,true);nav.lastCalc=now;return;}
    if((now-nav.lastCalc>25000&&moved>100)||!nav.geom){drawRoute(la,lo,true);nav.lastCalc=now;}
  },function(){toast("Location unavailable \u2014 check permission");MA.stopNav();},
  {enableHighAccuracy:true,maximumAge:3000,timeout:15000});
}
MA.stopNav=function(){
  if(nav.watch!==null){navigator.geolocation.clearWatch(nav.watch);nav.watch=null;}
  if(nav.umk){map.removeLayer(nav.umk);nav.umk=null;}
  if(nav.acirc){map.removeLayer(nav.acirc);nav.acirc=null;}
  if(nav.active){nav.active=false;toast("Live navigation off");}
  nav.geom=null;
};
MA.startNav=startNav;
MA.clearRoute=function(){if(routeL){map.removeLayer(routeL);routeL=null;}if(routeinfo){routeinfo.innerHTML="";routeinfo.style.display="none";}};
function drawLine(a,b){
  if(routeL)map.removeLayer(routeL);
  routeL=L_.polyline([[a,b],[dest[0],dest[1]]],{color:ac,weight:4,dashArray:"8 8"}).addTo(map);
  map.fitBounds(routeL.getBounds(),{padding:[30,30]});
  setRouteInfo("\ud83e\udded straight-line shown (route service busy)");
}
document.getElementById("origingo").onclick=function(){
  parseOrigin(document.getElementById("origin").value,function(pt){
    if(!pt){toast("Could not find that place \u2014 try a pincode or lat,lon");return;}
    if(!dest){toast("Tap a "+C.poiname+" pin first, then route");return;}
    drawRoute(pt.lat,pt.lon);
  });
};
document.getElementById("originme").onclick=function(){
  if(!dest){toast("Tap a "+C.poiname+" pin first, then route");return;}
  if(!navigator.geolocation){toast("Geolocation not supported");return;}
  navigator.geolocation.getCurrentPosition(function(p){drawRoute(p.coords.latitude,p.coords.longitude);},
    function(){toast("Location not allowed \u2014 type your start point instead");});
};
(function(){
  var b=document.createElement("button");
  b.type="button";b.id="navbtn";
  b.textContent="\u25b6 Start live (follow me)";
  b.style.cssText="padding:10px 14px;border-radius:10px;border:2px solid "+ac+";background:#fff;color:#0f172a;font-weight:800;cursor:pointer;font-size:.85rem";
  b.onclick=function(){startNav();};
  originWrap.insertBefore(b,originWrap.lastChild);
})();

/* ---------- non-embed extras ---------- */
if(!EMBED){
  var locbtn=document.getElementById("locbtn");
  if(locbtn)locbtn.onclick=function(){
    if(!navigator.geolocation)return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(function(p){map.flyTo([p.coords.latitude,p.coords.longitude],13,{duration:1});},
      function(){alert("Location permission denied");});
  };
  var chips=document.getElementById("chips");
  if(chips)chips.querySelectorAll("a.chip").forEach(function(a){
    a.addEventListener("click",function(e){
      e.preventDefault();
      var slug=(a.getAttribute("href")||"").replace(/\//g,"");
      if(C.cities[slug])map.flyTo([C.cities[slug].lat,C.cities[slug].lon],11,{duration:.8});
    });
  });
  var fs=document.getElementById("filters");
  if(fs)fs.querySelectorAll(".fbtn").forEach(function(b){
    b.onclick=function(){flts[b.dataset.f]=!flts[b.dataset.f];b.classList.toggle("on");render();};
  });
  var addbtn=document.getElementById("addbtn"),addhint=document.getElementById("addhint");
  if(addbtn){
    addbtn.onclick=function(){
      if(map._adding){map._adding=false;addhint.style.display="none";map.getContainer().style.cursor="";return;}
      map._adding=true;addhint.style.display="block";map.getContainer().style.cursor="crosshair";
    };
    map.on("click",function(e){
      if(!map._adding)return;
      map._adding=false;addhint.style.display="none";map.getContainer().style.cursor="";
      suggest(e.latlng.lat,e.latlng.lng);
    });
  }
}else{
  /* embed mode: create city chips + search input if absent */
  var kc=document.getElementById("kwchips");
  if(kc&&!kc.children.length){
    Object.keys(C.cities).forEach(function(k,i){
      var b=document.createElement("button");
      b.type="button";b.textContent=C.cities[k].name;b.className="kwc"+(i===0?" on":"");
      b.onclick=function(){
        kc.querySelectorAll(".kwc").forEach(function(x){x.classList.remove("on");});
        b.classList.add("on");
        map.flyTo([C.cities[k].lat,C.cities[k].lon],11,{duration:.8});
      };
      kc.appendChild(b);
    });
  }
  if(!document.getElementById("kwq")){
    var sq=document.createElement("input");
    sq.id="kwq";sq.placeholder="Search any place, pincode or name\u2026";
    sq.style.cssText="width:100%;padding:10px 12px;border-radius:10px;border:1px solid #cbd5e1;font-family:inherit;font-size:.9rem;margin-bottom:8px;box-sizing:border-box";
    mapEl.parentNode.insertBefore(sq,mapEl);
    bindSearch(sq);
  }
  var near=document.getElementById("kwnear");
  if(near&&navigator.geolocation){
    near.onclick=function(){
      near.textContent="Locating\u2026";
      navigator.geolocation.getCurrentPosition(function(p){map.flyTo([p.coords.latitude,p.coords.longitude],13,{duration:1});near.textContent="Showing your area";},
        function(){near.textContent="Location unavailable";});
    };
  }
}

/* ---------- suggest flow ---------- */
function suggest(lat,lon){
  var dp=getDigiPin(lat,lon)||"outside-range";
  var title=encodeURIComponent("Suggested "+C.poiname+" at "+dp);
  var body=encodeURIComponent("New "+C.poiname+" suggestion:\n\n- Latitude: "+lat.toFixed(6)+"\n- Longitude: "+lon.toFixed(6)+
    "\n- DIGIPIN: "+dp+"\n- City: \n- Name / operator: \n- Opening hours: \n- Free or paid: \n- Notes: \n\n(Alternatively edit OpenStreetMap directly - the map picks it up automatically.)");
  var url="mailto:skmstudio.services@gmail.com?subject="+title+"&body="+body;
  L_.popup({maxWidth:340}).setLatLng([lat,lon]).setContent(
    '<div class="pp"><b>\u2795 Suggested spot</b><div class="row">\ud83d\udccd '+lat.toFixed(5)+", "+lon.toFixed(5)+'</div>'+
    '<div class="row">\ud83d\uded1 DIGIPIN <b>'+dp+"</b> <span class='cpl' onclick=\"copyT('"+dp+"')\">copy</span></div>"+
    '<div class="row" style="margin:6px 0">Know this spot? Suggest it publicly - approved spots appear after review:</div>'+
    '<a class="dirb" style="display:block;text-align:center;text-decoration:none" href="'+url+'">Suggest by email \u2197</a></div>').openOn(map);
}


/* ===== BLOCK:JS-UI-PARITY =====
   Corner buttons (collapsible, labelled) + PWA bottom bar + map "Colour" toggle.
   Self-contained (injects its own CSS) so no page edits are needed. */
(function(){
  if(EMBED)return;
  var LS_MAP="tl_maptheme", LS_FAV="tl_fav", LS_CORNER="tl_corner";
  function ls(k,d){try{var v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
  if(!document.getElementById("tlStyle")){
    var st=el("style");st.id="tlStyle";
    st.textContent=".tlCC{position:fixed;right:14px;bottom:74px;z-index:1200;display:flex;flex-direction:column;gap:7px;align-items:flex-end}"
    +".tlB{display:flex;align-items:center;gap:7px;width:150px;justify-content:space-between;padding:7px 11px;border-radius:22px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font:inherit;font-size:1rem;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18)}"
    +".tlB .lb{font-size:.7rem;font-weight:800;flex:1;text-align:left}.tlTog{background:#0f172a;color:#fff;border-color:transparent;width:40px;height:40px;justify-content:center;padding:0;border-radius:50%}"
    +".tlCC:not(.open) .tlB:not(.tlTog){display:none}"
    +".tlTabs{position:fixed;left:0;right:0;bottom:0;z-index:1150;display:none;align-items:center;justify-content:space-around;background:#fff;border-top:1px solid #e2e8f0;box-shadow:0 -2px 12px rgba(0,0,0,.1);padding:6px 4px}"
    +".tlTab{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;text-decoration:none;color:#64748b;font:inherit}"
    +".tlTab .ic{font-size:1.3rem;line-height:1}.tlTab .lb{display:none}"
    +".tlAdd{flex:none;width:54px;height:54px;margin-top:-18px;border-radius:50%;border:4px solid #fff;background:"+ac+";color:#fff;font-size:1.4rem;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.28)}"
    +"@media(max-width:700px){.tlTabs{display:flex}}"
    +".tlmapdark .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(.95) contrast(.88) saturate(.7)}";
    document.head.appendChild(st);
  }
  function mapColour(){
    var dark=ls(LS_MAP,"dark")==="dark";
    try{map.getContainer().classList.toggle("tlmapdark",dark);}catch(e){}
    return dark;
  }
  mapColour();
  function cycle(){
    var nx=(ls(LS_MAP,"dark")==="dark")?"light":"dark";
    lsSet(LS_MAP,nx); mapColour(); toast("Map colour: "+nx);
  }
  if(!document.getElementById("tlCC")){
    var cl=el("div","tlCC open");cl.id="tlCC";
    if(ls(LS_CORNER,"open")==="closed")cl.className="tlCC";
    function b(id,ic,lb,fn){var x=el("button","tlB","<span class='lb'>"+lb+"</span><span>"+ic+"</span>");x.id=id;x.type="button";x.title=lb;x.onclick=fn;return x;}
    cl.appendChild(b("tlColour","\ud83c\udf19","Map colour",cycle));
    cl.appendChild(b("tlFav","\u2b50","Favourite",function(){
      var c=map.getCenter(),best=null,bd=1e9;
      Object.keys(C.cities).forEach(function(k){var d=Math.pow(C.cities[k].lat-c.lat,2)+Math.pow(C.cities[k].lon-c.lng,2);if(d<bd){bd=d;best=k;}});
      if(!best)return;
      var f=(ls(LS_FAV,"")||"").split(",").filter(Boolean),i=f.indexOf(best);
      if(i<0){f.push(best);toast(C.cities[best].name+" added to favourites");}else{f.splice(i,1);toast(C.cities[best].name+" removed");}
      lsSet(LS_FAV,f.join(","));
    }));
    cl.appendChild(b("tlReport","\ud83d\udce2","Report",function(){ if(typeof suggest==="function"){var c=map.getCenter();suggest(c.lat,c.lng);}else toast("Use the add button on the map"); }));
    cl.appendChild(b("tlFeedback","\ud83d\udcac","Feedback",function(){ toast("Feedback: email us or use the popup"); }));
    cl.appendChild(b("tlTheme","\ud83d\udca1","Theme",function(){var x=document.getElementById("themeBtn");if(x)x.click();else toast("Theme: use the site toggle");}));
    var tg=el("button","tlB tlTog","<span>\u25be</span>");tg.type="button";tg.id="tlTog";
    tg.onclick=function(){var o=cl.classList.toggle("open");lsSet(LS_CORNER,o?"open":"closed");tg.innerHTML="<span>"+(o?"\u25be":"\ud83e\uddf0")+"</span>";};
    cl.appendChild(tg);
    document.body.appendChild(cl);
  }
  if(!document.getElementById("tlTabs")){
    var tabs=el("nav","tlTabs");tabs.id="tlTabs";
    function tab(h,ic,lb){var a=el("a","tlTab","<span class='ic'>"+ic+"</span>");a.title=lb;a.setAttribute("aria-label",lb);a.href=h;
      a.onclick=function(e){var t=document.querySelector(h);if(t){e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"});}};return a;}
    tabs.appendChild(tab("#map","\ud83d\uddfa","Map"));
    tabs.appendChild(tab("#count","\ud83d\udebb","Nearby"));
    var ad=el("button","tlAdd","\u2795");ad.type="button";ad.title="Report or add a place";
    ad.onclick=function(){var c=map.getCenter();if(typeof suggest==="function")suggest(c.lat,c.lng);};
    tabs.appendChild(ad);
    tabs.appendChild(tab("#toast","\ud83d\udcb0","Guides"));
    tabs.appendChild(tab("#addhint","\u2753","FAQ"));
    document.body.appendChild(tabs);
  }
})();


  /* ===== BLOCK:BRAND-ASSETS (injected - no page edits needed) ===== */
  (function(){
    function link(rel,href,extra){var l=document.createElement("link");l.rel=rel;l.href=href;if(extra)for(var k in extra)l.setAttribute(k,extra[k]);document.head.appendChild(l);}
    if(!document.querySelector('link[rel="icon"][href="/favicon.svg"]'))link("icon","/favicon.svg",{type:"image/svg+xml"});
    link("apple-touch-icon","/icons/apple-touch-icon.png");
    link("manifest","/manifest.webmanifest");
    var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";m.content="#0F172A";document.head.appendChild(m);}
    if("serviceWorker" in navigator){try{navigator.serviceWorker.register("/sw.js").catch(function(){});}catch(e){}}
  })();

loadAll();
})();

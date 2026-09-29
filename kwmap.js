(function(){
var el=document.getElementById('kwmap');if(!el||!window.KWMAP_CFG)return;
var C=window.KWMAP_CFG,ac=C.ac;
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
var map=L.map(el).setView([C.cities[C.def].lat,C.cities[C.def].lon],11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
var group=null,count=document.getElementById('kwcount');
function show(k){
 var c=C.cities[k];map.setView([c.lat,c.lon],11);
 fetch('/data/'+k+'.json').then(function(r){return r.json();}).then(function(g){
  if(group)map.removeLayer(group);group=L.layerGroup();var n=0;
  (g.features||[]).forEach(function(f){
   if(!f.geometry)return;var co=f.geometry.coordinates;if(!co||co.length<2)return;
   var p=f.properties||{};var h='<div style="min-width:170px">';
   if(p.name)h+='<b>'+esc(p.name)+'</b>';
   (C.popup||[]).forEach(function(q){if(p[q.k]){var v=esc(p[q.k]);if(q.b){v=(p[q.k]==='yes')?'YES':((p[q.k]==='no')?'NO':v);}h+='<div style="color:#475569;font-size:.82rem">'+q.l+': '+v+'</div>';}});
   h+='<a href="/" style="display:inline-block;margin-top:6px;font-weight:700">Open full map &rarr;</a></div>';
   L.circleMarker([co[1],co[0]],{radius:6,weight:1.5,color:'#0f172a',fillColor:(p.fee==='no'?'#34d399':(p.fee==='yes'?'#f59e0b':ac)),fillOpacity:.95}).bindPopup(h).addTo(group);n++;
  });
  group.addTo(map);if(count)count.textContent=n+' '+C.poiname+'s on this map — tap a pin';
 }).catch(function(){if(count)count.textContent='Map data unavailable — use the button below';});
}
var chips=document.getElementById('kwchips'),first=null,firstK=null;
Object.keys(C.cities).forEach(function(k){
 var b=document.createElement('button');b.type='button';b.textContent=C.cities[k].name;b.className='kwc';
 b.onclick=function(){var o=document.querySelectorAll('.kwc.on');for(var i=0;i<o.length;i++)o[i].classList.remove('on');b.classList.add('on');show(k);};
 chips.appendChild(b);if(!first){first=b;firstK=k;}
});
first.classList.add('on');show(firstK);
var near=document.getElementById('kwnear');
if(near&&navigator.geolocation){near.style.display='inline-block';near.onclick=function(){
 near.disabled=true;near.textContent='Locating your city...';
 navigator.geolocation.getCurrentPosition(function(pos){
  var la=pos.coords.latitude,lo=pos.coords.longitude,best=null,bd=1e18;
  Object.keys(C.cities).forEach(function(k){var c=C.cities[k];var d=(c.lat-la)*(c.lat-la)+(c.lon-lo)*(c.lon-lo);if(d<bd){bd=d;best=k;}});
  if(best){var o=document.querySelectorAll('.kwc');for(var i=0;i<o.length;i++)o[i].classList.remove('on');
   var idx=Object.keys(C.cities).indexOf(best);if(o[idx])o[idx].classList.add('on');show(best);}
  near.textContent='Showing your nearest city';
 },function(){near.textContent='Location unavailable';},{timeout:8000});
};}
})();
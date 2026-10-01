/* sw.js — Toilets Near Me offline cache (no ad network worker here). */
var VERSION="tl-pwa-v1";
var CORE=["/","/index.html","/mapapp.js","/feedback.js","/favicon.svg","/icons/icon-192.png","/manifest.webmanifest"];
self.addEventListener("install",function(e){e.waitUntil(caches.open(VERSION).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}).catch(function(){}));});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==VERSION}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}));});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET")return;
  var u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(caches.open(VERSION).then(function(c){
    return c.match(e.request).then(function(hit){
      var net=fetch(e.request).then(function(r){if(r.ok)c.put(e.request,r.clone());return r;}).catch(function(){return hit});
      return hit||net;
    });
  }));
});

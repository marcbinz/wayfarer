// Wayfarer service worker: offline-first app shell.
// Bump VERSION whenever you change any file so phones pick up the update.
const VERSION='wayfarer-1.3.2';
const ASSETS=['./','index.html','styles.css','app.js','data/countries.js','data/places.js',
  'vendor/d3.min.js','vendor/topojson-client.min.js','manifest.webmanifest',
  'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(e.request,copy))}return res;
  }).catch(()=>caches.match('index.html'))));
});

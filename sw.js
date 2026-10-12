// Wayfarer service worker.
// App code (HTML, JS, CSS) is network-first: when online you always get the latest upload,
// offline the cached copy is used. Big static files (data, vendor, icons) are cache-first.
// Change CACHE only if you replace files in data/, vendor/ or icons/.
const CACHE='wayfarer-cache-2026-10-13';
const ASSETS=['./','index.html','styles.css','app.js','data/countries.js','data/places.js',
  'vendor/d3.min.js','vendor/topojson-client.min.js','manifest.webmanifest',
  'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
const STATIC=/\/(data|vendor|icons)\//;

self.addEventListener('install',e=>{
  // cache:'reload' bypasses the browser's HTTP cache, so a fresh upload is never re-cached stale
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const put=(req,res)=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res};
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin)return;
  if(STATIC.test(url.pathname)){
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>put(req,r))));
    return;
  }
  // network-first (no HTTP cache), fall back to cache when offline or slow
  const net=fetch(req,{cache:'no-store'}).then(r=>put(req,r));
  const timeout=new Promise(res=>setTimeout(res,4000));
  e.respondWith(Promise.race([net,timeout.then(()=>caches.match(req,{ignoreSearch:true}))])
    .then(r=>r||net)
    .catch(()=>caches.match(req,{ignoreSearch:true}).then(hit=>hit||caches.match('index.html'))));
});

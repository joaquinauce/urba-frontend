const CACHE='urba-shell-v4';
self.addEventListener('install',event=>{event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const shell=await fetch('/',{cache:'no-store'});
  const html=await shell.clone().text();
  const assets=[...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g)].map(match=>new URL(match[1],self.location.origin).pathname);
  await cache.put('/',shell);
  await cache.addAll([...new Set(['/manifest.webmanifest','/icons/icon-192.png',...assets])]);
})());self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin||new URL(request.url).pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('/')));return;
  }
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request).then(cached=>cached||Response.error())));
});

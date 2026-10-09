const CACHE="qavli-rebuild-v20";
const SHELL=["./","./index.html","./manifest.json","./icon.svg","./icon-192.svg","./icon-512.svg","./css/qavli.css","./js/app.js"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const u=new URL(event.request.url);
  if(u.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res}).catch(()=>caches.match(event.request).then(r=>r||caches.match("./index.html"))));
});

self.addEventListener("notificationclick",event=>{event.notification.close();const chatId=event.notification.data?.chatId;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{for(const client of clients){if("focus" in client){await client.focus();if(chatId)client.postMessage({type:"QAVLI_OPEN_CHAT",chatId});return}}if(self.clients.openWindow)await self.clients.openWindow("./")}))});

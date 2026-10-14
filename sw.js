const CACHE="qavli-rebuild-v24";
const SHELL=["./","./index.html","./manifest.json","./icon.svg","./icon-192.svg","./icon-512.svg","./css/qavli.css","./js/app.js"];
const SHELL_PATHS=new Set(SHELL.map(path=>new URL(path,self.location.href).pathname));
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('qavli-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const u=new URL(request.url);
  if(u.origin!==self.location.origin)return;
  // Cache only the app shell. Do not cache query-specific pages or arbitrary same-origin responses.
  const isShell=SHELL_PATHS.has(u.pathname)&&!u.search;
  if(!isShell)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.type==="basic")caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
    return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match("./index.html"))));
});
self.addEventListener("notificationclick",event=>{event.notification.close();const chatId=event.notification.data?.chatId;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async clients=>{for(const client of clients){if("focus" in client){await client.focus();if(chatId)client.postMessage({type:"QAVLI_OPEN_CHAT",chatId});return}}if(self.clients.openWindow)await self.clients.openWindow("./")}))});

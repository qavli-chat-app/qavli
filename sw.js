importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA3DT-yjo96atEA6V7K63x9lofg87ESjcA",
  authDomain: "qavli-37983.firebaseapp.com",
  projectId: "qavli-37983",
  appId: "1:168938701514:web:783d81a63d8e4423e56a33",
  messagingSenderId: "168938701514"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const title = n.title || "QAVLI";
  const options = {
    body: n.body || "New message",
    icon: "icon.svg",
    badge: "icon.svg",
    data: {
      url: payload.fcmOptions?.link || payload.data?.link || "./"
    }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.url || "./";
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(list => {
      for(const client of list){
        if("focus" in client){
          try { client.navigate(target); } catch(e) {}
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});

const CACHE='qavli-shell-v8';
const APP_SHELL=['./','./index.html','./manifest.json','./css/tokens.css','./css/components.css','./css/app.css','./css/premium.css','./js/qavli-core.js','./js/qavli-config.js','./js/qavli-integrations.js','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET') return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin) return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(()=>cached)));
});

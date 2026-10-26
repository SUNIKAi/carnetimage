/* Service worker de l'application coach.
   Meme regle que cote eleve : la PAGE part du reseau d'abord, pour qu'une
   correction publiee arrive tout de suite ; le reste du cache d'abord. */
var CACHE = 'coach-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(n){
    return Promise.all(n.map(function(x){ return x===CACHE?null:caches.delete(x); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // Supabase, polices

  var estPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if(estPage){
    e.respondWith(fetch(req).then(function(rep){
      var c = rep.clone(); caches.open(CACHE).then(function(k){ k.put(req, c); }); return rep;
    }).catch(function(){
      return caches.match(req,{ignoreSearch:true}) || caches.match('./index.html',{ignoreSearch:true});
    }));
    return;
  }
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(function(hit){
    return hit || fetch(req).then(function(rep){
      var c = rep.clone(); caches.open(CACHE).then(function(k){ k.put(req, c); }); return rep;
    });
  }));
});

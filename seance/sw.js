/* Service worker du carnet de seance.
   Coquille : cache d'abord (l'appli s'ouvre sans reseau).
   Donnees : reseau d'abord, cache en secours (la seance la plus fraiche gagne). */
var CACHE = 'seance-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(noms){
      return Promise.all(noms.map(function(n){ return n===CACHE ? null : caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // polices Google : laisser passer

  // Donnees de seance : reseau d'abord
  if(url.pathname.indexOf('/data/') !== -1){
    e.respondWith(
      fetch(req).then(function(rep){
        var copie = rep.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copie); });
        return rep;
      }).catch(function(){
        return caches.match(req, {ignoreSearch:true});
      })
    );
    return;
  }

  // Coquille : cache d'abord
  e.respondWith(
    caches.match(req, {ignoreSearch:true}).then(function(hit){
      return hit || fetch(req).then(function(rep){
        var copie = rep.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copie); });
        return rep;
      });
    })
  );
});

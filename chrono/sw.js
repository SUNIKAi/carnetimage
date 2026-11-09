/* Service worker du chrono. Meme regle que le carnet de seance :
   la PAGE part du reseau d'abord, le reste du cache d'abord.

   En « cache d'abord » sur index.html, qui a deja ouvert l'application garde
   eternellement son ancienne version et ne recoit jamais une correction.

   Les appels a Supabase sont d'une autre origine : on les laisse passer sans
   y toucher. La liste des chronos est mise en cache par la page elle-meme
   (localStorage), donc elle s'affiche hors ligne. */

var CACHE = 'chrono-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(noms){
      return Promise.all(noms.map(function(n){ return n === CACHE ? null : caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function estLaPage(req, url){
  return req.mode === 'navigate'
      || url.pathname.endsWith('/')
      || url.pathname.endsWith('.html');
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // Supabase, polices

  if(estLaPage(req, url)){
    e.respondWith(
      fetch(req).then(function(rep){
        var copie = rep.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copie); });
        return rep;
      }).catch(function(){
        return caches.match(req, {ignoreSearch:true})
            || caches.match('./index.html', {ignoreSearch:true});
      })
    );
    return;
  }

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

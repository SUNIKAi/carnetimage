/* Service worker du carnet de seance.

   Regle : la PAGE part du reseau d'abord, le reste du cache d'abord.

   Pourquoi : en « cache d'abord » sur index.html, un eleve qui a deja ouvert
   l'application garde eternellement l'ancienne version — une correction publiee
   ne lui arrive jamais. Avec le reseau d'abord, il a toujours la derniere
   version des qu'il a du reseau, et le cache ne sert que hors ligne.

   Les appels a Supabase sont d'une autre origine : on les laisse passer sans
   y toucher (la page gere elle-meme sa file d'attente hors ligne). */

var CACHE = 'seance-v4';
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
  if(url.origin !== self.location.origin) return;   // Supabase, polices, GIF

  if(estLaPage(req, url)){
    // reseau d'abord : la derniere version gagne, le cache sert de secours
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

  // icones, manifeste : cache d'abord, ils ne changent quasiment jamais
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

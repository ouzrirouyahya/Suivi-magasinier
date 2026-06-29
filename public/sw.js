const CACHE_NAME = 'hydromines-v' + (self.__BUILD_TIMESTAMP__ || Date.now());

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// self.__WB_MANIFEST sera injecté par VitePWA avec la liste 
// exacte des chunks buildés. Si absent (dev), utiliser SHELL_ASSETS.
const PRECACHE_ASSETS = (typeof self.__WB_MANIFEST !== 'undefined')
  ? self.__WB_MANIFEST.map(e => e.url)
  : SHELL_ASSETS;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll échoue si UN seul asset manque — utiliser add() individuel
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => 
          console.warn('[SW] Précache raté pour', url, err)
        ))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'hydromines-fonts') {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper pour éviter les attentes infinies sur réseau instable/faible
function fetchWithTimeout(request, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SW Network Timeout')), timeout);
    fetch(request).then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Caches spéciaux pour les polices Google Fonts
  const isGoogleFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  
  // Ignorer Firebase et les requêtes API (mais conserver Google Fonts)
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.pathname.startsWith('/api/') ||
    (url.hostname.includes('googleapis.com') && !isGoogleFont)
  ) return;
  
  // Navigation (HTML) : Network-First avec timeout rapide de 2.5s et fallback sur /index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(event.request, 2500)
        .catch(() => {
          console.log('[SW] Réseau trop lent ou déconnecté, service de /index.html depuis le cache');
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Google Fonts : Cache-First pour un affichage instantané et persistant
  if (isGoogleFont) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open('hydromines-fonts').then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Assets JS/CSS/images : Cache-First (ils ont des hash dans le nom)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // Tout le reste : Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Événement de Synchronisation en Arrière-Plan (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'hydromines-sync') {
    console.log('[Service Worker] Événement de synchronisation d\'arrière-plan reçu pour "hydromines-sync"');
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // Notifier chaque client ouvert que la connexion est de retour et qu'il faut lancer la synchronisation de la file
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' });
        });
      })
    );
  }
});

// Événement Message pour afficher une notification Push de succès de synchronisation si l'app est en arrière-plan
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_SYNC_NOTIFICATION') {
    const showNotificationPromise = self.registration.showNotification ? 
      self.registration.showNotification('HydroMines — Synchro Cloud', {
        body: event.data.message || 'Données synchronisées avec succès !',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'hydromines-sync-notif',
        renotify: true,
        vibrate: [100, 50, 100],
        data: { url: '/' }
      }) : Promise.resolve();
    
    event.waitUntil(showNotificationPromise);
  }
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

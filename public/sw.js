const CACHE_NAME = 'hydromines-suivi-magasinier-v1';

// Assets de base à pré-cacher pour garantir un premier démarrage hors-ligne
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-mise en cache des ressources essentielles');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Échec du pré-caching initial (normal en dév), mise en cache dynamique active :', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Suppression de l\'ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes avec stratégie Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NE PAS intercepter ni bloquer :
  // - Les requêtes non GET (POST, PUT, DELETE pour l'écriture directe ou Firestore)
  // - Les appels directs aux serveurs Firestore / Firebase Auth / APIs Google
  // - Les scripts internes de l'environnement de développement de l'AI Studio
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.href.includes('__')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Stratégie Stale-While-Revalidate : renvoie instantanément la ressource en cache
        // puis met à jour le cache en arrière-plan si le réseau est disponible
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silencieux en cas de réseau coupé (hors-ligne)
          });

        return cachedResponse;
      }

      // Si la ressource n'est pas dans le cache, faire la requête réseau
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
            return networkResponse;
          }

          // Stocker une copie de la ressource dans le cache pour la prochaine fois
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          // En cas de panne de réseau complète et si on cherche à naviguer vers une page HTML
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          throw err;
        });
    })
  );
});

// Événement de Synchronisation en Arrière-Plan (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'hydromines-sync') {
    console.log('[Service Worker] Événement de synchronisation d\'arrière-plan reçu pour "hydromines-sync"');
    event.waitUntil(
      // Récupérer tous les clients (onglets) ouverts de notre PWA
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

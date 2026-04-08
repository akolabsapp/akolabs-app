// ============================================
// AKOLABS - Service Worker
// ============================================

const CACHE_NAME = 'akolabs-v1.1';
const OFFLINE_URL = '/index.html';

// Fichiers à mettre en cache immédiatement
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/variables.css',
    '/css/global.css',
    '/css/components.css',
    '/css/app.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/router.js',
    '/js/push.js',
    '/js/flash-sale.js',
    '/js/tracking.js',
    '/js/app.js',
    '/js/pages/home.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// ---- INSTALLATION ----
self.addEventListener('install', (event) => {
    console.log('[SW] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache des fichiers statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((err) => {
                console.error('[SW] Erreur de cache:', err);
            })
    );
    self.skipWaiting();
});

// ---- ACTIVATION ----
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Suppression ancien cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// ---- FETCH (Stratégie: Network First, Cache Fallback) ----
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;
    if (url.includes('supabase.co') ||
        url.includes('kkiapay.me') ||
        url.includes('cloudinary.com') ||
        url.includes('feexpay.me')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || caches.match(OFFLINE_URL);
                });
            })
    );
});

// ---- PUSH NOTIFICATIONS ----
self.addEventListener('push', (event) => {
    let data = { title: 'AKOLABS', body: 'Nouvelle notification', url: '/' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('[SW] Erreur parsing push data:', e);
    }

    const options = {
        body: data.body,
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-72.png',
        vibrate: [100, 50, 100, 50, 100],
        data: { url: data.url || '/' },
        tag: 'akolabs-notif',  // Evite les doublons
        renotify: true,
        actions: [
            { action: 'open', title: 'Ouvrir' },
            { action: 'close', title: 'Fermer' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'AKOLABS', options)
    );
});

// ---- CLICK SUR NOTIFICATION ----
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const targetUrl = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Si l'app est déjà ouverte, focus + navigation
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
                        return;
                    }
                }
                // Sinon ouvrir une nouvelle fenêtre
                return clients.openWindow(targetUrl);
            })
    );
});

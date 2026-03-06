const CACHE_NAME = 'feedlot-v5';
const ASSETS_TO_CACHE = [
    './Operasional/',
    './Operasional/index.html',
    './Operasional/css/style.css',
    './Operasional/js/app.js',
    './Operasional/js/auth.js',
    './Operasional/js/db.js',
    './Operasional/js/serial-manager.js',
    './Operasional/js/induksi.js',
    './Operasional/js/reweight.js',
    './Operasional/js/penjualan.js',
    './Operasional/js/dashboard.js',
    './Operasional/js/utils.js',
    './Operasional/js/backup.js',
    './Operasional/js/supabase-sync.js',
    './Operasional/libs/xlsx.full.min.js',
    './Operasional/libs/jspdf.umd.min.js',
    './Operasional/libs/jspdf.plugin.autotable.umd.min.js',
    './Operasional/manifest.json',
    './Operasional/icons/icon-192.png',
    './Operasional/icons/icon-512.png'
];

// Install — cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for Supabase API calls
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for everything else
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});

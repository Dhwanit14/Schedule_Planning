const CACHE_NAME = 'planner-cache-v6';
const urlsToCache = [
    './',
    './index.html',
    './css/style.css',
    './js/utils.js',
    './js/main.js',
    './js/touch.js'
];

// Install Event: Save files to phone cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch Event: Load from cache if offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if found, otherwise fetch from network
                return response || fetch(event.request);
            })
    );
});

// Activate Event: Clean up old caches when you update the app
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
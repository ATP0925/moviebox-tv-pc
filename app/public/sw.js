/**
 * MovieBox Pro Cinema — Universal High-Performance Service Worker
 * Optimizes poster loading via Cache-First / Stale-While-Revalidate
 * Enables offline app shell and native PWA installation on Android & PC
 */

const CACHE_NAME = 'moviebox-shell-v4.4.0';
const IMAGE_CACHE_NAME = 'moviebox-images-v4.4.0';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching App Shell for Instant Boot');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache non-fatal error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart Router
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Bypass video streaming and range requests (video chunks, m3u8, mpd, mp4)
  if (
    request.headers.get('range') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.mpd') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.m4s') ||
    url.searchParams.has('segment')
  ) {
    return; // Let browser handle video streaming directly
  }

  // 2. High-Speed Poster & Image Cache (Stale-While-Revalidate)
  const isImage = 
    request.destination === 'image' ||
    url.hostname.includes('media-amazon.com') ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('tmdb.org') ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|svg|gif)$/i);

  if (isImage && request.method === 'GET') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        const fetchPromise = fetch(request, { mode: 'cors' })
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Return from cache immediately if available, else await network
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. App Shell Navigation & Static Assets
  if (request.method === 'GET') {
    // For navigation requests, network first, fallback to cached index.html
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request).catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || (await cache.match('/'));
        })
      );
      return;
    }

    // For static files (css, js, html)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(request);
      })
    );
  }
});

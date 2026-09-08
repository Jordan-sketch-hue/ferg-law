/**
 * Ferguson Law — Service Worker v2
 * Caching strategies, push notifications, background sync, update detection.
 */

const VERSION = 'fl-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-180.png',
  '/favicon-512.png',
  '/faq',
  '/directory',
  '/explainers',
  '/glossary',
];

// ── Install: precache shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches + take control ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(k => k !== VERSION && k !== 'fl-assets-v2').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ── Fetch: routing strategies ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Network-only: write mutations
  if (
    url.pathname.startsWith('/api/booking/create') ||
    url.pathname.startsWith('/api/lead') ||
    url.pathname.startsWith('/api/push/') ||
    url.pathname.startsWith('/api/webauthn/') ||
    (url.pathname.startsWith('/admin') && request.method !== 'GET')
  ) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Network-first: API reads
  if (
    url.pathname.startsWith('/api/booking/slots') ||
    url.pathname.startsWith('/api/chat') ||
    url.pathname.startsWith('/api/admin/')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first: static assets
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|ico|woff2|woff)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(cacheFirst(request, 'fl-assets-v2', 60));
    return;
  }

  // Navigate: network with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigateFetch(request));
    return;
  }

  // Default: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(VERSION);
    cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ ok: false, error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    const keys = await cache.keys();
    while (keys.length >= maxEntries) {
      await cache.delete(keys.shift());
    }
    cache.put(request, res.clone());
    return res;
  } catch {
    return new Response('', { status: 404 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('', { status: 503 });
}

async function navigateFetch(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(VERSION);
    cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

// ── Background Sync: replay queued booking submissions ───────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'fl-booking-queue') {
    event.waitUntil(replayBookingQueue());
  }
});

async function replayBookingQueue() {
  try {
    const db = await openIDB();
    const tx = db.transaction('booking-queue', 'readwrite');
    const store = tx.objectStore('booking-queue');
    const items = await storeGetAll(store);
    for (const item of items) {
      try {
        const res = await fetch('/api/booking/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        if (res.ok) await storeDelete(store, item.id);
      } catch { /* retry next sync */ }
    }
  } catch { /* IDB not available */ }
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Ferguson Law', body: event.data.text(), url: '/' }; }

  const {
    title = 'Ferguson Law', body = '',
    icon = '/favicon-512.png', badge = '/favicon-180.png',
    url = '/', tag, actions = [], requireInteraction = false,
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge,
      tag: tag || 'fl-default',
      data: { url },
      actions, requireInteraction,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  if (event.action === 'whatsapp') {
    event.waitUntil(clients.openWindow('https://wa.me/18763200235'));
    return;
  }
  if (event.action === 'zoom') {
    const zoomUrl = event.notification.data && event.notification.data.zoomUrl;
    if (zoomUrl) { event.waitUntil(clients.openWindow(zoomUrl)); return; }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(self.location.origin) && 'focus' in w) {
          w.focus();
          w.postMessage({ type: 'PUSH_NAV', url: targetUrl });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Minimal IDB helpers ───────────────────────────────────────────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('fl-pwa', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('booking-queue')) {
        db.createObjectStore('booking-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}
function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function storeDelete(store, id) {
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

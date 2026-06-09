// DEEP-SIGN service worker
// Strategy:
//   - Precache the app shell on install
//   - Network-first for navigation requests (so new versions roll out)
//   - Cache-first for static assets (images, fonts, JS, CSS)
const CACHE = 'deep-sign-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Skip supabase + mediapipe model requests — always go to network
  if (
    url.host.includes('supabase.co') ||
    url.host.includes('storage.googleapis.com') ||
    url.host.includes('cdn.jsdelivr.net')
  ) return;

  // HTML navigations: network first, fall back to cache (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
    )
  );
});

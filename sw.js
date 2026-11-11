// Kassabuch – Service Worker: App-Dateien offline verfügbar machen.
// Die Daten selbst liegen im Browser-Speicher des Handys, nicht hier.
const CACHE = 'kassabuch-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Sofort aus dem Cache antworten, im Hintergrund aktualisieren (neue Version beim nächsten Start).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        e.waitUntil(fresh);
        return cached;
      }
      const res = await fresh;
      return res || (await cache.match('./index.html')) || new Response('Offline', { status: 503 });
    })
  );
});

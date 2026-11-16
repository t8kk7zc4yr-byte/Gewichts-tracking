/* Service Worker: Antwort sofort aus dem Zwischenspeicher, Aktualisierung im Hintergrund.
   Neue Versionen werden beim naechsten Oeffnen der App aktiv. Die Kennung wird beim Bauen gesetzt.
   Pflicht ist nur die App selbst; fehlt eine der uebrigen Dateien, bleibt der Offline-Betrieb trotzdem moeglich. */
const CACHE = 'gewicht-1ce975d645';
const CORE = './';
const OPTIONAL = ['manifest.webmanifest', 'xlsx.mini.min.js', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (cache) => {
    await cache.add(new Request(CORE, { cache: 'reload' }));
    await Promise.all(OPTIONAL.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gewicht-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  const key = nav ? CORE : req;
  const cacheP = caches.open(CACHE);
  const update = fetch(req, { cache: 'no-cache' })
    .then((res) => (res && res.ok ? cacheP.then((c) => c.put(key, res.clone())).then(() => res, () => res) : res))
    .catch(() => null);
  e.waitUntil(update); // synchron registriert: Aktualisierung im Hintergrund
  e.respondWith(cacheP.then(async (cache) => {
    const hit = (await cache.match(key, { ignoreSearch: true })) || (nav ? await cache.match('index.html', { ignoreSearch: true }) : null);
    if (hit) return hit;
    const res = await update;
    return res || new Response('Offline und noch nicht zwischengespeichert. Bitte die App einmal mit Internetverbindung öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});

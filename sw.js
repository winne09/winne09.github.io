// Startseite – Offline-Speicher (Service Worker)
// Kümmert sich NUR um die Dateien der Startseite. Die Apps unter
// /sport-delay/, /teams/ und /bewegungsrad/ haben eigene Service Worker
// und werden hier bewusst nicht angefasst.
// Bei jeder Änderung an der Startseite: CACHE-Version erhöhen.
const CACHE = 'start-v1.0';
const FILES = [
  '/',
  '/index.html',
  '/site.css',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('start-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst aus dem Speicher, im Hintergrund still nach einer neuen Version schauen.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!FILES.includes(path)) return; // alles andere (die Apps) geht ganz normal ans Netz
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(path);
      const update = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic' && !res.redirected) cache.put(path, res.clone());
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(update); return hit; }
      const res = await update;
      return res || new Response('Offline – bitte einmal mit Internet öffnen.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })
  );
});

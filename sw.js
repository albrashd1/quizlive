// Service worker: makes the app installable and loads it fast.
// Always tries the network first so your latest questions/config are used.
const CACHE = 'quizlive-v1';
const ASSETS = [
  '/', '/index.html', '/host.html', '/play.html',
  '/css/style.css', '/js/config.js', '/js/questions.js', '/js/common.js', '/js/host.js', '/js/play.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never touch Supabase traffic
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.com')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

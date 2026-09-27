/* EUR assurance Pro 2.0 — Service Worker (app shell). لا يتدخل في طلبات Firebase أو المصادر الخارجية. */
const CACHE = 'eur-pro2-v1';
const SHELL = ['./', './index.html', './styles.css', './core.js', './calc.js', './pages.js',
  './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(self.location.origin)) return;
  /* الشبكة أولاً (لتصل التحديثات فوراً)، والكاش عند انقطاع الإنترنت */
  e.respondWith(fetch(r).then(res => { if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(c => c || caches.match('./index.html'))));
});

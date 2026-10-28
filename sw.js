// Служебный файл приложения browlash.look: работает и для сайта клиенток, и для журнала мастера.
// Кэширует оболочку (чтобы приложение открывалось даже при плохой связи) и показывает пуш-уведомления.
const CACHE = 'browlash-v3';
const SHELL = ['./', './index.html', './admin.html', './manifest.webmanifest', './admin.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('config.json') || url.pathname.startsWith('/api/')) return; // данные записи и админки не кэшируем
  // сначала сеть, без связи — кэш; страницы с параметрами (?b=, ?me=) берут общую оболочку
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && !url.search) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })));
});

// Пуш: { title, body, url, tag }
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'browlash.look', {
    body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || './' }, lang: 'ru'
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './admin.html', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const same = list.find(w => w.url === target);
    if (same) return same.focus();
    const any = list.find(w => new URL(w.url).origin === self.location.origin);
    if (any && 'navigate' in any) return any.navigate(target).then(w => (w || any).focus());
    return self.clients.openWindow(target);
  }));
});

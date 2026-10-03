const CACHE_NAME = 'japa-meditation-offline-v5';

// Лёгкие ресурсы кэшируем при установке; тяжёлые mp3 — нет (иначе install зависает)
const coreUrls = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/images/01_gurudev_smiling.jpg',
  './assets/images/01_gurudev.jpg',
  './assets/images/01_rupa_sanatana_math_vrinda.jpg',
  './assets/images/04_swami_prabhupada_deities.png',
  './assets/images/05_bhakti_pragyana_keshava_murti_radhe_kunj.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(coreUrls.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// Сначала кэш, потом сеть с дозаписью (аудио попадёт в кэш после первого прослушивания)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return res;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});

const CACHE_NAME = 'japa-meditation-offline-v4';

// Базовые ресурсы — кэшируются сразу при install (лёгкие, чтобы install гарантированно завершился)
const coreUrls = [
  './',
  './index.html',
  './manifest.json',
  './assets/images/01_gurudev_smiling.jpg',
  './assets/images/01_gurudev.jpg',
  './assets/images/01_rupa_sanatana_math_vrinda.jpg',
  './assets/images/04_swami_prabhupada_deities.png',
  './assets/images/05_bhakti_pragyana_keshava_murti_radhe_kunj.jpg'
];

// Тяжёлые mp3 НЕ включаем в addAll: cache.addAll атомарен —
// если хотя бы один запрос упадёт, install не завершится, SW не активируется и офлайн не заработает.
// Аудио дозакешируется автоматически при первом онлайн-прослушивании (см. fetch).
const lazyUrls = [
  './assets/audio/01_Srila-Gurudev-japa108-flute.mp3',
  './assets/audio/01_Srila-Gurudev-japa108.mp3',
  './assets/audio/02-Srila-Prabhupada-japa108.mp3',
  './assets/audio/03_Prabhuji-japa108-quiet.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(coreUrls))
      .then(() => self.skipWaiting()) // активировать нового SW, не дожидаясь закрытия старых вкладок
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // SW начинает управлять страницей сразу после активации
  );
});

// Стратегия: сначала кэш, затем сеть с дозаписью в кэш
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Кладём в кэш успешные ответы того же origin (в т.ч. тяжёлые mp3 из lazyUrls)
        if (response && response.status === 200 &&
            (response.type === 'basic' || response.type === 'cors')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    }).catch(() => {
      // Офлайн, файла ещё нет в кэше: навигацию отдаём через закешированный index.html
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});

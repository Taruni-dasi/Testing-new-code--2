const CACHE_NAME = 'japa-meditation-offline-v5';

// Базовые ресурсы — кэшируются сразу при install.
// ВАЖНО: каждая ссылка оборачивается в отдельный кэш-оператор с .catch(() => {}) ниже,
// поэтому падение одного файла НЕ блокирует установку остальных и активацию SW.
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

// Тяжёлые mp3 не включаем в addAll: cache.addAll атомарен —
// если хотя бы один запрос упадёт (обрыв, лимит, кэш-переполнение),
// install не завершится, SW не активируется и офлайн не заработает.
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
      // НЕ используем cache.addAll(): он атомарен — одна упавшая ссылка (404/обрыв)
      // отклоняет весь install и SW навсегда остаётся в "installed/waiting".
      // Кэшируем каждую ссылку отдельно с .catch(), чтобы install всегда завершался.
      .then(cache => Promise.all(
        coreUrls.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(err => {
            console.warn('SW: не удалось закэшировать', url, err);
          })
        )
      ))
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

// Стратегия: сначала кэш, затем сеть с дозаписью в кэш (stale-while-revalidate для ресурсов)
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

const CACHE_NAME = 'japa-meditation-offline-v1';

// Список всех файлов, которые нужно скачать и сохранить для офлайн-работы
const urlsToCache = [
  '/Testing-new-code--2/',
  '/Testing-new-code--2/index.html',
  '/Testing-new-code--2/manifest.json',
  'https://taruni-dasi.github.io/Testing-new-code/assets/images/01_gurudev_smiling.jpg',
  'https://taruni-dasi.github.io/Testing-new-code/assets/images/01_gurudev.jpg',
  'https://taruni-dasi.github.io/Testing-new-code/assets/images/01_rupa_sanatana_math_vrinda.jpg',
  'https://taruni-dasi.github.io/Testing-new-code/assets/images/04_swami_prabhupada_deities.png',
  'https://taruni-dasi.github.io/Testing-new-code/assets/images/05_bhakti_pragyana_keshava_murti_radhe_kunj.jpg',
  'https://taruni-dasi.github.io/Testing-new-code/assets/audio/01_Srila-Gurudev-japa108-flute.mp3',
  'https://taruni-dasi.github.io/Testing-new-code/assets/audio/01_Srila-Gurudev-japa108.mp3',
  'https://taruni-dasi.github.io/Testing-new-code/assets/audio/02-Srila-Prabhupada-japa108.mp3',
  'https://taruni-dasi.github.io/Testing-new-code/assets/audio/03_Prabhuji-japa108-quiet.mp3'
];

// 1. При установке сохраняем все файлы в кэш телефона/компьютера
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование файлов для офлайн-работы...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. При запросе файла: сначала ищем в кэше (офлайн), если нет - качаем из сети
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Файл есть в кэше, отдаем его (работает без интернета!)
        }
        return fetch(event.request); // Файла нет в кэше, пробуем скачать
      })
  );
});

// 3. Очистка старого кэша, если вы в будущем поменяете версию (CACHE_NAME)
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
    })
  );
});

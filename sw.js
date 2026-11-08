// Service worker: makes the app work offline after the first visit.
//
// Release checklist: bump CACHE_VERSION whenever any file below changes, otherwise
// returning visitors keep the previous version of that file.
// tests/sw.test.js fails if an app file is missing from PRECACHE.

const CACHE_VERSION = 'v1'
const CACHE_NAME = `colorgen-${CACHE_VERSION}`

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './fonts/jetbrains-mono-latin-wght-normal.woff2',
  './fonts/space-grotesk-latin-wght-normal.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './js/app.js',
  './js/core/color.js',
  './js/core/history.js',
  './js/core/random.js',
  './js/i18n.js',
  './js/locales/en.js',
  './js/locales/pt-BR.js',
  './js/storage.js',
  './js/theme-init.js',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // cache: 'reload' bypasses the HTTP cache so a new version never stores stale files.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('colorgen-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network first for the page, so a new release shows up as soon as it is online.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // Cache first for versioned static assets.
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached ?? fetch(request)))
})

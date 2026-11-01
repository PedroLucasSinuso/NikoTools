// Cache-first pro que quase não muda (leitor de OCR, idioma, JS/CSS com hash), rede-primeiro pro resto.
const CACHE = 'estoque-facil-v2'
const PESADOS = /\/(tesseract|tessdata|assets)\//

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  const cacheFirst = PESADOS.test(url.pathname)
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const hit = await cache.match(e.request)
      if (cacheFirst && hit) return hit
      try {
        // páginas e dados sempre revalidam (o cache HTTP do host segura a versão antiga por minutos)
        const res = cacheFirst ? await fetch(e.request) : await fetch(url.href, { cache: 'no-cache' })
        if (res.ok) cache.put(e.request, res.clone())
        return res
      } catch (err) {
        if (hit) return hit
        throw err
      }
    })(),
  )
})

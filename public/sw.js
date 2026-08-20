// Service worker básico da Recibos Claros — sem dependências externas.
//
// Estratégia:
// - Pedidos de navegação (páginas HTML): tenta a rede primeiro; se falhar
//   (sem ligação), serve a última versão da página que estiver em cache.
//   Cada página visitada com sucesso fica automaticamente em cache.
// - Outros pedidos GET (JS, CSS, imagens): cache primeiro, com a rede como
//   reserva — e atualiza sempre a cache com a resposta mais recente.

const NOME_CACHE = 'freela-cache-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== NOME_CACHE)
          .map((nome) => caches.delete(nome))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Só GET faz sentido em cache — pedidos a APIs (POST, etc.) seguem sempre pela rede.
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // Nunca fazer cache de pedidos a APIs externas (Supabase, etc.) — os dados são
  // dinâmicos e uma resposta em cache ficaria desatualizada. Só fazemos cache de
  // pedidos à própria origem da app.
  if (url.origin !== self.location.origin) {
    return
  }

  // Não guardar em cache pedidos às nossas próprias rotas de API.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(NOME_CACHE).then((cache) => cache.put(request, copia))
          return resposta
        })
        .catch(() => caches.match(request).then((resposta) => resposta || caches.match('/')))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((respostaCache) => {
      const pedidoRede = fetch(request)
        .then((resposta) => {
          const copia = resposta.clone()
          caches.open(NOME_CACHE).then((cache) => cache.put(request, copia))
          return resposta
        })
        .catch(() => respostaCache)

      return respostaCache || pedidoRede
    })
  )
})

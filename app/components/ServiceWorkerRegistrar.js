'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((erro) => {
        console.error('Falha ao registar o service worker:', erro)
      })
      return
    }

    // Em desenvolvimento o service worker faz mais mal que bem: o cache-first
    // para JS/CSS (ver public/sw.js) serve a versão antiga do bundle por cima
    // do hot-reload do `next dev`, já que os nomes dos ficheiros não mudam a
    // cada gravação como mudam em produção. Desregista qualquer instalação
    // que tenha ficado de uma sessão anterior, para o localhost nunca ficar
    // preso a código desatualizado.
    navigator.serviceWorker.getRegistrations().then((registos) => {
      registos.forEach((registo) => registo.unregister())
    })
  }, [])

  return null
}

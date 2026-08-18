'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((erro) => {
        console.error('Falha ao registar o service worker:', erro)
      })
    }
  }, [])

  return null
}

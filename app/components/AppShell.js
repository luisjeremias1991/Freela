'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from './NavBar'

const ROTA_PUBLICA = '/login'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    if (pathname === ROTA_PUBLICA) {
      setVerificando(false)
      return
    }

    let ativo = true
    setVerificando(true)

    async function verificarSessao() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!ativo) return
      if (!user) {
        router.replace('/login')
        return
      }
      setAutenticado(true)
      setVerificando(false)
    }

    verificarSessao()

    return () => {
      ativo = false
    }
  }, [pathname, router])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Página de login: sem guarda, sem barra de navegação, sem botão de sair.
  if (pathname === ROTA_PUBLICA) {
    return <>{children}</>
  }

  if (verificando || !autenticado) {
    return <p style={{ padding: 20 }}>A carregar...</p>
  }

  return (
    <>
      <button
        onClick={sair}
        style={{
          position: 'fixed',
          top: 15,
          right: 15,
          padding: '8px 14px',
          background: '#10284D',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          zIndex: 100
        }}
      >
        Sair
      </button>
      <div style={{ paddingBottom: 60 }}>
        {children}
      </div>
      <NavBar />
    </>
  )
}

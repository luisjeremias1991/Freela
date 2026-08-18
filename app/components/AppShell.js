'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from './NavBar'
import { PerfilContext } from '../context/PerfilContext'

const ROTA_PUBLICA = '/login'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [verificando, setVerificando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)
  const [userId, setUserId] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)

  const carregarPerfil = useCallback(async (id) => {
    if (!id) return null
    setCarregandoPerfil(true)
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    setPerfil(data)
    setCarregandoPerfil(false)
    return data
  }, [])

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
      setUserId(user.id)
      setVerificando(false)
      carregarPerfil(user.id)
    }

    verificarSessao()

    return () => {
      ativo = false
    }
  }, [pathname, router, carregarPerfil])

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Página de login: sem guarda, sem barra de navegação, sem botão de sair.
  if (pathname === ROTA_PUBLICA) {
    return <>{children}</>
  }

  if (verificando || !autenticado) {
    return <p className="p-5 text-brand-muted">A carregar...</p>
  }

  return (
    <PerfilContext.Provider
      value={{
        perfil,
        carregandoPerfil,
        recarregarPerfil: () => carregarPerfil(userId)
      }}
    >
      <button
        onClick={sair}
        className="fixed top-4 right-4 z-100 rounded-lg border border-brand-navy px-3.5 py-2 text-sm font-medium text-brand-navy bg-white hover:bg-brand-navy-tint transition cursor-pointer"
      >
        Sair
      </button>
      <div className="pb-16">
        {children}
      </div>
      <NavBar />
    </PerfilContext.Provider>
  )
}

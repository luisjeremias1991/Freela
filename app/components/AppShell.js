'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import NavBar from './NavBar'
import { PerfilContext } from '../context/PerfilContext'

// Rotas acessíveis sem sessão normal. "/redefinir-password" tem de estar aqui
// porque quem lá chega vem de um link de recuperação, sem ainda ter uma sessão
// completa — se ficasse atrás da guarda normal, seria redirecionado para /login
// antes de a sessão temporária de recuperação ter oportunidade de se estabelecer.
const ROTAS_PUBLICAS = ['/login', '/criar-conta', '/redefinir-password']

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
    let { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!data) {
      // Garante que toda a conta nova fica sempre com uma linha em "perfis", sem
      // depender de a pessoa guardar algum formulário primeiro — sem isto, a
      // lógica de redirecionamento por role não tinha nada para consultar na
      // primeiríssima entrada (ex. uma conta de contabilista nunca chegava a ver
      // o formulário que, de outra forma, criaria essa linha).
      //
      // Só corre quando o select acima já confirmou que a linha não existe —
      // nunca por cima de uma linha já existente, para não apagar um role
      // definido manualmente (ex. 'contabilista', atribuído à mão no Supabase).
      const { data: perfilCriado, error: erroCriar } = await supabase
        .from('perfis')
        .upsert({ id, role: 'cliente' }, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (erroCriar) {
        console.error('Erro ao criar perfil automaticamente:', erroCriar.message)
      } else {
        data = perfilCriado
      }
    }

    setPerfil(data)
    setCarregandoPerfil(false)
    return data
  }, [])

  useEffect(() => {
    if (ROTAS_PUBLICAS.includes(pathname)) {
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
      carregarPerfil(user.id).then((perfilCarregado) => {
        if (!ativo) return
        const ehContabilista = perfilCarregado?.role === 'contabilista'

        // Contas de contabilista têm uma experiência própria — por agora, só a
        // página de perfil deles. Redireciona sempre que tentarem ir a outro lado.
        if (ehContabilista && pathname !== '/contabilista/perfil') {
          router.replace('/contabilista/perfil')
        }

        // E no sentido inverso: uma conta de cliente não deve conseguir aceder
        // à página de perfil de contabilista.
        if (!ehContabilista && pathname === '/contabilista/perfil') {
          router.replace('/painel')
        }
      })
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

  // Rotas públicas: sem guarda, sem barra de navegação, sem botão de sair.
  if (ROTAS_PUBLICAS.includes(pathname)) {
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
      {perfil?.role !== 'contabilista' && <NavBar />}
    </PerfilContext.Provider>
  )
}

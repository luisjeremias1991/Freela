'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import PageTitle from '../components/ui/PageTitle'

function formatarData(d) {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function diasQueFaltam(dataStr) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataObrigacao = new Date(dataStr + 'T00:00:00')
  return Math.round((dataObrigacao - hoje) / (1000 * 60 * 60 * 24))
}

export default function Prazos() {
  const { perfil } = usePerfil()
  const [obrigacoes, setObrigacoes] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

  // A lista de prazos é sempre grátis — só isto (o envio automático de
  // lembretes por email) é que é RC PRO. Fonte única de verdade:
  // perfil.is_pro, tal como em todo o resto da app.
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false)
  const [aGuardarNotificacoes, setAGuardarNotificacoes] = useState(false)

  useEffect(() => {
    setNotificacoesAtivas(!!perfil?.notificacoes_prazos_ativas)
  }, [perfil])

  async function alternarNotificacoes(ligado) {
    const anterior = notificacoesAtivas
    setNotificacoesAtivas(ligado) // otimista — sente-se instantâneo
    setAGuardarNotificacoes(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('perfis')
      .upsert({ id: user.id, notificacoes_prazos_ativas: ligado }, { onConflict: 'id' })

    setAGuardarNotificacoes(false)

    if (error) {
      setNotificacoesAtivas(anterior) // reverte se a gravação falhar
      setMensagem('Erro ao guardar: ' + error.message)
    }
  }

  async function criarObrigacoesPorDefeito(userId) {
    const hoje = new Date()

    const daqui2Meses = new Date(hoje)
    daqui2Meses.setMonth(daqui2Meses.getMonth() + 2)

    const daqui5Meses = new Date(hoje)
    daqui5Meses.setMonth(daqui5Meses.getMonth() + 5)

    const irsAnual = new Date(hoje.getFullYear() + 1, 3, 30)

    const { error } = await supabase.from('obrigacoes').insert([
      { user_id: userId, nome: 'Declaração trimestral — Segurança Social', data: formatarData(daqui2Meses), done: false },
      { user_id: userId, nome: 'Declaração trimestral — Segurança Social', data: formatarData(daqui5Meses), done: false },
      { user_id: userId, nome: 'IRS anual', data: formatarData(irsAnual), done: false }
    ])

    if (error) {
      setMensagem('Erro ao criar prazos por defeito: ' + error.message)
      setCarregando(false)
    } else {
      carregarObrigacoes()
    }
  }

  async function carregarObrigacoes() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: lista, error } = await supabase
      .from('obrigacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: true })

    if (error) {
      setMensagem('Erro ao carregar: ' + error.message)
      setCarregando(false)
      return
    }

    if (lista.length === 0) {
      await criarObrigacoesPorDefeito(user.id)
      return
    }

    setObrigacoes(lista)
    setCarregando(false)
  }

  useEffect(() => {
    carregarObrigacoes()
  }, [])

  async function alternarDone(obrigacao) {
    const { error } = await supabase
      .from('obrigacoes')
      .update({ done: !obrigacao.done })
      .eq('id', obrigacao.id)

    if (error) {
      setMensagem('Erro ao atualizar: ' + error.message)
    } else {
      carregarObrigacoes()
    }
  }

  if (carregando) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Prazos</PageTitle>
      <p className="text-sm text-brand-muted mb-5">Toca num prazo para o marcares como concluído</p>

      {perfil?.is_pro ? (
        <div className="flex items-center justify-between gap-3 mb-6 p-4 rounded-lg border border-brand-line">
          <div>
            <p className="text-sm font-medium text-gray-900">Notificações automáticas</p>
            <p className="text-xs text-brand-muted">Recebe um email quando um prazo estiver a chegar.</p>
          </div>
          <input
            type="checkbox"
            checked={notificacoesAtivas}
            onChange={(e) => alternarNotificacoes(e.target.checked)}
            disabled={aGuardarNotificacoes}
            className="accent-brand-primary w-5 h-5 shrink-0 cursor-pointer"
            aria-label="Ativar notificações automáticas de prazos"
          />
        </div>
      ) : (
        <Link
          href="/perfil#plano"
          className="block text-center py-2.5 mb-6 rounded-lg border border-brand-line text-brand-muted hover:border-brand-primary hover:text-brand-primary transition no-underline"
        >
          🔒 Notificações automáticas (RC PRO)
        </Link>
      )}

      {obrigacoes.length === 0 && <p className="text-sm text-brand-muted">Ainda não tens prazos.</p>}

      {obrigacoes.map((o) => {
        const dias = diasQueFaltam(o.data)
        return (
          <div
            key={o.id}
            onClick={() => alternarDone(o)}
            className="flex items-center gap-3 py-4 border-b border-brand-line cursor-pointer hover:bg-brand-navy-tint transition"
          >
            <span
              aria-hidden="true"
              className={`w-[26px] h-[26px] rounded-full border-2 border-brand-primary shrink-0 ${
                o.done ? 'bg-brand-primary' : 'bg-white'
              }`}
            />
            <div className="flex-1">
              <div className={o.done ? 'line-through text-brand-muted' : 'text-gray-900'}>
                <strong className="font-medium">{o.nome}</strong> — {o.data}
              </div>
              <div className="text-xs text-brand-muted mt-0.5">
                {dias >= 0 ? `Faltam ${dias} dias` : `Atrasado ${Math.abs(dias)} dias`}
              </div>
            </div>
          </div>
        )
      })}

      {mensagem && <p className="text-sm text-brand-muted mt-5">{mensagem}</p>}
    </div>
  )
}

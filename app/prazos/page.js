'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
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
  const [obrigacoes, setObrigacoes] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

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

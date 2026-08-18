'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

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

  if (carregando) return <p style={{ padding: 20 }}>A carregar...</p>

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Prazos</h1>
      <p style={{ color: '#888', marginBottom: 20 }}>Toca num prazo para o marcares como concluído</p>

      {obrigacoes.length === 0 && <p>Ainda não tens prazos.</p>}

      {obrigacoes.map((o) => {
        const dias = diasQueFaltam(o.data)
        return (
          <div
            key={o.id}
            onClick={() => alternarDone(o)}
            style={{
              padding: 15,
              borderBottom: '1px solid #333',
              cursor: 'pointer'
            }}
          >
            <div
              style={{
                textDecoration: o.done ? 'line-through' : 'none',
                color: o.done ? '#888' : 'inherit'
              }}
            >
              <strong>{o.nome}</strong> — {o.data}
            </div>
            <div style={{ color: '#888', fontSize: 14 }}>
              {dias >= 0 ? `Faltam ${dias} dias` : `Atrasado ${Math.abs(dias)} dias`}
            </div>
          </div>
        )
      })}

      <p>{mensagem}</p>
    </div>
  )
}

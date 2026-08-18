'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'

function topClientes(recibos) {
  const totaisPorCliente = {}
  recibos.forEach((r) => {
    totaisPorCliente[r.cliente] = (totaisPorCliente[r.cliente] || 0) + r.valor
  })

  return Object.entries(totaisPorCliente)
    .map(([cliente, total]) => ({ cliente, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
}

export default function Painel() {
  const { perfil, carregandoPerfil } = usePerfil()
  const [recibos, setRecibos] = useState([])
  const [despesas, setDespesas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [formDespesaAberto, setFormDespesaAberto] = useState(false)
  const [descricaoDespesa, setDescricaoDespesa] = useState('')
  const [valorDespesa, setValorDespesa] = useState('')
  const [dataDespesa, setDataDespesa] = useState('')
  const [mensagemDespesa, setMensagemDespesa] = useState('')

  async function carregarDespesas(userId) {
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false })

    setDespesas(data || [])
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('recibos')
        .select('*')
        .eq('user_id', user.id)

      setRecibos(data || [])
      await carregarDespesas(user.id)
      setCarregando(false)
    }
    carregar()
  }, [])

  async function adicionarDespesa() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!descricaoDespesa || !valorDespesa || !dataDespesa) {
      setMensagemDespesa('Preenche descrição, valor e data.')
      return
    }

    const { error } = await supabase.from('despesas').insert({
      user_id: user.id,
      descricao: descricaoDespesa,
      valor: parseFloat(valorDespesa),
      data: dataDespesa
    })

    if (error) {
      setMensagemDespesa('Erro ao guardar: ' + error.message)
    } else {
      setMensagemDespesa('')
      setDescricaoDespesa('')
      setValorDespesa('')
      setDataDespesa('')
      setFormDespesaAberto(false)
      carregarDespesas(user.id)
    }
  }

  const total = recibos.reduce((soma, r) => soma + r.valor, 0)
  // cálculo simplificado — 11,5% de IRS (só se retencao=true) + 21,4% de SS sobre 70% do valor
  const liquido = recibos.reduce((soma, r) => {
    const irs = r.retencao ? r.valor * 0.115 : 0
    const ss = r.valor * 0.70 * 0.214
    return soma + (r.valor - irs - ss)
  }, 0)

  // "Pôr de lado" — estimativas simplificadas:
  // IVA: 23% do faturado se o regime de IVA for "normal" (0 se isento)
  // Segurança Social: sempre 70% do valor de cada recibo × taxa_ss do perfil (independente da categoria/coeficiente)
  // IRS a pagar: 11,5% sobre os recibos sem retenção na fonte (o freelancer é que tem de entregar esse IRS)
  // Pagamentos por conta: depende do imposto liquidado no ano anterior, que esta app ainda não tem — mostrado como indisponível
  const taxaSS = perfil?.taxa_ss != null ? perfil.taxa_ss : 0.214
  const ivaAPorDeLado = perfil?.regime_iva === 'normal' ? total * 0.23 : 0
  const ssAPorDeLado = recibos.reduce((soma, r) => soma + r.valor * 0.70 * taxaSS, 0)
  const irsSemRetencaoAPorDeLado = recibos
    .filter((r) => !r.retencao)
    .reduce((soma, r) => soma + r.valor, 0) * 0.115

  const clientesPrincipais = topClientes(recibos)

  if (carregando) return <p style={{ padding: 20 }}>A carregar...</p>

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Painel</h1>
      <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
        <p>Total faturado</p>
        <h2>{total.toFixed(2)} €</h2>
      </div>
      <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
        <p>Estimativa líquida</p>
        <h2>{liquido.toFixed(2)} €</h2>
      </div>

      {!carregandoPerfil && perfil?.is_pro && (
        <>
          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <h3>Pôr de lado</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 10 }}>Estimativas — confirma sempre com o teu contabilista.</p>

            <div style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span>IVA</span> — <strong>{ivaAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span>Segurança Social</span> — <strong>{ssAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
              <span>Pagamentos por conta</span> — <strong style={{ color: '#888' }}>Ainda não disponível</strong>
            </div>
            <div style={{ padding: '8px 0' }}>
              <span>IRS a pagar (sem retenção)</span> — <strong>{irsSemRetencaoAPorDeLado.toFixed(2)} €</strong>
            </div>
          </div>

          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <h3>Principais clientes</h3>
            {clientesPrincipais.length === 0 && <p>Ainda não tens recibos suficientes.</p>}
            {clientesPrincipais.map((c) => (
              <div key={c.cliente} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                <strong>{c.cliente}</strong> — {c.total.toFixed(2)} €
              </div>
            ))}
          </div>

          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <h3>Despesas da atividade</h3>
            {despesas.length === 0 && <p>Ainda não tens despesas registadas.</p>}
            {despesas.map((d) => (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                <strong>{d.descricao}</strong> — {d.valor}€ — {d.data}
              </div>
            ))}

            {mensagemDespesa && <p>{mensagemDespesa}</p>}

            {!formDespesaAberto && (
              <button onClick={() => setFormDespesaAberto(true)} style={{ padding: 10, marginTop: 10 }}>
                + Adicionar despesa
              </button>
            )}

            {formDespesaAberto && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Descrição"
                  value={descricaoDespesa}
                  onChange={(e) => setDescricaoDespesa(e.target.value)}
                  style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
                />
                <input
                  type="number"
                  placeholder="Valor (€)"
                  value={valorDespesa}
                  onChange={(e) => setValorDespesa(e.target.value)}
                  style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
                />
                <input
                  type="date"
                  value={dataDespesa}
                  onChange={(e) => setDataDespesa(e.target.value)}
                  style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
                />
                <button onClick={adicionarDespesa} style={{ padding: 10, marginRight: 10 }}>Guardar despesa</button>
                <button onClick={() => setFormDespesaAberto(false)} style={{ padding: 10 }}>Cancelar</button>
              </div>
            )}
          </div>
        </>
      )}

      {!carregandoPerfil && !perfil?.is_pro && (
        <div style={{ padding: 15, border: '1px solid #444' }}>
          <h3>Funcionalidades Pro</h3>
          <p style={{ color: '#888' }}>Desbloqueia "Pôr de lado", principais clientes e despesas da atividade.</p>
          <Link href="/perfil" style={{ color: '#10284D', fontWeight: 'bold' }}>Ver Freela Pro</Link>
        </div>
      )}
    </div>
  )
}

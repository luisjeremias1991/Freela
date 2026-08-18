'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Input from '../components/ui/Input'
import InfoIcon from '../components/ui/InfoIcon'

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
  // "Recebido" é derivado de data_pagamento — se estiver preenchida, o recibo está pago.
  const recebido = recibos
    .filter((r) => !!r.data_pagamento)
    .reduce((soma, r) => soma + r.valor, 0)
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

  if (carregando) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Painel</PageTitle>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Total faturado</p>
        <p className="text-2xl font-bold text-gray-900">{total.toFixed(2)} €</p>
      </Card>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Total recebido</p>
        <p className="text-2xl font-bold text-gray-900">{recebido.toFixed(2)} €</p>
      </Card>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Estimativa líquida</p>
        <p className="text-2xl font-bold text-gray-900">{liquido.toFixed(2)} €</p>
      </Card>

      {!carregandoPerfil && perfil?.is_pro && (
        <>
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Pôr de lado</h3>
            <p className="text-xs text-brand-muted mb-3">Estimativas — confirma sempre com o teu contabilista.</p>

            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted flex items-center gap-1.5">
                IVA
                <InfoIcon
                  titulo="Limite de isenção de IVA"
                  texto="É o valor de faturação anual a partir do qual deixas de poder estar isento de IVA. Ao ultrapassá-lo, passas automaticamente para o regime normal e tens de começar a cobrar e entregar IVA nos teus recibos."
                />
              </span>
              <strong className="text-gray-900">{ivaAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted flex items-center gap-1.5">
                Segurança Social
                <InfoIcon
                  titulo="Segurança Social"
                  texto="É a tua contribuição obrigatória, entregue trimestralmente. Não é descontada pelo cliente — tens de a pagar tu, a partir do que recebeste."
                />
              </span>
              <strong className="text-gray-900">{ssAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted flex items-center gap-1.5">
                Pagamentos por conta
                <InfoIcon
                  titulo="Pagamentos por conta"
                  texto="É um mecanismo do regime de contabilidade organizada, para adiantar IRS ao longo do ano. No regime simplificado (o mais comum em recibos verdes) normalmente não se aplica — por isso aparece como &quot;ainda não disponível&quot; aqui."
                />
              </span>
              <strong className="text-brand-muted font-normal">Ainda não disponível</strong>
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-brand-muted flex items-center gap-1.5">
                IRS a pagar (sem retenção)
                <InfoIcon
                  titulo="IRS a pagar (sem retenção)"
                  texto="Quando um cliente não desconta IRS no momento do pagamento, esse valor não desaparece — fica para pagares de uma vez na declaração anual de IRS, no ano seguinte."
                />
              </span>
              <strong className="text-gray-900">{irsSemRetencaoAPorDeLado.toFixed(2)} €</strong>
            </div>
          </Card>

          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Principais clientes</h3>
            {clientesPrincipais.length === 0 && <p className="text-sm text-brand-muted">Ainda não tens recibos suficientes.</p>}
            {clientesPrincipais.map((c) => (
              <div key={c.cliente} className="flex justify-between py-2 border-b border-brand-line text-sm last:border-0">
                <strong className="text-gray-900 font-medium">{c.cliente}</strong>
                <span className="text-gray-900">{c.total.toFixed(2)} €</span>
              </div>
            ))}
          </Card>

          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Despesas da atividade</h3>
            {despesas.length === 0 && <p className="text-sm text-brand-muted">Ainda não tens despesas registadas.</p>}
            {despesas.map((d) => (
              <div key={d.id} className="flex justify-between py-2 border-b border-brand-line text-sm last:border-0">
                <strong className="text-gray-900 font-medium">{d.descricao}</strong>
                <span className="text-gray-900">{d.valor}€ — {d.data}</span>
              </div>
            ))}

            {mensagemDespesa && <p className="text-sm text-brand-muted mt-2">{mensagemDespesa}</p>}

            {!formDespesaAberto && (
              <Button variant="secondary" className="mt-3" onClick={() => setFormDespesaAberto(true)}>
                + Adicionar despesa
              </Button>
            )}

            {formDespesaAberto && (
              <div className="mt-3 flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Descrição"
                  value={descricaoDespesa}
                  onChange={(e) => setDescricaoDespesa(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Valor (€)"
                  value={valorDespesa}
                  onChange={(e) => setValorDespesa(e.target.value)}
                />
                <Input
                  type="date"
                  value={dataDespesa}
                  onChange={(e) => setDataDespesa(e.target.value)}
                />
                <div className="flex gap-2.5">
                  <Button className="flex-1" onClick={adicionarDespesa}>Guardar despesa</Button>
                  <Button variant="secondary" onClick={() => setFormDespesaAberto(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {!carregandoPerfil && !perfil?.is_pro && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-1">Funcionalidades Pro</h3>
          <p className="text-sm text-brand-muted mb-3">Desbloqueia &quot;Pôr de lado&quot;, principais clientes e despesas da atividade.</p>
          <Link href="/perfil" className="text-brand-navy font-semibold text-sm">Ver Freela Pro</Link>
        </Card>
      )}
    </div>
  )
}

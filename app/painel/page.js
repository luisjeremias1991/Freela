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

const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const OPCOES_PERIODO_FATURACAO = [
  { valor: '12m', rotulo: 'Últimos 12 meses' },
  { valor: 'anoCorrente', rotulo: 'Ano corrente' },
  { valor: '2025', rotulo: '2025' },
  { valor: '2024', rotulo: '2024' }
]

// Gera a lista de meses (com ano, mês e se é futuro/atual) para o período
// escolhido — os totais reais só são somados a seguir, a partir dos recibos.
function gerarMesesDoPeriodo(periodo) {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  const meses = []

  if (periodo === '12m') {
    for (let i = 11; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - i, 1)
      const ano = data.getFullYear()
      const mes = data.getMonth()
      meses.push({
        ano,
        mes,
        chave: `${ano}-${String(mes + 1).padStart(2, '0')}`,
        ehFuturo: false,
        ehAtual: ano === anoAtual && mes === mesAtual
      })
    }
    return meses
  }

  const ano = periodo === 'anoCorrente' ? anoAtual : parseInt(periodo, 10)
  for (let mes = 0; mes < 12; mes++) {
    meses.push({
      ano,
      mes,
      chave: `${ano}-${String(mes + 1).padStart(2, '0')}`,
      ehFuturo: ano === anoAtual && mes > mesAtual,
      ehAtual: ano === anoAtual && mes === mesAtual
    })
  }
  return meses
}

// Soma o "valor" dos recibos (por data_emissao) em cada mês da lista.
function totaisPorMes(recibos, meses) {
  const somaPorChave = {}
  recibos.forEach((r) => {
    if (!r.data_emissao) return
    const chave = r.data_emissao.slice(0, 7) // 'YYYY-MM-DD' → 'YYYY-MM'
    somaPorChave[chave] = (somaPorChave[chave] || 0) + r.valor
  })

  return meses.map((m) => ({ ...m, total: somaPorChave[m.chave] || 0 }))
}

function rotuloMes(m, periodo) {
  const nome = NOMES_MESES[m.mes]
  // Numa janela de 12 meses corridos há sempre duas passagens de ano — o "Jan"
  // sozinho ficaria ambíguo, por isso ganha o ano ao lado só nesse caso.
  if (periodo === '12m' && m.mes === 0) {
    return `${nome} '${String(m.ano).slice(2)}`
  }
  return nome
}

function GraficoFaturacaoMensal({ meses, periodo }) {
  const [mesEmFoco, setMesEmFoco] = useState(null)
  const [verTabela, setVerTabela] = useState(false)

  const maxValor = Math.max(1, ...meses.map((m) => m.total))
  const alturaGrafico = 110
  const larguraBarra = 18
  const espacamento = 10
  const larguraTotal = meses.length * (larguraBarra + espacamento)

  return (
    <div>
      {verTabela ? (
        <table className="w-full text-xs mb-2">
          <thead>
            <tr className="text-left text-brand-muted">
              <th className="font-normal pb-1">Mês</th>
              <th className="font-normal pb-1 text-right">Faturado</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave} className="border-t border-brand-line">
                <td className="py-1 text-gray-900">{rotuloMes(m, periodo)} {m.ano}</td>
                <td className="py-1 text-right text-gray-900">
                  {m.ehFuturo ? '—' : `${m.total.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${larguraTotal} ${alturaGrafico + 20}`}
            className="w-full"
            role="img"
            aria-label="Gráfico de barras da faturação por mês"
          >
            {meses.map((m, i) => {
              const x = i * (larguraBarra + espacamento) + espacamento / 2
              const alturaBarra = Math.max((m.total / maxValor) * alturaGrafico, m.total > 0 ? 2 : 0)
              const y = alturaGrafico - alturaBarra

              return (
                <g key={m.chave}>
                  {m.ehFuturo ? (
                    <rect
                      x={x}
                      y={alturaGrafico - 6}
                      width={larguraBarra}
                      height={6}
                      rx={2}
                      fill="none"
                      stroke="var(--color-brand-line)"
                      strokeDasharray="3,2"
                    />
                  ) : (
                    <rect
                      x={x}
                      y={y}
                      width={larguraBarra}
                      height={Math.max(alturaBarra, 1)}
                      rx={4}
                      fill={m.ehAtual ? 'var(--color-brand-navy)' : 'var(--color-brand-line)'}
                      tabIndex={0}
                      onMouseEnter={() => setMesEmFoco(i)}
                      onMouseLeave={() => setMesEmFoco(null)}
                      onFocus={() => setMesEmFoco(i)}
                      onBlur={() => setMesEmFoco(null)}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      <title>{`${rotuloMes(m, periodo)} ${m.ano}: ${m.total.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €`}</title>
                    </rect>
                  )}

                  <text
                    x={x + larguraBarra / 2}
                    y={alturaGrafico + 14}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--color-brand-muted)"
                  >
                    {rotuloMes(m, periodo)}
                  </text>
                </g>
              )
            })}
          </svg>

          <p className="text-xs text-brand-muted text-center mt-1 h-4">
            {mesEmFoco != null && !meses[mesEmFoco].ehFuturo && (
              <>
                {rotuloMes(meses[mesEmFoco], periodo)} {meses[mesEmFoco].ano}:{' '}
                <strong className="text-gray-900">
                  {meses[mesEmFoco].total.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
                </strong>
              </>
            )}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => setVerTabela((v) => !v)}
        className="text-xs text-brand-navy font-medium cursor-pointer"
      >
        {verTabela ? 'Ver gráfico' : 'Ver como tabela'}
      </button>
    </div>
  )
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

  const [contabilistas, setContabilistas] = useState([])
  const [carregandoContabilistas, setCarregandoContabilistas] = useState(true)

  const [periodoFaturacao, setPeriodoFaturacao] = useState('anoCorrente')

  async function carregarDespesas(userId) {
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false })

    setDespesas(data || [])
  }

  async function carregarContabilistas() {
    setCarregandoContabilistas(true)

    const { data, error } = await supabase
      .from('contabilistas')
      .select('*')
      .eq('tem_slots', true)

    if (error) {
      console.error('Erro ao carregar contabilistas:', error.message)
      setContabilistas([])
    } else {
      setContabilistas(data || [])
    }

    setCarregandoContabilistas(false)
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
    carregarContabilistas()
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

  const mesesFaturacao = totaisPorMes(recibos, gerarMesesDoPeriodo(periodoFaturacao))
  const totalFaturacaoPeriodo = mesesFaturacao.reduce((soma, m) => soma + m.total, 0)
  const sufixoFaturacaoPeriodo = periodoFaturacao === '12m'
    ? '12m'
    : periodoFaturacao === 'anoCorrente'
      ? String(new Date().getFullYear())
      : periodoFaturacao

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

      <Card className="mb-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-900">Faturação por mês</h3>
          <p className="text-sm text-brand-muted text-right">
            <strong className="text-gray-900">
              {totalFaturacaoPeriodo.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} €
            </strong>
            {' '}/ {sufixoFaturacaoPeriodo}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {OPCOES_PERIODO_FATURACAO.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setPeriodoFaturacao(opcao.valor)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                periodoFaturacao === opcao.valor
                  ? 'bg-brand-navy text-white'
                  : 'bg-white text-gray-900 border border-brand-line'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        <GraficoFaturacaoMensal meses={mesesFaturacao} periodo={periodoFaturacao} />
      </Card>

      {!carregandoPerfil && perfil?.is_pro && (
        <>
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Pôr de lado</h3>
            <p className="text-xs text-brand-muted mb-3">Estimativas — confirma sempre com o teu contabilista.</p>

            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted">
                IVA
                <InfoIcon
                  titulo="Limite de isenção de IVA"
                  texto="É o valor de faturação anual a partir do qual deixas de poder estar isento de IVA. Ao ultrapassá-lo, passas automaticamente para o regime normal e tens de começar a cobrar e entregar IVA nos teus recibos."
                />
              </span>
              <strong className="text-gray-900">{ivaAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted">
                Segurança Social
                <InfoIcon
                  titulo="Segurança Social"
                  texto="É a tua contribuição obrigatória, entregue trimestralmente. Não é descontada pelo cliente — tens de a pagar tu, a partir do que recebeste."
                />
              </span>
              <strong className="text-gray-900">{ssAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <span className="text-brand-muted">
                Pagamentos por conta
                <InfoIcon
                  titulo="Pagamentos por conta"
                  texto="É um mecanismo do regime de contabilidade organizada, para adiantar IRS ao longo do ano. No regime simplificado (o mais comum em recibos verdes) normalmente não se aplica — por isso aparece como &quot;ainda não disponível&quot; aqui."
                />
              </span>
              <strong className="text-brand-muted font-normal">Ainda não disponível</strong>
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="text-brand-muted">
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
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Funcionalidades Pro</h3>
          <p className="text-sm text-brand-muted mb-3">Desbloqueia &quot;Pôr de lado&quot;, principais clientes e despesas da atividade.</p>
          <Link href="/perfil" className="text-brand-navy font-semibold text-sm">Ver Freela Pro</Link>
        </Card>
      )}

      {!carregandoContabilistas && contabilistas.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 mt-8">Apoio</h2>
          {contabilistas.map((contabilista) => (
            <Card key={contabilista.id} className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-1">{contabilista.nome}</h3>
              {contabilista.bio && <p className="text-sm text-brand-muted mb-2">{contabilista.bio}</p>}
              {contabilista.especialidade && (
                <p className="text-sm text-gray-900 mb-1">{contabilista.especialidade}</p>
              )}
              {contabilista.preco_hora != null && (
                <p className="text-sm text-brand-muted mb-4">{contabilista.preco_hora} €/hora</p>
              )}

              {contabilista.cal_link ? (
                <a
                  href={contabilista.cal_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-medium bg-brand-navy text-white hover:opacity-90 transition cursor-pointer no-underline"
                >
                  Marcar reunião
                </a>
              ) : (
                <p className="text-xs text-brand-muted">Ainda sem marcações disponíveis.</p>
              )}
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

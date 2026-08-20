'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import {
  calcularFaturado,
  somarFaturado,
  somarRecebido,
  somarPorDeLado,
  calcularLucroLiquido
} from '../../lib/calculosFinanceiros'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Input from '../components/ui/Input'
import RotuloInfo from '../components/ui/RotuloInfo'

// Junta uma lista em português, com "e" antes do último item — usado na
// linha explicativa do cartão "Lucro líquido real".
function juntarComE(itens) {
  if (itens.length === 0) return ''
  if (itens.length === 1) return itens[0]
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

// Ranking por faturado (todos os recibos, pagos ou não) — ver rótulo
// "Principais clientes (faturado)" no JSX, tornado explícito na auditoria.
function topClientes(recibos) {
  const totaisPorCliente = {}
  recibos.forEach((r) => {
    totaisPorCliente[r.cliente] = (totaisPorCliente[r.cliente] || 0) + calcularFaturado(r)
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

// Soma o faturado (por data_emissao) em cada mês da lista.
function totaisPorMes(recibos, meses) {
  const somaPorChave = {}
  recibos.forEach((r) => {
    if (!r.data_emissao) return
    const chave = r.data_emissao.slice(0, 7) // 'YYYY-MM-DD' → 'YYYY-MM'
    somaPorChave[chave] = (somaPorChave[chave] || 0) + calcularFaturado(r)
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
                      fill={m.ehAtual ? 'var(--color-brand-primary)' : 'var(--color-brand-line)'}
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
        className="text-xs text-brand-primary font-medium cursor-pointer"
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

  const [despesasPessoais, setDespesasPessoais] = useState([])

  async function carregarDespesas(userId) {
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false })

    setDespesas(data || [])
  }

  // Tabela própria do Orçamento pessoal (app/orcamento/page.js) — distinta de
  // "despesas" (despesas da atividade, Pro). Só precisamos dela aqui para o
  // cartão-resumo "Sobra real este mês", por isso não pagina/ordena nada.
  async function carregarDespesasPessoais(userId) {
    const { data, error } = await supabase
      .from('despesas_pessoais')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Erro ao carregar despesas pessoais:', error.message)
      setDespesasPessoais([])
    } else {
      setDespesasPessoais(data || [])
    }
  }

  async function carregarContabilistas() {
    setCarregandoContabilistas(true)

    // "Disponibilidade aberta" = mesmo marcável, não só marcado como
    // "tem_slots". Um contabilista com tem_slots=true mas sem cal_link ainda
    // não tem forma de ser contactado — não deve aparecer em "Apoio" (nem o
    // cartão, nem só o botão).
    const { data, error } = await supabase
      .from('contabilistas')
      .select('*')
      .eq('tem_slots', true)
      .not('cal_link', 'is', null)

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
      await carregarDespesasPessoais(user.id)
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

  // Todos os cálculos de faturado/recebido/IVA/SS/IRS vivem agora num único
  // sítio (lib/calculosFinanceiros.js), testado à parte — ver
  // __tests__/calculosFinanceiros.test.js. Esta página só decide o ÂMBITO
  // (todos os recibos pagos vs só os pagos este mês) e passa-o às funções.
  const recibosPagos = recibos.filter((r) => !!r.data_pagamento)

  const total = somarFaturado(recibos)
  const recebido = somarRecebido(recibos)

  // "Pôr de lado" — estimativas simplificadas, sempre com base no que já foi
  // RECEBIDO: um recibo faturado mas ainda não pago não gera nenhuma
  // obrigação a pôr de lado nem entra no lucro líquido, porque ainda não há
  // dinheiro nenhum para pôr de lado (decisão da auditoria de cálculos
  // financeiros — antes este cartão usava o faturado todo, o que inflacionava
  // "Pôr de lado" e desalinhava "Lucro líquido real" para quem tivesse
  // recibos por pagar).
  const porDeLado = somarPorDeLado(recibosPagos, perfil)
  const ivaAPorDeLado = porDeLado.iva
  const ssAPorDeLado = porDeLado.ss
  const irsSemRetencaoAPorDeLado = porDeLado.irs

  // Pagamentos por conta — não é calculado pela app (ver Perfil), é sempre um
  // valor introduzido manualmente pela pessoa, referente ao ano corrente
  // (mesmo padrão de "ano" usado no resto da app: calculado com new Date(),
  // nunca guardado como conceito à parte). Um valor de um ano anterior não
  // conta como definido este ano.
  const anoCorrente = new Date().getFullYear()
  const pagamentosPorContaDefinidoEsteAno = perfil?.pagamentos_por_conta_ano === anoCorrente
  const pagamentosPorContaIsento = pagamentosPorContaDefinidoEsteAno && !!perfil?.pagamentos_por_conta_isento
  const pagamentosPorConta = pagamentosPorContaDefinidoEsteAno && !pagamentosPorContaIsento && perfil?.pagamentos_por_conta_valor != null
    ? perfil.pagamentos_por_conta_valor
    : 0

  // "Lucro líquido real" — o número mais importante da página: o total
  // recebido menos exatamente os mesmos valores do detalhe "Pôr de lado"
  // logo abaixo (nada recalculado à parte, para os dois nunca poderem
  // discordar entre si). A nota de "estimativa parcial" só aparece enquanto
  // pagamentos por conta continuar por definir (nem valor, nem isenção) —
  // uma vez resolvido de qualquer das formas, deixa de faltar informação.
  const lucroLiquidoReal = calcularLucroLiquido(recibosPagos, perfil, pagamentosPorConta)

  const componentesSubtraidosLucro = []
  if (ivaAPorDeLado > 0) componentesSubtraidosLucro.push('IVA')
  componentesSubtraidosLucro.push('Segurança Social')
  if (irsSemRetencaoAPorDeLado > 0) componentesSubtraidosLucro.push('IRS')
  if (pagamentosPorConta > 0) componentesSubtraidosLucro.push('Pagamentos por conta')
  const textoSubtracaoLucro = `Recebido menos ${juntarComE(componentesSubtraidosLucro)}`

  // "Sobra real este mês" — cartão do Orçamento pessoal, Recibos Claros Pro.
  // Ao contrário do cartão "Pôr de lado" (também Pro, acumulado desde sempre),
  // este é sempre reduzido ao mês corrente: só recibos efetivamente recebidos
  // este mês, a fatia desses recibos que ainda terás de pôr de lado para
  // impostos, e as despesas pessoais lançadas este mês.
  const hoje = new Date()
  const chaveMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  // Mesma convenção: filtra o âmbito aqui (recibos pagos este mês) e entrega
  // às mesmas funções partilhadas — nenhuma fórmula própria escrita de novo.
  const recibosPagosMesAtual = recibosPagos.filter((r) => r.data_pagamento.slice(0, 7) === chaveMesAtual)
  const recebidoMesAtual = somarRecebido(recibosPagosMesAtual)
  const porDeLadoMesAtual = somarPorDeLado(recibosPagosMesAtual, perfil)
  const despesasPessoaisMesAtual = despesasPessoais
    .filter((d) => d.data && d.data.slice(0, 7) === chaveMesAtual)
    .reduce((soma, d) => soma + d.valor, 0)
  const sobraRealMesAtual = recebidoMesAtual - porDeLadoMesAtual.total - despesasPessoaisMesAtual

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

      <Card className="mb-4 border-2 border-brand-primary">
        <p className="text-sm text-brand-muted mb-1">Lucro líquido real</p>
        <p className="text-3xl font-bold text-gray-900">{lucroLiquidoReal.toFixed(2)} €</p>
        <p className="text-xs text-brand-muted mt-2">{textoSubtracaoLucro}</p>
        {!pagamentosPorContaDefinidoEsteAno && (
          <p className="text-xs text-brand-muted mt-1">* sem pagamentos por conta, ainda não calculados</p>
        )}
      </Card>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Total faturado</p>
        <p className="text-2xl font-bold text-gray-900">{total.toFixed(2)} €</p>
      </Card>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Total recebido</p>
        <p className="text-2xl font-bold text-gray-900">{recebido.toFixed(2)} €</p>
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
                  ? 'bg-brand-primary text-white'
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
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Orçamento pessoal</h3>
          <p className="text-sm text-brand-muted mb-1">Sobra real este mês</p>
          <p className="text-2xl font-bold text-gray-900 mb-3">{sobraRealMesAtual.toFixed(2)} €</p>
          <Link href="/orcamento" className="text-brand-primary font-semibold text-sm">
            Ver orçamento completo →
          </Link>
        </Card>
      )}

      {!carregandoPerfil && !perfil?.is_pro && (
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Orçamento pessoal</h3>
          <p className="text-sm text-brand-muted mb-3">
            Vê quanto te sobra mesmo este mês, depois de impostos e despesas pessoais.
          </p>
          <Link href="/perfil#plano" className="text-brand-primary font-semibold text-sm">Ver Recibos Claros Pro</Link>
        </Card>
      )}

      {!carregandoPerfil && perfil?.is_pro && (
        <>
          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Pôr de lado</h3>
            <p className="text-xs text-brand-muted mb-3">Estimativas — confirma sempre com o teu contabilista.</p>

            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <RotuloInfo
                className="text-brand-muted"
                titulo="Limite de isenção de IVA"
                texto="É o valor de faturação anual a partir do qual deixas de poder estar isento de IVA. Ao ultrapassá-lo, passas automaticamente para o regime normal e tens de começar a cobrar e entregar IVA nos teus recibos."
              >
                IVA
              </RotuloInfo>
              <strong className="text-gray-900">{ivaAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <RotuloInfo
                className="text-brand-muted"
                titulo="Segurança Social"
                texto="É a tua contribuição obrigatória, entregue trimestralmente. Não é descontada pelo cliente — tens de a pagar tu, a partir do que recebeste."
              >
                Segurança Social
              </RotuloInfo>
              <strong className="text-gray-900">{ssAPorDeLado.toFixed(2)} €</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-line text-sm">
              <RotuloInfo
                className="text-brand-muted"
                titulo="Pagamentos por conta"
                texto={
                  pagamentosPorContaDefinidoEsteAno
                    ? 'Valor inserido manualmente por ti no Perfil, a partir da Demonstração de Liquidação de IRS do ano anterior — a app não consegue calcular isto sozinha. Está dividido em 3 prestações, com prazo a 20 de julho, 20 de setembro e 20 de dezembro, já criadas em Prazos.'
                    : 'É um adiantamento de IRS pago em 3 prestações (julho, setembro, dezembro), calculado a partir da tua Demonstração de Liquidação de IRS do ano anterior, no Portal das Finanças — só tu tens acesso a esse valor, por isso introduz-o no Perfil assim que o souberes.'
                }
              >
                Pagamentos por conta
              </RotuloInfo>
              {pagamentosPorContaDefinidoEsteAno ? (
                <strong className="text-gray-900">
                  {pagamentosPorContaIsento ? 'Isento este ano' : `${pagamentosPorConta.toFixed(2)} €`}
                </strong>
              ) : (
                <span className="text-right">
                  <strong className="text-brand-muted font-normal block">Ainda não disponível</strong>
                  <Link href="/perfil" className="text-xs text-brand-primary font-semibold">
                    Já sabes o valor? Define aqui →
                  </Link>
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <RotuloInfo
                className="text-brand-muted"
                titulo="IRS a pagar (sem retenção)"
                texto="Quando um cliente não desconta IRS no momento do pagamento, esse valor não desaparece — fica para pagares de uma vez na declaração anual de IRS, no ano seguinte."
              >
                IRS a pagar (sem retenção)
              </RotuloInfo>
              <strong className="text-gray-900">{irsSemRetencaoAPorDeLado.toFixed(2)} €</strong>
            </div>
          </Card>

          <Card className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Principais clientes (faturado)</h3>
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
          <Link href="/perfil#plano" className="text-brand-primary font-semibold text-sm">Ver Recibos Claros Pro</Link>
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

              {/* A query em carregarContabilistas() já só traz contabilistas com
                  cal_link definido — não há aqui nenhum caso "sem marcações
                  disponíveis" a tratar; se não há link, o contabilista nem chega
                  a aparecer nesta lista. */}
              <a
                href={contabilista.cal_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 font-medium bg-brand-primary text-white hover:opacity-90 transition cursor-pointer no-underline"
              >
                Marcar reunião
              </a>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

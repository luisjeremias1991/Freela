'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import RotuloInfo from '../components/ui/RotuloInfo'
import { calcularCenarioSimulador, TAXA_IVA_REGIME_NORMAL } from '../../lib/calculosFinanceiros'

// Um "cenário" da comparação — as mesmas variáveis do modo normal (mais
// Regime de IVA e Acumula com trabalho por conta de outrem, que só existem
// neste modo), duplicadas, mais o resultado já calculado por
// calcularCenarioSimulador. Vive fora do componente principal porque não
// depende de nenhum estado do Simulador em si, só do que lhe é passado por
// props.
function ColunaCenario({
  titulo,
  idPrefix,
  regiao,
  setRegiao,
  primeiroAno,
  setPrimeiroAno,
  categoria,
  setCategoria,
  retencaoFonte,
  setRetencaoFonte,
  regimeIva,
  setRegimeIva,
  acumulaOutroTrabalho,
  setAcumulaOutroTrabalho,
  resultado,
  iva,
  totalComIva
}) {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">{titulo}</h3>
      <Card className="flex flex-col gap-3">
        <div>
          <Label htmlFor={`${idPrefix}-regiao`}>Região</Label>
          <Select id={`${idPrefix}-regiao`} value={regiao} onChange={(e) => setRegiao(e.target.value)}>
            <option value="continente">Continente</option>
            <option value="acores">Açores</option>
            <option value="madeira">Madeira</option>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${idPrefix}-regime-iva`}>Regime de IVA</Label>
          <Select id={`${idPrefix}-regime-iva`} value={regimeIva} onChange={(e) => setRegimeIva(e.target.value)}>
            <option value="isento">Isento art. 53º</option>
            <option value="normal">Normal</option>
          </Select>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-900">
          <input
            id={`${idPrefix}-primeiro-ano`}
            type="checkbox"
            checked={primeiroAno}
            onChange={(e) => setPrimeiroAno(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor={`${idPrefix}-primeiro-ano`} className="cursor-pointer">
            1º ano de atividade
          </label>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-900">
          <input
            id={`${idPrefix}-acumula`}
            type="checkbox"
            checked={acumulaOutroTrabalho}
            onChange={(e) => setAcumulaOutroTrabalho(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor={`${idPrefix}-acumula`} className="cursor-pointer">
            Acumula com trabalho por conta de outrem
          </label>
        </div>

        <div>
          <Label htmlFor={`${idPrefix}-categoria`}>Categoria de atividade</Label>
          <Select id={`${idPrefix}-categoria`} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="0.75">Profissão liberal (75%)</option>
            <option value="0.35">Outros serviços (35%)</option>
            <option value="0.15">Venda de mercadorias (15%)</option>
          </Select>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-900">
          <input
            id={`${idPrefix}-retencao`}
            type="checkbox"
            checked={retencaoFonte}
            onChange={(e) => setRetencaoFonte(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor={`${idPrefix}-retencao`} className="cursor-pointer">
            Cliente retém na fonte
          </label>
        </div>

        <div className="flex flex-col gap-1.5 text-sm pt-2 border-t border-brand-line">
          <div className="flex justify-between gap-2">
            <span className="text-brand-muted">{retencaoFonte ? 'Retenção de IRS' : 'IRS a pagar'}</span>
            <span className="text-gray-900">{resultado.irs.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-brand-muted">Segurança Social</span>
            <span className="text-gray-900">{resultado.ss.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-brand-line">
            <span className="font-semibold text-gray-900">Valor líquido</span>
            <strong className="text-brand-primary">{resultado.liquido.toFixed(2)} €</strong>
          </div>
          {regimeIva === 'normal' && (
            <>
              <div className="flex justify-between gap-2 pt-1.5 border-t border-brand-line">
                <span className="text-brand-muted">+ IVA a cobrar (23%)</span>
                <span className="text-gray-900">{iva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-gray-900">Total com IVA</span>
                <strong className="text-gray-900">{totalComIva.toFixed(2)} €</strong>
              </div>
              <p className="text-xs text-brand-muted">
                O IVA não é teu — cobra-se ao cliente e entrega-se ao Estado, à parte do que ficas a ganhar.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function Simulador() {
  const { perfil, carregandoPerfil } = usePerfil()
  const [modo, setModo] = useState('brutoLiquido') // 'brutoLiquido' | 'liquidoBruto' | 'comparar'

  const [valor, setValor] = useState('')
  const [primeiroAno, setPrimeiroAno] = useState(true)
  const [retencaoFonte, setRetencaoFonte] = useState(true)
  // Região fiscal — Açores/Madeira têm taxa de retenção de IRS reduzida por
  // lei. Começa igual à do Perfil assim que este carrega (mesmo padrão do
  // resto da app: um default sensato, mas continua editável só para esta
  // simulação, tal como "1º ano de atividade"/"Cliente retém na fonte").
  const [regiao, setRegiao] = useState('continente')
  useEffect(() => {
    if (perfil?.regiao) setRegiao(perfil.regiao)
  }, [perfil])
  // Só relevante no modo Bruto → Líquido, com regime de IVA normal — no modo
  // inverso o valor introduzido é sempre o que a pessoa quer receber, que por
  // definição nunca inclui IVA (o IVA nunca é teu). Default false para não
  // mudar nada em quem já usava o Simulador sem reparar nesta opção.
  const [incluiIva, setIncluiIva] = useState(false)

  // Modo "Comparar cenários" — as mesmas variáveis do modo normal (Região,
  // 1º ano, Categoria, Retenção), mais Regime de IVA e Acumula com trabalho
  // por conta de outrem (só existem neste modo), duplicadas numa Coluna A e
  // numa Coluna B independentes. Os valores por defeito vêm do Perfil, tal
  // como no modo normal, para a pessoa começar já com a sua situação real na
  // Coluna A e só mudar coisas na B para comparar. Preenchido uma única vez
  // quando o perfil carrega — depois disso, cada coluna edita-se livremente
  // sem que um refresh do perfil noutro sítio da app volte a repor os
  // valores.
  const [regiaoA, setRegiaoA] = useState('continente')
  const [primeiroAnoA, setPrimeiroAnoA] = useState(true)
  const [categoriaA, setCategoriaA] = useState('0.75')
  const [retencaoFonteA, setRetencaoFonteA] = useState(true)
  const [regimeIvaA, setRegimeIvaA] = useState('isento')
  const [acumulaOutroTrabalhoA, setAcumulaOutroTrabalhoA] = useState(false)
  const [regiaoB, setRegiaoB] = useState('continente')
  const [primeiroAnoB, setPrimeiroAnoB] = useState(true)
  const [categoriaB, setCategoriaB] = useState('0.75')
  const [retencaoFonteB, setRetencaoFonteB] = useState(true)
  const [regimeIvaB, setRegimeIvaB] = useState('isento')
  const [acumulaOutroTrabalhoB, setAcumulaOutroTrabalhoB] = useState(false)
  const cenariosInicializados = useRef(false)
  useEffect(() => {
    if (cenariosInicializados.current) return
    if (!perfil) return
    cenariosInicializados.current = true

    const categoriaPerfil = perfil.categoria_coeficiente != null ? String(perfil.categoria_coeficiente) : '0.75'
    const regiaoPerfil = perfil.regiao || 'continente'
    const regimeIvaPerfil = perfil.regime_iva || 'isento'
    const acumulaPerfil = !!perfil.acumula_outro_trabalho
    setRegiaoA(regiaoPerfil)
    setCategoriaA(categoriaPerfil)
    setRegimeIvaA(regimeIvaPerfil)
    setAcumulaOutroTrabalhoA(acumulaPerfil)
    setRegiaoB(regiaoPerfil)
    setCategoriaB(categoriaPerfil)
    setRegimeIvaB(regimeIvaPerfil)
    setAcumulaOutroTrabalhoB(acumulaPerfil)
  }, [perfil])

  // "Valor da proposta" / "Valor bruto necessário" são sempre valores SEM
  // IVA (a tarifa/honorário) — o IVA soma-se por cima na fatura, nunca entra
  // na base de IRS/SS/líquido. Por isso o IVA é só uma linha informativa à
  // parte, e lê perfil.regime_iva em vez de assumir isento por omissão.
  const taxaIva = perfil?.regime_iva === 'normal' ? 0.23 : 0

  // "Bruto → Líquido" é grátis, sempre acessível. Só "Líquido → Bruto" é
  // RC PRO — mas o próprio botão/pill fica sempre visível e
  // clicável para todos (é o formulário que fica escondido atrás do
  // bloqueio, nunca a opção em si, senão quem é grátis nem sabe que existe).
  function selecionarModo(novoModo) {
    setModo(novoModo)
  }

  // "Bruto → Líquido" é grátis. "Líquido → Bruto" e "Comparar cenários" são
  // ambos RC PRO.
  const modoBloqueado = (modo === 'liquidoBruto' || modo === 'comparar') && !perfil?.is_pro

  const valorNum = parseFloat(valor) || 0

  // Modo Bruto → Líquido
  // valorBase é sempre o valor sem IVA — se "incluiIva" estiver desligado
  // (default), valorNum já É o valor sem IVA, sem nada a descascar. Quando
  // taxaIva é 0 (isento), a divisão por (1 + 0) devolve sempre valorNum
  // inalterado, por isso esta fórmula é segura mesmo que incluiIva fique
  // ligado nalgum estado residual antes do switch aparecer/desaparecer.
  const valorBase = incluiIva ? valorNum / (1 + taxaIva) : valorNum
  const ivaAEntregar = incluiIva ? valorNum - valorBase : valorBase * taxaIva
  const totalFatura = valorBase + ivaAEntregar

  // IRS é sempre devido, retido ou não — "retencaoFonte" só muda QUEM já o
  // entregou ao Estado (o cliente, agora, ou tu próprio, depois). Nunca deixa
  // de ser subtraído do líquido, exatamente como a Segurança Social (que
  // também nunca é retida pelo cliente e ainda assim é sempre subtraída).
  // calcularCenarioSimulador (lib/calculosFinanceiros.js) é a fonte única
  // desta conta — usada aqui, nas taxas do modo Líquido → Bruto mais abaixo
  // (taxaIrs/taxaSS não dependem do valor, só dos inputs), e em cada coluna
  // do modo "Comparar cenários".
  const cenarioPrincipal = calcularCenarioSimulador({
    valorBruto: valorBase,
    primeiroAno,
    regiao,
    categoriaCoeficiente: perfil?.categoria_coeficiente,
    taxaSSPerfil: perfil?.taxa_ss
  })
  const taxaIrs = cenarioPrincipal.taxaIrs
  const taxaSS = cenarioPrincipal.taxaSS
  const percentagemRendimentoRelevante = cenarioPrincipal.percentagemRendimentoRelevante
  const irs = cenarioPrincipal.irs
  const ss = cenarioPrincipal.ss
  const liquido = cenarioPrincipal.liquido

  // Fórmula de apoio mostrada por baixo do "Valor líquido" — começa sempre no
  // valor tal como foi escrito (valorNum), nunca já no valor sem IVA. Só
  // entra o passo "(IVA)" quando incluiIva está marcado: se não estiver,
  // valorNum já É o valor sem IVA (valorBase === valorNum), por isso não há
  // nada a descontar nesse passo — o IVA nesse caso é acrescentado à parte na
  // fatura, não retirado daqui.
  const formulaLiquido = incluiIva
    ? `${valorNum.toFixed(2)} € − ${ivaAEntregar.toFixed(2)} € (IVA) − ${irs.toFixed(2)} € (IRS) − ${ss.toFixed(2)} € (SS)`
    : `${valorNum.toFixed(2)} € − ${irs.toFixed(2)} € (IRS) − ${ss.toFixed(2)} € (SS)`

  // Modo Líquido → Bruto: bruto = líquido / (1 − taxaIrs − taxaSS). IRS entra
  // sempre no divisor, retido ou não — mesma correção do outro modo: a
  // retenção não muda SE é devido, só QUEM já o entregou ao Estado.
  const divisor = 1 - taxaIrs - taxaSS
  const brutoNecessario = divisor > 0 ? valorNum / divisor : 0
  const ivaSobreBruto = brutoNecessario * taxaIva
  const totalFaturaBruto = brutoNecessario + ivaSobreBruto
  const irsSobreBruto = brutoNecessario * taxaIrs
  const ssSobreBruto = brutoNecessario * taxaSS

  // Fórmula de apoio por baixo do "Valor a faturar" — cadeia completa, do
  // líquido desejado (o que a pessoa escreveu) até ao valor final a pedir ao
  // cliente. Quando há IVA, passa pelo valor sem IVA como etapa intermédia;
  // quando isento, salta direto para o total (que é o mesmo valor).
  const formulaBruto = taxaIva > 0
    ? `${valorNum.toFixed(2)} € (líquido desejado) + ${irsSobreBruto.toFixed(2)} € (IRS) + ${ssSobreBruto.toFixed(2)} € (SS) = ${brutoNecessario.toFixed(2)} € (sem IVA) + ${ivaSobreBruto.toFixed(2)} € (IVA) = ${totalFaturaBruto.toFixed(2)} € (a faturar)`
    : `${valorNum.toFixed(2)} € (líquido desejado) + ${irsSobreBruto.toFixed(2)} € (IRS) + ${ssSobreBruto.toFixed(2)} € (SS) = ${totalFaturaBruto.toFixed(2)} € (a faturar)`

  // Mostra sempre a taxa de retenção efetivamente aplicada (já com a redução
  // regional, se houver) junto ao valor — não só o valor calculado.
  const rotuloIrs = `${retencaoFonte ? 'Retenção de IRS' : 'IRS a pagar (ainda não retido)'} (${(taxaIrs * 100).toFixed(1)}%)`

  // Modo "Comparar cenários" — mesmo valor bruto partilhado (valorNum) para
  // as duas colunas, cada uma com as suas próprias taxas/categoria/região.
  // Mesma função partilhada, chamada duas vezes com inputs diferentes.
  // "acumulaOutroTrabalho" é o mesmo campo do Perfil — isenta a SS tal como
  // "1º ano de atividade", tratado dentro de calcularCenarioSimulador.
  const resultadoA = calcularCenarioSimulador({
    valorBruto: valorNum,
    primeiroAno: primeiroAnoA,
    regiao: regiaoA,
    categoriaCoeficiente: parseFloat(categoriaA),
    taxaSSPerfil: perfil?.taxa_ss,
    acumulaOutroTrabalho: acumulaOutroTrabalhoA
  })
  const resultadoB = calcularCenarioSimulador({
    valorBruto: valorNum,
    primeiroAno: primeiroAnoB,
    regiao: regiaoB,
    categoriaCoeficiente: parseFloat(categoriaB),
    taxaSSPerfil: perfil?.taxa_ss,
    acumulaOutroTrabalho: acumulaOutroTrabalhoB
  })
  const diferencaCenarios = resultadoB.liquido - resultadoA.liquido

  // IVA por coluna — mesma fórmula/constante já usada no modo Bruto → Líquido
  // (valorBase * TAXA_IVA_REGIME_NORMAL), só que aqui cada coluna decide o
  // seu próprio regime, em vez de vir só do Perfil. O IVA nunca entra no
  // líquido — é só informativo, à parte ("Total com IVA").
  const ivaA = regimeIvaA === 'normal' ? valorNum * TAXA_IVA_REGIME_NORMAL : 0
  const totalComIvaA = valorNum + ivaA
  const ivaB = regimeIvaB === 'normal' ? valorNum * TAXA_IVA_REGIME_NORMAL : 0
  const totalComIvaB = valorNum + ivaB

  if (carregandoPerfil) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Simulador</PageTitle>

      <div className="flex gap-2.5 mb-5">
        <button
          onClick={() => selecionarModo('brutoLiquido')}
          className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'brutoLiquido'
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Bruto → Líquido
        </button>
        <button
          onClick={() => selecionarModo('liquidoBruto')}
          className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'liquidoBruto'
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Líquido → Bruto
        </button>
        <button
          onClick={() => selecionarModo('comparar')}
          className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'comparar'
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Comparar cenários
        </button>
      </div>

      {modoBloqueado ? (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-1">Funcionalidade RC PRO</h3>
          <p className="text-sm text-brand-muted mb-4">
            {modo === 'comparar'
              ? 'Comparar cenários lado a lado está disponível no plano Pro — testa, por exemplo, o impacto de mudar de região ou categoria de atividade no teu líquido.'
              : 'O simulador inverso (líquido → bruto) está disponível no plano Pro — calcula quanto tens de faturar para atingir o líquido que queres receber.'}
          </p>
          <Link href="/perfil#plano" className="text-brand-primary font-semibold text-sm">Ver RC PRO</Link>
        </Card>
      ) : (
      <>
      <Card className="mb-8 flex flex-col gap-4">
        <div>
          <Label htmlFor="valor-simulador">
            {modo === 'brutoLiquido' && 'Valor da proposta (€)'}
            {modo === 'liquidoBruto' && 'Valor líquido desejado (€)'}
            {modo === 'comparar' && 'Valor da proposta (bruto) (€)'}
          </Label>
          <Input
            id="valor-simulador"
            type="number"
            placeholder={modo === 'liquidoBruto' ? 'Valor líquido desejado (€)' : 'Valor da proposta (€)'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {modo === 'comparar' && (
            <p className="text-xs text-brand-muted mt-1.5">
              Partilhado pelos dois cenários — só as variáveis abaixo mudam entre a Coluna A e a Coluna B.
            </p>
          )}
        </div>

        {modo !== 'comparar' && (
          <>
            {modo === 'brutoLiquido' && taxaIva > 0 && (
              <div className="flex items-start gap-2.5 text-sm text-gray-900">
                <input
                  id="inclui-iva"
                  type="checkbox"
                  checked={incluiIva}
                  onChange={(e) => setIncluiIva(e.target.checked)}
                  className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
                />
                <label htmlFor="inclui-iva" className="cursor-pointer">
                  Este valor já inclui IVA?
                </label>
              </div>
            )}

            <div className="flex items-start gap-2.5 text-sm text-gray-900">
              <input
                id="primeiro-ano"
                type="checkbox"
                checked={primeiroAno}
                onChange={(e) => setPrimeiroAno(e.target.checked)}
                className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
              />
              <label htmlFor="primeiro-ano" className="cursor-pointer">
                <RotuloInfo
                  titulo="1º ano de atividade"
                  texto="No primeiro ano como trabalhador independente estás isento de pagar Segurança Social. Essa isenção acaba automaticamente a partir do 12º mês de atividade."
                >
                  1º ano de atividade
                </RotuloInfo>
              </label>
            </div>

            <div>
              <Label htmlFor="regiao-simulador">
                <RotuloInfo
                  titulo="Região"
                  texto="Os Açores e a Madeira têm taxas de retenção de IRS reduzidas por lei, em relação ao Continente. Vem preenchido a partir do Perfil, mas podes mudar só para esta simulação."
                >
                  Região
                </RotuloInfo>
              </Label>
              <Select id="regiao-simulador" value={regiao} onChange={(e) => setRegiao(e.target.value)}>
                <option value="continente">Continente</option>
                <option value="acores">Açores</option>
                <option value="madeira">Madeira</option>
              </Select>
            </div>

            <div className="flex items-start gap-2.5 text-sm text-gray-900">
              <input
                id="retencao-fonte-simulador"
                type="checkbox"
                checked={retencaoFonte}
                onChange={(e) => setRetencaoFonte(e.target.checked)}
                className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
              />
              <label htmlFor="retencao-fonte-simulador" className="cursor-pointer">
                <RotuloInfo
                  titulo="Retenção na fonte"
                  texto="Normalmente aplica-se quando o cliente é uma empresa — é ela que desconta o IRS antes de te pagar e entrega-o ao Estado. Se o cliente for um particular, muitas vezes não há retenção, e recebes o valor todo."
                >
                  Cliente retém na fonte
                </RotuloInfo>
              </label>
            </div>

            <p className="text-xs text-brand-muted">
              A categoria de atividade do Perfil já entra na Segurança Social (decide se o rendimento relevante é
              70% ou 20%) — mas não afeta a retenção nem o IRS anual (rendimento coletável), que dependem de outras
              regras. Usa o checkbox acima para indicar diretamente se há retenção.
            </p>

            {regiao !== 'continente' && (
              <p className="text-xs text-brand-muted">
                ⚠️ A redução da taxa de retenção para {regiao === 'acores' ? 'Açores' : 'Madeira'} é uma
                aproximação (não confirmada numa fonte oficial para retenção de Categoria B) — confirma o valor
                exato com o teu contabilista antes de faturar com base nele.
              </p>
            )}
          </>
        )}
      </Card>

      {modo === 'brutoLiquido' && (
        <>
          {taxaIva > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
                O que vais faturar
              </h3>
              <Card className="bg-brand-navy-tint">
                <div className="flex justify-between items-center py-1.5 border-b border-brand-line text-sm">
                  <span className="text-brand-muted">Valor sem IVA</span>
                  <span className="text-gray-900">{valorBase.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-brand-line text-sm">
                  <span className="text-brand-muted">IVA (23%)</span>
                  <span className="text-gray-900">{ivaAEntregar.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-brand-muted font-medium">Total da fatura</span>
                  <strong className="text-gray-900">{totalFatura.toFixed(2)} €</strong>
                </div>
              </Card>
              <p className="text-xs text-brand-muted mt-2">
                O IVA não é teu — cobra-se ao cliente e entrega-se ao Estado, à parte do que ficas a ganhar.
              </p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
              O que fica contigo
            </h3>

            <div className="flex gap-2.5 mb-4">
              <Card className="flex-1">
                <p className="text-xs text-brand-muted mb-1">
                  <RotuloInfo
                    titulo={rotuloIrs}
                    texto={
                      retencaoFonte
                        ? 'Já entregue pelo cliente ao Estado — não chega a ser depositado na tua conta.'
                        : 'Este valor chega à tua conta agora, mas continua a ser devido — vais ter de o pagar depois (na declaração de IRS ou em pagamentos por conta).'
                    }
                  >
                    {rotuloIrs}
                  </RotuloInfo>
                </p>
                <p className="text-lg font-semibold text-gray-900">{irs.toFixed(2)} €</p>
              </Card>

              <Card className="flex-1">
                <p className="text-xs text-brand-muted mb-1">
                  <RotuloInfo
                    titulo="Segurança Social"
                    texto={`É a tua contribuição mensal que te dá direito a subsídios e à reforma no futuro. Calcula-se sobre ${(percentagemRendimentoRelevante * 100).toFixed(0)}% da tua faturação (rendimento relevante — varia consoante o tipo de atividade), não sobre o valor todo.`}
                  >
                    Segurança Social
                  </RotuloInfo>
                </p>
                <p className="text-lg font-semibold text-gray-900">{ss.toFixed(2)} €</p>
              </Card>
            </div>

            <Card className="border-2 border-brand-primary">
              <p className="text-sm text-brand-muted mb-1">Valor líquido</p>
              <p className="text-5xl font-bold text-brand-primary">{liquido.toFixed(2)} €</p>
              <p className="text-xs text-brand-muted mt-3">{formulaLiquido}</p>

              <p className="text-xs text-brand-muted mt-4 pt-3 border-t border-brand-line">
                O líquido não muda consoante a retenção — muda é quem entrega o IRS ao Estado e quando: se o
                cliente retiver e pagar-te o valor reduzido, é ele que entrega; se te pagar o valor todo
                (acontece com frequência, sobretudo com clientes particulares), esse IRS fica para tratares tu
                depois, na declaração ou em pagamentos por conta.
              </p>
            </Card>
          </div>
        </>
      )}

      {modo === 'liquidoBruto' && (
        <>
          {taxaIva > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted mb-2">
                O que vais faturar
              </h3>
              <Card className="bg-brand-navy-tint">
                <div className="flex justify-between items-center py-1.5 border-b border-brand-line text-sm">
                  <span className="text-brand-muted">Valor sem IVA</span>
                  <span className="text-gray-900">{brutoNecessario.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-sm">
                  <span className="text-brand-muted">IVA (23%)</span>
                  <span className="text-gray-900">{ivaSobreBruto.toFixed(2)} €</span>
                </div>
              </Card>
              <p className="text-xs text-brand-muted mt-2">
                O IVA não é teu — cobra-se ao cliente e entrega-se ao Estado, à parte do que ficas a ganhar.
              </p>
            </div>
          )}

          <div className="flex gap-2.5 mb-4">
            <Card className="flex-1">
              <p className="text-xs text-brand-muted mb-1">
                <RotuloInfo
                  titulo={rotuloIrs}
                  texto={
                    retencaoFonte
                      ? 'Já entregue pelo cliente ao Estado — não chega a ser depositado na tua conta.'
                      : 'Este valor chega à tua conta agora, mas continua a ser devido — vais ter de o pagar depois (na declaração de IRS ou em pagamentos por conta).'
                  }
                >
                  {rotuloIrs}
                </RotuloInfo>
              </p>
              <p className="text-lg font-semibold text-gray-900">{irsSobreBruto.toFixed(2)} €</p>
            </Card>

            <Card className="flex-1">
              <p className="text-xs text-brand-muted mb-1">
                <RotuloInfo
                  titulo="Segurança Social"
                  texto={`É a tua contribuição mensal que te dá direito a subsídios e à reforma no futuro. Calcula-se sobre ${(percentagemRendimentoRelevante * 100).toFixed(0)}% da tua faturação (rendimento relevante — varia consoante o tipo de atividade), não sobre o valor todo.`}
                >
                  Segurança Social
                </RotuloInfo>
              </p>
              <p className="text-lg font-semibold text-gray-900">{ssSobreBruto.toFixed(2)} €</p>
            </Card>
          </div>

          <Card className="border-2 border-brand-primary">
            <p className="text-sm text-brand-muted mb-1">Valor a faturar</p>
            <p className="text-5xl font-bold text-brand-primary">{totalFaturaBruto.toFixed(2)} €</p>
            <p className="text-xs text-brand-muted mt-3">{formulaBruto}</p>
          </Card>
        </>
      )}

      {modo === 'comparar' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <ColunaCenario
              titulo="Cenário A"
              idPrefix="cenario-a"
              regiao={regiaoA}
              setRegiao={setRegiaoA}
              primeiroAno={primeiroAnoA}
              setPrimeiroAno={setPrimeiroAnoA}
              categoria={categoriaA}
              setCategoria={setCategoriaA}
              retencaoFonte={retencaoFonteA}
              setRetencaoFonte={setRetencaoFonteA}
              regimeIva={regimeIvaA}
              setRegimeIva={setRegimeIvaA}
              acumulaOutroTrabalho={acumulaOutroTrabalhoA}
              setAcumulaOutroTrabalho={setAcumulaOutroTrabalhoA}
              resultado={resultadoA}
              iva={ivaA}
              totalComIva={totalComIvaA}
            />
            <ColunaCenario
              titulo="Cenário B"
              idPrefix="cenario-b"
              regiao={regiaoB}
              setRegiao={setRegiaoB}
              primeiroAno={primeiroAnoB}
              setPrimeiroAno={setPrimeiroAnoB}
              categoria={categoriaB}
              setCategoria={setCategoriaB}
              retencaoFonte={retencaoFonteB}
              setRetencaoFonte={setRetencaoFonteB}
              regimeIva={regimeIvaB}
              setRegimeIva={setRegimeIvaB}
              acumulaOutroTrabalho={acumulaOutroTrabalhoB}
              setAcumulaOutroTrabalho={setAcumulaOutroTrabalhoB}
              resultado={resultadoB}
              iva={ivaB}
              totalComIva={totalComIvaB}
            />
          </div>

          <Card
            className={
              diferencaCenarios >= 0
                ? 'border-2 border-green-700 bg-green-50'
                : 'border-2 border-red-700 bg-red-50'
            }
          >
            <p className="text-sm text-brand-muted mb-1">
              Diferença (líquido B − líquido A)
            </p>
            <p
              className={`text-3xl font-bold ${diferencaCenarios >= 0 ? 'text-green-700' : 'text-red-700'}`}
            >
              {diferencaCenarios >= 0 ? '+' : ''}
              {diferencaCenarios.toFixed(2)} €
            </p>
            <p className="text-xs text-brand-muted mt-2">
              {diferencaCenarios >= 0
                ? 'O Cenário B deixa-te com mais dinheiro líquido do que o Cenário A.'
                : 'O Cenário B deixa-te com menos dinheiro líquido do que o Cenário A.'}
            </p>
          </Card>
        </>
      )}
      </>
      )}
    </div>
  )
}

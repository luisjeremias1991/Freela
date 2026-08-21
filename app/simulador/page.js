'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import RotuloInfo from '../components/ui/RotuloInfo'
import { percentagemRendimentoRelevanteSS, taxaRetencaoRegional } from '../../lib/calculosFinanceiros'

export default function Simulador() {
  const { perfil, carregandoPerfil } = usePerfil()
  const [modo, setModo] = useState('brutoLiquido') // 'brutoLiquido' | 'liquidoBruto'

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

  // Mesmas taxas usadas nos dois modos, para o cálculo inverso dar sempre o valor esperado.
  // taxaIrsContinente é a taxa "base" antes da redução regional; taxaIrs é a
  // que entra de facto nos cálculos, já ajustada à região escolhida (Açores
  // -20%, Madeira -30% — ver aviso em lib/calculosFinanceiros.js).
  const taxaIrsContinente = primeiroAno ? 0.25 : 0.115
  const taxaIrs = taxaRetencaoRegional(taxaIrsContinente, regiao)
  // Percentagem do rendimento relevante para SS — 70% prestação de serviços,
  // 20% venda de mercadorias — decidida pela mesma função partilhada usada em
  // Painel/Orçamento (lib/calculosFinanceiros.js), a partir da categoria de
  // atividade do Perfil. A taxa de SS em si (21,4%) continua fixa aqui — não
  // lê perfil.taxa_ss, por decisão explícita de deixar essa parte para outra
  // tarefa.
  const percentagemRendimentoRelevante = percentagemRendimentoRelevanteSS(perfil)
  const taxaSS = primeiroAno ? 0 : percentagemRendimentoRelevante * 0.214

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

  const modoBloqueado = modo === 'liquidoBruto' && !perfil?.is_pro

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
  const irs = valorBase * taxaIrs
  const ss = valorBase * taxaSS
  const liquido = valorBase - irs - ss

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

  if (carregandoPerfil) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Simulador</PageTitle>

      <div className="flex gap-2.5 mb-5">
        <button
          onClick={() => selecionarModo('brutoLiquido')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'brutoLiquido'
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Bruto → Líquido
        </button>
        <button
          onClick={() => selecionarModo('liquidoBruto')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'liquidoBruto'
              ? 'bg-brand-primary text-white border-2 border-brand-primary'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Líquido → Bruto
        </button>
      </div>

      {modoBloqueado ? (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-1">Funcionalidade RC PRO</h3>
          <p className="text-sm text-brand-muted mb-4">
            O simulador inverso (líquido → bruto) está disponível no plano Pro — calcula quanto tens de faturar
            para atingir o líquido que queres receber.
          </p>
          <Link href="/perfil#plano" className="text-brand-primary font-semibold text-sm">Ver RC PRO</Link>
        </Card>
      ) : (
      <>
      <Card className="mb-8 flex flex-col gap-4">
        <div>
          <Label htmlFor="valor-simulador">
            {modo === 'brutoLiquido' ? 'Valor da proposta (€)' : 'Valor líquido desejado (€)'}
          </Label>
          <Input
            id="valor-simulador"
            type="number"
            placeholder={modo === 'brutoLiquido' ? 'Valor da proposta (€)' : 'Valor líquido desejado (€)'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>

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
      </Card>

      {modo === 'brutoLiquido' ? (
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
      ) : (
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
      </>
      )}
    </div>
  )
}

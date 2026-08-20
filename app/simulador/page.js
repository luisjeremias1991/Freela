'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import InfoIcon from '../components/ui/InfoIcon'

export default function Simulador() {
  const { perfil } = usePerfil()
  const [modo, setModo] = useState('brutoLiquido') // 'brutoLiquido' | 'liquidoBruto'
  const [mostrarUpsell, setMostrarUpsell] = useState(false)

  const [valor, setValor] = useState('')
  const [primeiroAno, setPrimeiroAno] = useState(true)
  const [retencaoFonte, setRetencaoFonte] = useState(true)
  // Só relevante no modo Bruto → Líquido, com regime de IVA normal — no modo
  // inverso o valor introduzido é sempre o que a pessoa quer receber, que por
  // definição nunca inclui IVA (o IVA nunca é teu). Default false para não
  // mudar nada em quem já usava o Simulador sem reparar nesta opção.
  const [incluiIva, setIncluiIva] = useState(false)

  // Mesmas taxas usadas nos dois modos, para o cálculo inverso dar sempre o valor esperado.
  const taxaIrs = primeiroAno ? 0.25 : 0.115
  const taxaRetencao = retencaoFonte ? taxaIrs : 0
  const taxaSS = primeiroAno ? 0 : 0.70 * 0.214

  // "Valor da proposta" / "Valor bruto necessário" são sempre valores SEM
  // IVA (a tarifa/honorário) — o IVA soma-se por cima na fatura, nunca entra
  // na base de IRS/SS/líquido. Por isso o IVA é só uma linha informativa à
  // parte, e lê perfil.regime_iva em vez de assumir isento por omissão.
  const taxaIva = perfil?.regime_iva === 'normal' ? 0.23 : 0

  function selecionarModo(novoModo) {
    if (novoModo === 'liquidoBruto' && !perfil?.is_pro) {
      setMostrarUpsell(true)
      return
    }
    setMostrarUpsell(false)
    setModo(novoModo)
  }

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
  const ss = primeiroAno ? 0 : valorBase * 0.70 * 0.214
  const liquido = valorBase - irs - ss

  // Modo Líquido → Bruto: bruto = liquido / (1 - taxaRetencao - taxaSS)
  const divisor = 1 - taxaRetencao - taxaSS
  const brutoNecessario = divisor > 0 ? valorNum / divisor : 0
  const ivaSobreBruto = brutoNecessario * taxaIva
  const irsSobreBruto = brutoNecessario * taxaRetencao
  const ssSobreBruto = brutoNecessario * taxaSS

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Simulador</PageTitle>

      <div className="flex gap-2.5 mb-5">
        <button
          onClick={() => selecionarModo('brutoLiquido')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'brutoLiquido'
              ? 'bg-brand-navy text-white border-2 border-brand-navy'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Bruto → Líquido
        </button>
        <button
          onClick={() => selecionarModo('liquidoBruto')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
            modo === 'liquidoBruto'
              ? 'bg-brand-navy text-white border-2 border-brand-navy'
              : 'bg-white text-gray-900 border border-brand-line'
          }`}
        >
          Líquido → Bruto
        </button>
      </div>

      {mostrarUpsell && (
        <Card className="mb-5">
          <p className="text-sm text-gray-900">
            O simulador inverso (líquido → bruto) é uma funcionalidade Freela Pro.{' '}
            <Link href="/perfil" className="text-brand-navy font-semibold">Subscreve aqui</Link> para o desbloqueares.
          </p>
        </Card>
      )}

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
              className="accent-brand-navy w-4 h-4 mt-0.5 shrink-0"
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
            className="accent-brand-navy w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="primeiro-ano" className="cursor-pointer">
            1º ano de atividade
            <InfoIcon
              titulo="1º ano de atividade"
              texto="No primeiro ano como trabalhador independente estás isento de pagar Segurança Social. Essa isenção acaba automaticamente a partir do 12º mês de atividade."
            />
          </label>
        </div>

        <div className="flex items-start gap-2.5 text-sm text-gray-900">
          <input
            id="retencao-fonte-simulador"
            type="checkbox"
            checked={retencaoFonte}
            onChange={(e) => setRetencaoFonte(e.target.checked)}
            className="accent-brand-navy w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="retencao-fonte-simulador" className="cursor-pointer">
            Cliente retém na fonte
            <InfoIcon
              titulo="Retenção na fonte"
              texto="Normalmente aplica-se quando o cliente é uma empresa — é ela que desconta o IRS antes de te pagar e entrega-o ao Estado. Se o cliente for um particular, muitas vezes não há retenção, e recebes o valor todo."
            />
          </label>
        </div>
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
                  {retencaoFonte ? 'Retenção de IRS' : 'IRS a pagar (ainda não retido)'}
                  <InfoIcon
                    titulo={retencaoFonte ? 'Retenção de IRS' : 'IRS a pagar (ainda não retido)'}
                    texto={
                      retencaoFonte
                        ? 'Já entregue pelo cliente ao Estado — não chega a ser depositado na tua conta.'
                        : 'Este valor chega à tua conta agora, mas continua a ser devido — vais ter de o pagar depois (na declaração de IRS ou em pagamentos por conta).'
                    }
                  />
                </p>
                <p className="text-lg font-semibold text-gray-900">{irs.toFixed(2)} €</p>
              </Card>

              <Card className="flex-1">
                <p className="text-xs text-brand-muted mb-1">
                  Segurança Social
                  <InfoIcon
                    titulo="Segurança Social"
                    texto="É a tua contribuição mensal que te dá direito a subsídios e à reforma no futuro. Calcula-se sobre 70% da tua faturação, não sobre o valor todo."
                  />
                </p>
                <p className="text-lg font-semibold text-gray-900">{ss.toFixed(2)} €</p>
              </Card>
            </div>

            <Card className="border-2 border-brand-navy">
              <p className="text-sm text-brand-muted mb-1">Valor líquido</p>
              <p className="text-5xl font-bold text-brand-navy">{liquido.toFixed(2)} €</p>
              <p className="text-xs text-brand-muted mt-3">
                {valorBase.toFixed(2)} € − {irs.toFixed(2)} € − {ss.toFixed(2)} €
              </p>

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
          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1">Valor bruto necessário</p>
            <p className="text-2xl font-bold text-gray-900">{brutoNecessario.toFixed(2)} €</p>
          </Card>

          {taxaIva > 0 && (
            <Card className="mb-4">
              <p className="text-sm text-brand-muted mb-1">IVA a entregar</p>
              <p className="text-2xl font-bold text-gray-900">{ivaSobreBruto.toFixed(2)} €</p>
              <p className="text-xs text-brand-muted mt-2">
                Este valor não é teu — cobra-se ao cliente e entrega-se ao Estado, à parte do que ficas a ganhar.
              </p>
            </Card>
          )}

          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1">
              Retenção de IRS
              <InfoIcon
                titulo="Retenção de IRS"
                texto="É o valor que o cliente desconta logo no recibo e entrega diretamente ao Estado, por tua conta. No fim do ano, conta como um adiantamento do teu IRS."
              />
            </p>
            <p className="text-2xl font-bold text-gray-900">{irsSobreBruto.toFixed(2)} €</p>
          </Card>

          <Card>
            <p className="text-sm text-brand-muted mb-1">
              Segurança Social
              <InfoIcon
                titulo="Segurança Social"
                texto="É a tua contribuição mensal que te dá direito a subsídios e à reforma no futuro. Calcula-se sobre 70% da tua faturação, não sobre o valor todo."
              />
            </p>
            <p className="text-2xl font-bold text-gray-900">{ssSobreBruto.toFixed(2)} €</p>
          </Card>
        </>
      )}
    </div>
  )
}

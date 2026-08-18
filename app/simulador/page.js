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

  // Mesmas taxas usadas nos dois modos, para o cálculo inverso dar sempre o valor esperado.
  const taxaIrs = primeiroAno ? 0.25 : 0.115
  const taxaRetencao = retencaoFonte ? taxaIrs : 0
  const taxaSS = primeiroAno ? 0 : 0.70 * 0.214

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
  const irs = retencaoFonte ? valorNum * taxaIrs : 0
  const ss = primeiroAno ? 0 : valorNum * 0.70 * 0.214
  const liquido = valorNum - irs - ss

  // Modo Líquido → Bruto: bruto = liquido / (1 - taxaRetencao - taxaSS)
  const divisor = 1 - taxaRetencao - taxaSS
  const brutoNecessario = divisor > 0 ? valorNum / divisor : 0
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

        <div className="flex items-center gap-1.5 text-sm text-gray-900">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={primeiroAno}
              onChange={(e) => setPrimeiroAno(e.target.checked)}
              className="accent-brand-navy w-4 h-4"
            />
            1º ano de atividade
          </label>
          <InfoIcon
            titulo="1º ano de atividade"
            texto="No primeiro ano como trabalhador independente estás isento de pagar Segurança Social. Essa isenção acaba automaticamente a partir do 12º mês de atividade."
          />
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-900">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={retencaoFonte}
              onChange={(e) => setRetencaoFonte(e.target.checked)}
              className="accent-brand-navy w-4 h-4"
            />
            Cliente retém na fonte
          </label>
          <InfoIcon
            titulo="Retenção na fonte"
            texto="Normalmente aplica-se quando o cliente é uma empresa — é ela que desconta o IRS antes de te pagar e entrega-o ao Estado. Se o cliente for um particular, muitas vezes não há retenção, e recebes o valor todo."
          />
        </div>
      </Card>

      {modo === 'brutoLiquido' ? (
        <>
          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1 flex items-center gap-1.5">
              Retenção de IRS
              <InfoIcon
                titulo="Retenção de IRS"
                texto="É o valor que o cliente desconta logo no recibo e entrega diretamente ao Estado, por tua conta. No fim do ano, conta como um adiantamento do teu IRS."
              />
            </p>
            <p className="text-2xl font-bold text-gray-900">{irs.toFixed(2)} €</p>
          </Card>

          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1 flex items-center gap-1.5">
              Segurança Social
              <InfoIcon
                titulo="Segurança Social"
                texto="É a tua contribuição mensal que te dá direito a subsídios e à reforma no futuro. Calcula-se sobre 70% da tua faturação, não sobre o valor todo."
              />
            </p>
            <p className="text-2xl font-bold text-gray-900">{ss.toFixed(2)} €</p>
          </Card>

          <Card>
            <p className="text-sm text-brand-muted mb-1">Valor líquido</p>
            <p className="text-2xl font-bold text-gray-900">{liquido.toFixed(2)} €</p>
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1">Valor bruto necessário</p>
            <p className="text-2xl font-bold text-gray-900">{brutoNecessario.toFixed(2)} €</p>
          </Card>

          <Card className="mb-4">
            <p className="text-sm text-brand-muted mb-1 flex items-center gap-1.5">
              Retenção de IRS
              <InfoIcon
                titulo="Retenção de IRS"
                texto="É o valor que o cliente desconta logo no recibo e entrega diretamente ao Estado, por tua conta. No fim do ano, conta como um adiantamento do teu IRS."
              />
            </p>
            <p className="text-2xl font-bold text-gray-900">{irsSobreBruto.toFixed(2)} €</p>
          </Card>

          <Card>
            <p className="text-sm text-brand-muted mb-1 flex items-center gap-1.5">
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

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePerfil } from '../context/PerfilContext'

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
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Simulador</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => selecionarModo('brutoLiquido')}
          style={{
            flex: 1,
            padding: 10,
            border: modo === 'brutoLiquido' ? '2px solid #10284D' : '1px solid #444',
            background: modo === 'brutoLiquido' ? '#10284D' : 'transparent',
            color: modo === 'brutoLiquido' ? '#fff' : 'inherit',
            cursor: 'pointer'
          }}
        >
          Bruto → Líquido
        </button>
        <button
          onClick={() => selecionarModo('liquidoBruto')}
          style={{
            flex: 1,
            padding: 10,
            border: modo === 'liquidoBruto' ? '2px solid #10284D' : '1px solid #444',
            background: modo === 'liquidoBruto' ? '#10284D' : 'transparent',
            color: modo === 'liquidoBruto' ? '#fff' : 'inherit',
            cursor: 'pointer'
          }}
        >
          Líquido → Bruto
        </button>
      </div>

      {mostrarUpsell && (
        <p style={{ padding: 15, border: '1px solid #444', marginBottom: 20 }}>
          O simulador inverso (líquido → bruto) é uma funcionalidade Freela Pro.{' '}
          <Link href="/perfil" style={{ color: '#10284D', fontWeight: 'bold' }}>Subscreve aqui</Link> para o desbloqueares.
        </p>
      )}

      <div style={{ marginBottom: 30, padding: 15, border: '1px solid #444' }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          {modo === 'brutoLiquido' ? 'Valor da proposta (€)' : 'Valor líquido desejado (€)'}
        </label>
        <input
          type="number"
          placeholder={modo === 'brutoLiquido' ? 'Valor da proposta (€)' : 'Valor líquido desejado (€)'}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />

        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={primeiroAno}
            onChange={(e) => setPrimeiroAno(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          1º ano de atividade
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={retencaoFonte}
            onChange={(e) => setRetencaoFonte(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Cliente retém na fonte
        </label>
      </div>

      {modo === 'brutoLiquido' ? (
        <>
          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <p>Retenção de IRS</p>
            <h2>{irs.toFixed(2)} €</h2>
          </div>

          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <p>Segurança Social</p>
            <h2>{ss.toFixed(2)} €</h2>
          </div>

          <div style={{ padding: 15, border: '1px solid #444' }}>
            <p>Valor líquido</p>
            <h2>{liquido.toFixed(2)} €</h2>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <p>Valor bruto necessário</p>
            <h2>{brutoNecessario.toFixed(2)} €</h2>
          </div>

          <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
            <p>Retenção de IRS</p>
            <h2>{irsSobreBruto.toFixed(2)} €</h2>
          </div>

          <div style={{ padding: 15, border: '1px solid #444' }}>
            <p>Segurança Social</p>
            <h2>{ssSobreBruto.toFixed(2)} €</h2>
          </div>
        </>
      )}
    </div>
  )
}

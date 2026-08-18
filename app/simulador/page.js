'use client'

import { useState } from 'react'

export default function Simulador() {
  const [valor, setValor] = useState('')
  const [primeiroAno, setPrimeiroAno] = useState(true)
  const [retencaoFonte, setRetencaoFonte] = useState(true)

  const valorNum = parseFloat(valor) || 0
  const taxaIrs = primeiroAno ? 0.25 : 0.115
  const irs = retencaoFonte ? valorNum * taxaIrs : 0
  const ss = primeiroAno ? 0 : valorNum * 0.70 * 0.214
  const liquido = valorNum - irs - ss

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Simulador</h1>

      <div style={{ marginBottom: 30, padding: 15, border: '1px solid #444' }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Valor da proposta (€)</label>
        <input
          type="number"
          placeholder="Valor da proposta (€)"
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
    </div>
  )
}

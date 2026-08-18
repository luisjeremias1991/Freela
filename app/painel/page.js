'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Painel() {
  const [recibos, setRecibos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('recibos')
        .select('*')
        .eq('user_id', user.id)

      setRecibos(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  const total = recibos.reduce((soma, r) => soma + r.valor, 0)
  // cálculo simplificado — 11,5% de IRS (só se retencao=true) + 21,4% de SS sobre 70% do valor
  const liquido = recibos.reduce((soma, r) => {
    const irs = r.retencao ? r.valor * 0.115 : 0
    const ss = r.valor * 0.70 * 0.214
    return soma + (r.valor - irs - ss)
  }, 0)

  if (carregando) return <p style={{ padding: 20 }}>A carregar...</p>

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Painel</h1>
      <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
        <p>Total faturado</p>
        <h2>{total.toFixed(2)} €</h2>
      </div>
      <div style={{ padding: 15, border: '1px solid #444' }}>
        <p>Estimativa líquida</p>
        <h2>{liquido.toFixed(2)} €</h2>
      </div>
    </div>
  )
}
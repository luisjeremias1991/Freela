'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Recibos() {
  const [recibos, setRecibos] = useState([])
  const [cliente, setCliente] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function carregarRecibos() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: lista, error } = await supabase
      .from('recibos')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })

    if (error) {
      setMensagem('Erro ao carregar: ' + error.message)
    } else {
      setRecibos(lista)
    }
  }

  useEffect(() => {
    carregarRecibos()
  }, [])

  async function adicionarRecibo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!cliente || !valor || !data) {
      setMensagem('Preenche cliente, valor e data.')
      return
    }

    const { error } = await supabase.from('recibos').insert({
      user_id: user.id,
      cliente: cliente,
      valor: parseFloat(valor),
      data: data,
      retencao: false,
      pago: true
    })

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
    } else {
      setMensagem('Recibo guardado!')
      setCliente('')
      setValor('')
      setData('')
      carregarRecibos()
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Recibos</h1>

      <div style={{ marginBottom: 30, padding: 15, border: '1px solid #444' }}>
        <h3>Adicionar recibo</h3>
        <input
          type="text"
          placeholder="Cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <input
          type="number"
          placeholder="Valor (€)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <button onClick={adicionarRecibo} style={{ padding: 10 }}>Guardar recibo</button>
      </div>

      <p>{mensagem}</p>

      <h3>Os teus recibos</h3>
      {recibos.length === 0 && <p>Ainda não tens recibos.</p>}
      {recibos.map((r) => (
        <div key={r.id} style={{ padding: 10, borderBottom: '1px solid #333' }}>
          <strong>{r.cliente}</strong> — {r.valor}€ — {r.data}
        </div>
      ))}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'

function estaNoPeriodo(dataStr, periodo) {
  if (periodo === 'todos') return true

  const hoje = new Date()
  const data = new Date(dataStr + 'T00:00:00')

  if (data.getFullYear() !== hoje.getFullYear()) return false

  if (periodo === 'ano') return true

  if (periodo === 'trimestre') {
    const trimestreAtual = Math.floor(hoje.getMonth() / 3)
    const trimestreData = Math.floor(data.getMonth() / 3)
    return trimestreData === trimestreAtual
  }

  return true
}

function escaparCSV(valor) {
  const texto = String(valor ?? '')
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return '"' + texto.replace(/"/g, '""') + '"'
  }
  return texto
}

export default function Recibos() {
  const { perfil } = usePerfil()
  const [recibos, setRecibos] = useState([])
  const [cliente, setCliente] = useState('')
  const [nif, setNif] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [retencao, setRetencao] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [templates, setTemplates] = useState([])
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState('')

  const [pesquisa, setPesquisa] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'pago' | 'pendente'
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos') // 'todos' | 'trimestre' | 'ano'

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

  async function carregarTemplates() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: lista } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('cliente', { ascending: true })

    setTemplates(lista || [])
  }

  useEffect(() => {
    carregarRecibos()
    carregarTemplates()
  }, [])

  function aplicarTemplate(id) {
    setTemplateSelecionadoId(id)
    if (!id) return

    const template = templates.find((t) => String(t.id) === String(id))
    if (!template) return

    setCliente(template.cliente || '')
    setValor(template.valor != null ? String(template.valor) : '')
    setRetencao(!!template.retencao)
  }

  async function adicionarRecibo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!cliente || !valor || !data) {
      setMensagem('Preenche cliente, valor e data.')
      return
    }

    const { error } = await supabase.from('recibos').insert({
      user_id: user.id,
      cliente: cliente,
      nif: nif || null,
      valor: parseFloat(valor),
      data: data,
      retencao: retencao,
      pago: true
    })

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
    } else {
      setMensagem('Recibo guardado!')
      setCliente('')
      setNif('')
      setValor('')
      setData('')
      setRetencao(false)
      setTemplateSelecionadoId('')
      carregarRecibos()
    }
  }

  async function guardarComoTemplate() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!cliente || !valor) {
      setMensagem('Preenche cliente e valor para guardar como template.')
      return
    }

    if (templateSelecionadoId) {
      // já há um template selecionado — atualiza-o em vez de criar um novo
      const { error } = await supabase
        .from('templates')
        .update({ cliente: cliente, valor: parseFloat(valor), retencao: retencao })
        .eq('id', templateSelecionadoId)

      if (error) {
        setMensagem('Erro ao atualizar template: ' + error.message)
      } else {
        setMensagem('Template atualizado!')
        carregarTemplates()
      }
      return
    }

    const { error } = await supabase.from('templates').insert({
      user_id: user.id,
      cliente: cliente,
      valor: parseFloat(valor),
      retencao: retencao
    })

    if (error) {
      setMensagem('Erro ao guardar template: ' + error.message)
    } else {
      setMensagem('Template guardado!')
      carregarTemplates()
    }
  }

  async function eliminarTemplate(id) {
    const { error } = await supabase.from('templates').delete().eq('id', id)

    if (error) {
      setMensagem('Erro ao eliminar template: ' + error.message)
    } else {
      setMensagem('Template eliminado.')
      if (templateSelecionadoId === id) {
        setTemplateSelecionadoId('')
      }
      carregarTemplates()
    }
  }

  function exportarCSV() {
    const cabecalho = ['Cliente', 'NIF', 'Data', 'Valor', 'Retenção', 'Estado']
    const linhas = recibos.map((r) => [
      r.cliente,
      r.nif || '',
      r.data,
      r.valor,
      r.retencao ? 'Sim' : 'Não',
      r.pago ? 'Pago' : 'Pendente'
    ])

    const conteudoCSV = [cabecalho, ...linhas]
      .map((linha) => linha.map(escaparCSV).join(';'))
      .join('\r\n')

    // BOM (﻿) no início para o Excel em português reconhecer bem os acentos
    const blob = new Blob(['﻿' + conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'recibos.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const recibosFiltrados = perfil?.is_pro
    ? recibos.filter((r) => {
        const texto = pesquisa.trim().toLowerCase()
        const correspondePesquisa =
          !texto ||
          (r.cliente || '').toLowerCase().includes(texto) ||
          (r.nif || '').toLowerCase().includes(texto)

        const correspondeEstado =
          filtroEstado === 'todos' ||
          (filtroEstado === 'pago' && r.pago) ||
          (filtroEstado === 'pendente' && !r.pago)

        const correspondePeriodo = estaNoPeriodo(r.data, filtroPeriodo)

        return correspondePesquisa && correspondeEstado && correspondePeriodo
      })
    : recibos

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Recibos</h1>

      <div style={{ marginBottom: 30, padding: 15, border: '1px solid #444' }}>
        <h3>Adicionar recibo</h3>

        {templates.length > 0 && (
          <>
            <label style={{ display: 'block', marginBottom: 4 }}>Usar template</label>
            <select
              value={templateSelecionadoId}
              onChange={(e) => aplicarTemplate(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
            >
              <option value="">— Selecionar template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.cliente} — {t.valor}€{t.retencao ? ' (com retenção)' : ''}
                </option>
              ))}
            </select>

            <div style={{ marginBottom: 10 }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #333'
                  }}
                >
                  <span style={{ fontSize: 13, color: '#888' }}>
                    {t.cliente} — {t.valor}€{t.retencao ? ' (com retenção)' : ''}
                  </span>
                  <button onClick={() => eliminarTemplate(t.id)} style={{ padding: '4px 8px', fontSize: 12 }}>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <input
          type="text"
          placeholder="Cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />
        <input
          type="text"
          placeholder="NIF"
          value={nif}
          onChange={(e) => setNif(e.target.value)}
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

        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={retencao}
            onChange={(e) => setRetencao(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Retenção na fonte
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={adicionarRecibo} style={{ padding: 10, flex: 1 }}>Guardar recibo</button>
          <button onClick={guardarComoTemplate} style={{ padding: 10, flex: 1 }}>
            {templateSelecionadoId ? 'Atualizar template' : 'Guardar como template'}
          </button>
        </div>
      </div>

      <p>{mensagem}</p>

      {perfil?.is_pro ? (
        <div style={{ marginBottom: 20, padding: 15, border: '1px solid #444' }}>
          <h3>Filtros</h3>
          <input
            type="text"
            placeholder="Pesquisar por cliente ou NIF"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
          >
            <option value="todos">Todos os estados</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </select>
          <select
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 10 }}
          >
            <option value="todos">Todo o período</option>
            <option value="trimestre">Este trimestre</option>
            <option value="ano">Este ano</option>
          </select>
        </div>
      ) : (
        <Link
          href="/perfil"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: 10,
            marginBottom: 20,
            border: '1px solid #444',
            color: '#888',
            textDecoration: 'none'
          }}
        >
          🔒 Filtros de pesquisa (Freela Pro)
        </Link>
      )}

      {perfil?.is_pro ? (
        <button onClick={exportarCSV} style={{ padding: 10, marginBottom: 20 }}>Exportar CSV</button>
      ) : (
        <Link
          href="/perfil"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: 10,
            marginBottom: 20,
            border: '1px solid #444',
            color: '#888',
            textDecoration: 'none'
          }}
        >
          🔒 Exportar CSV (Freela Pro)
        </Link>
      )}

      <h3>Os teus recibos</h3>
      {recibosFiltrados.length === 0 && <p>Ainda não tens recibos.</p>}
      {recibosFiltrados.map((r) => (
        <div key={r.id} style={{ padding: 10, borderBottom: '1px solid #333' }}>
          <strong>{r.cliente}</strong> — {r.valor}€ — {r.data}
        </div>
      ))}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'

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
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Recibos</PageTitle>

      <Card className="mb-6 flex flex-col gap-4">
        <h3 className="font-semibold text-gray-900 -mb-1">Adicionar recibo</h3>

        {templates.length > 0 && (
          <>
            <div>
              <Label htmlFor="usar-template">Usar template</Label>
              <Select id="usar-template" value={templateSelecionadoId} onChange={(e) => aplicarTemplate(e.target.value)}>
                <option value="">— Selecionar template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.cliente} — {t.valor}€{t.retencao ? ' (com retenção)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col">
              {templates.map((t) => (
                <div key={t.id} className="flex justify-between items-center py-1.5 border-b border-brand-line last:border-0">
                  <span className="text-xs text-brand-muted">
                    {t.cliente} — {t.valor}€{t.retencao ? ' (com retenção)' : ''}
                  </span>
                  <button
                    onClick={() => eliminarTemplate(t.id)}
                    className="text-xs px-2 py-1 rounded-md border border-brand-line text-brand-muted hover:border-brand-navy hover:text-brand-navy transition cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <Input type="text" placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <Input type="text" placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} />
        <Input type="number" placeholder="Valor (€)" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />

        <label className="flex items-center gap-2.5 text-sm text-gray-900">
          <input
            type="checkbox"
            checked={retencao}
            onChange={(e) => setRetencao(e.target.checked)}
            className="accent-brand-navy w-4 h-4"
          />
          Retenção na fonte
        </label>

        <div className="flex gap-2.5">
          <Button className="flex-1" onClick={adicionarRecibo}>Guardar recibo</Button>
          <Button variant="secondary" className="flex-1" onClick={guardarComoTemplate}>
            {templateSelecionadoId ? 'Atualizar template' : 'Guardar como template'}
          </Button>
        </div>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mb-6 -mt-3">{mensagem}</p>}

      {perfil?.is_pro ? (
        <Card className="mb-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900">Filtros</h3>
          <Input
            type="text"
            placeholder="Pesquisar por cliente ou NIF"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos os estados</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </Select>
          <Select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
            <option value="todos">Todo o período</option>
            <option value="trimestre">Este trimestre</option>
            <option value="ano">Este ano</option>
          </Select>
        </Card>
      ) : (
        <Link
          href="/perfil"
          className="block text-center py-2.5 mb-5 rounded-lg border border-brand-line text-brand-muted hover:border-brand-navy hover:text-brand-navy transition no-underline"
        >
          🔒 Filtros de pesquisa (Freela Pro)
        </Link>
      )}

      {perfil?.is_pro ? (
        <Button variant="secondary" className="mb-5 w-full" onClick={exportarCSV}>Exportar CSV</Button>
      ) : (
        <Link
          href="/perfil"
          className="block text-center py-2.5 mb-5 rounded-lg border border-brand-line text-brand-muted hover:border-brand-navy hover:text-brand-navy transition no-underline"
        >
          🔒 Exportar CSV (Freela Pro)
        </Link>
      )}

      <h3 className="font-semibold text-gray-900 mb-2">Os teus recibos</h3>
      {recibosFiltrados.length === 0 && <p className="text-sm text-brand-muted">Ainda não tens recibos.</p>}
      {recibosFiltrados.map((r) => (
        <div key={r.id} className="flex justify-between py-2.5 border-b border-brand-line text-sm">
          <strong className="text-gray-900 font-medium">{r.cliente}</strong>
          <span className="text-gray-900">{r.valor}€ — {r.data}</span>
        </div>
      ))}
    </div>
  )
}

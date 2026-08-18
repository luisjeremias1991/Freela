'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import InfoIcon from '../components/ui/InfoIcon'

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

function formatarDataPT(dataStr) {
  if (!dataStr) return ''
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-PT')
}

function hojeYMD() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
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
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataPagamento, setDataPagamento] = useState('')
  const [retencao, setRetencao] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [mensagem, setMensagem] = useState('')

  const [pesquisa, setPesquisa] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos' | 'pago' | 'pendente'
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos') // 'todos' | 'trimestre' | 'ano'

  const formularioRef = useRef(null)

  async function carregarRecibos() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: lista, error } = await supabase
      .from('recibos')
      .select('*')
      .eq('user_id', user.id)
      .order('data_emissao', { ascending: false })

    if (error) {
      setMensagem('Erro ao carregar: ' + error.message)
    } else {
      setRecibos(lista)
    }
  }

  useEffect(() => {
    carregarRecibos()
  }, [])

  function limparFormulario() {
    setCliente('')
    setNif('')
    setValor('')
    setDataEmissao('')
    setDataPagamento('')
    setRetencao(false)
    setEditandoId(null)
  }

  function editarRecibo(recibo) {
    setEditandoId(recibo.id)
    setCliente(recibo.cliente || '')
    setNif(recibo.nif || '')
    setValor(recibo.valor != null ? String(recibo.valor) : '')
    setDataEmissao(recibo.data_emissao || '')
    setDataPagamento(recibo.data_pagamento || '')
    setRetencao(!!recibo.retencao)
    setMensagem('')

    // O formulário fica no topo da página — sem isto, preencher os campos
    // não se nota nada se já estiveres a meio de uma lista comprida.
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function guardarRecibo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!cliente || !valor || !dataEmissao) {
      setMensagem('Preenche cliente, valor e data de emissão.')
      return
    }

    const dadosRecibo = {
      cliente: cliente,
      nif: nif || null,
      valor: parseFloat(valor),
      data_emissao: dataEmissao,
      data_pagamento: dataPagamento || null,
      retencao: retencao
    }

    const { error } = editandoId
      ? await supabase.from('recibos').update(dadosRecibo).eq('id', editandoId)
      : await supabase.from('recibos').insert({ user_id: user.id, ...dadosRecibo })

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
      return
    }

    setMensagem(editandoId ? 'Recibo atualizado!' : 'Recibo guardado!')
    limparFormulario()
    carregarRecibos()
  }

  async function marcarComoPago(recibo) {
    const { error } = await supabase
      .from('recibos')
      .update({ data_pagamento: hojeYMD() })
      .eq('id', recibo.id)

    if (error) {
      setMensagem('Erro ao marcar como pago: ' + error.message)
    } else {
      carregarRecibos()
    }
  }

  function exportarCSV() {
    const cabecalho = ['Cliente', 'NIF', 'Data de Emissão', 'Data de Pagamento', 'Valor', 'Retenção', 'Estado']
    const linhas = recibos.map((r) => [
      r.cliente,
      r.nif || '',
      r.data_emissao,
      r.data_pagamento || '',
      r.valor,
      r.retencao ? 'Sim' : 'Não',
      r.data_pagamento ? 'Pago' : 'Pendente'
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
          (filtroEstado === 'pago' && r.data_pagamento) ||
          (filtroEstado === 'pendente' && !r.data_pagamento)

        const correspondePeriodo = estaNoPeriodo(r.data_emissao, filtroPeriodo)

        return correspondePesquisa && correspondeEstado && correspondePeriodo
      })
    : recibos

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Recibos</PageTitle>

      <Card ref={formularioRef} className={`mb-6 flex flex-col gap-4 ${editandoId ? 'ring-2 ring-brand-navy' : ''}`}>
        <h3 className="font-semibold text-gray-900 -mb-1">
          {editandoId ? 'Editar recibo' : 'Adicionar recibo'}
        </h3>

        <Input type="text" placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <Input type="text" placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} />
        <Input type="number" placeholder="Valor (€)" value={valor} onChange={(e) => setValor(e.target.value)} />

        <div>
          <Label htmlFor="data-emissao">Data de emissão</Label>
          <Input id="data-emissao" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="data-pagamento">Data de pagamento</Label>
            <InfoIcon
              titulo="Data de pagamento"
              texto="Deixa este campo vazio se ainda não recebeste. Assim que o cliente pagar, volta aqui e preenche a data — isso atualiza automaticamente o estado do recibo para &quot;Pago&quot; e ajusta os cálculos do Painel."
            />
          </div>
          <Input id="data-pagamento" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
          {!dataPagamento && <p className="text-xs text-brand-muted mt-1">Ainda não foi pago</p>}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-900">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={retencao}
              onChange={(e) => setRetencao(e.target.checked)}
              className="accent-brand-navy w-4 h-4"
            />
            Retenção na fonte
          </label>
          <InfoIcon
            titulo="Retenção na fonte"
            texto="Normalmente aplica-se quando o cliente é uma empresa — é ela que desconta o IRS antes de te pagar e entrega-o ao Estado. Se o cliente for um particular, muitas vezes não há retenção, e recebes o valor todo."
          />
        </div>

        <div className="flex gap-2.5">
          <Button className="flex-1" onClick={guardarRecibo}>
            {editandoId ? 'Guardar alterações' : 'Guardar recibo'}
          </Button>
          {editandoId && (
            <Button variant="secondary" onClick={limparFormulario}>Cancelar edição</Button>
          )}
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
      <p className="text-xs text-brand-muted mb-2">Toca num recibo para o editares.</p>
      {recibosFiltrados.length === 0 && <p className="text-sm text-brand-muted">Ainda não tens recibos.</p>}
      {recibosFiltrados.map((r) => (
        <div
          key={r.id}
          onClick={() => editarRecibo(r)}
          className="flex justify-between items-center py-2.5 border-b border-brand-line text-sm gap-3 cursor-pointer hover:bg-brand-navy-tint transition"
        >
          <div>
            <strong className="text-gray-900 font-medium">{r.cliente}</strong>
            <div className="text-gray-900">{r.valor}€ — {r.data_emissao}</div>
          </div>
          {r.data_pagamento ? (
            <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
              Pago em {formatarDataPT(r.data_pagamento)}
            </span>
          ) : (
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Pendente
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  marcarComoPago(r)
                }}
                className="text-xs px-2 py-1 rounded-md border border-brand-line text-brand-muted hover:border-brand-navy hover:text-brand-navy transition cursor-pointer"
              >
                Marcar como pago
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

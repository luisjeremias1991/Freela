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
import Modal from '../components/ui/Modal'

// Ecrã próprio, fora da barra de navegação principal — só acessível a partir
// do botão "Ver orçamento completo →" no Painel. Continua dentro da guarda de
// sessão normal do AppShell (não está em ROTAS_PUBLICAS), por isso só clientes
// autenticados conseguem lá chegar.
const CATEGORIAS_ORCAMENTO = [
  'Casa/Renda',
  'Carro',
  'Luz',
  'Gás',
  'Água',
  'Internet/Telefone',
  'Seguros',
  'Alimentação',
  'Saúde',
  'Lazer',
  'Outra'
]

function chaveMesAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

export default function Orcamento() {
  const { perfil, carregandoPerfil } = usePerfil()
  const [despesas, setDespesas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)
  const [categoria, setCategoria] = useState(CATEGORIAS_ORCAMENTO[0])
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aGuardar, setAGuardar] = useState(false)

  async function carregarDespesas(userId) {
    const { data, error } = await supabase
      .from('despesas_pessoais')
      .select('*')
      .eq('user_id', userId)
      .order('data', { ascending: false })

    if (error) {
      console.error('Erro ao carregar despesas pessoais:', error.message)
      setDespesas([])
    } else {
      setDespesas(data || [])
    }
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      await carregarDespesas(user.id)
      setCarregando(false)
    }
    carregar()
  }, [])

  function abrirModal() {
    setCategoria(CATEGORIAS_ORCAMENTO[0])
    setValor('')
    setData('')
    setMensagem('')
    setModalAberto(true)
  }

  async function adicionarGasto() {
    if (!categoria || !valor || !data) {
      setMensagem('Preenche categoria, valor e data.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    setAGuardar(true)
    const { error } = await supabase.from('despesas_pessoais').insert({
      user_id: user.id,
      categoria,
      valor: parseFloat(valor),
      data
    })
    setAGuardar(false)

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
    } else {
      setModalAberto(false)
      carregarDespesas(user.id)
    }
  }

  const mesAtual = chaveMesAtual()
  const despesasMesAtual = despesas.filter((d) => d.data && d.data.slice(0, 7) === mesAtual)
  const totalMesAtual = despesasMesAtual.reduce((soma, d) => soma + d.valor, 0)

  const totaisPorCategoria = CATEGORIAS_ORCAMENTO
    .map((cat) => ({
      categoria: cat,
      total: despesasMesAtual
        .filter((d) => d.categoria === cat)
        .reduce((soma, d) => soma + d.valor, 0)
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  if (carregando || carregandoPerfil) return <p className="p-5 text-brand-muted">A carregar...</p>

  // Orçamento pessoal é Recibos Claros Pro — bloqueio à entrada da página
  // inteira, para quem chegar aqui diretamente por URL sem passar pelo cartão
  // do Painel (que já nem mostra o link a quem não é Pro).
  if (!perfil?.is_pro) {
    return (
      <div className="max-w-md mx-auto px-5 py-10">
        <Link href="/painel" className="inline-block text-sm text-brand-primary font-semibold mb-5">
          ← Voltar ao Painel
        </Link>
        <PageTitle>Orçamento pessoal</PageTitle>
        <Card>
          <h3 className="font-semibold text-gray-900 mb-1">Funcionalidade Recibos Claros Pro</h3>
          <p className="text-sm text-brand-muted mb-4">
            Vê quanto te sobra mesmo este mês, depois de impostos e despesas pessoais, com o Orçamento pessoal.
          </p>
          <Link href="/perfil#plano" className="text-brand-primary font-semibold text-sm">Ver Recibos Claros Pro</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <Link href="/painel" className="inline-block text-sm text-brand-primary font-semibold mb-5">
        ← Voltar ao Painel
      </Link>

      <PageTitle>Orçamento pessoal</PageTitle>

      <Card className="mb-4">
        <p className="text-sm text-brand-muted mb-1">Total gasto este mês</p>
        <p className="text-2xl font-bold text-gray-900">{totalMesAtual.toFixed(2)} €</p>
      </Card>

      <Button onClick={abrirModal} className="w-full mb-6">+ Adicionar gasto</Button>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Por categoria este mês</h3>

        {totaisPorCategoria.length === 0 && (
          <p className="text-sm text-brand-muted">Ainda não tens gastos registados este mês.</p>
        )}

        <div className="flex flex-col gap-4">
          {totaisPorCategoria.map((c) => {
            const percentagem = totalMesAtual > 0 ? (c.total / totalMesAtual) * 100 : 0
            return (
              <div key={c.categoria}>
                <div className="flex justify-between items-baseline text-sm mb-1.5">
                  <span className="text-gray-900 font-medium">{c.categoria}</span>
                  <span className="text-brand-muted">
                    <strong className="text-gray-900 font-semibold">{c.total.toFixed(2)} €</strong>
                    {' '}({percentagem.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-brand-navy-tint overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${percentagem}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)}>
        <h2 className="text-lg font-bold text-gray-900 mb-5">Adicionar gasto</h2>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="categoria-gasto">Categoria</Label>
            <Select id="categoria-gasto" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_ORCAMENTO.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="valor-gasto">Valor (€)</Label>
            <Input
              id="valor-gasto"
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor (€)"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="data-gasto">Data</Label>
            <Input
              id="data-gasto"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          {mensagem && <p className="text-sm text-brand-muted">{mensagem}</p>}

          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={adicionarGasto} disabled={aGuardar}>
              {aGuardar ? 'A guardar...' : 'Guardar gasto'}
            </Button>
            <Button variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import InfoIcon from '../components/ui/InfoIcon'

function formatarDataPT(dataStr) {
  if (!dataStr) return ''
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-PT')
}

const FUNCIONALIDADES_PRO = [
  'Notificações automáticas de prazos (email + WhatsApp)',
  'Alerta de proximidade de limites fiscais',
  'Filtros de pesquisa nos recibos',
  'Exportação para o contabilista (CSV)',
  'Relatório anual pronto para o IRS',
  'Múltiplos perfis / atividades',
  'Simulador inverso (líquido → bruto)',
  'Plano de pagamentos personalizado (mensal/trimestral)'
]

export default function Perfil() {
  const { perfil, carregandoPerfil, recarregarPerfil } = usePerfil()
  const [nome, setNome] = useState('')
  const [nif, setNif] = useState('')
  const [dataInicioAtividade, setDataInicioAtividade] = useState('')
  const [categoriaCoeficiente, setCategoriaCoeficiente] = useState('0.75')
  const [regimeIva, setRegimeIva] = useState('isento')
  const [taxaSS, setTaxaSS] = useState('0.214')
  const [acumulaOutroTrabalho, setAcumulaOutroTrabalho] = useState(false)
  const [pensionista, setPensionista] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [modalProAberto, setModalProAberto] = useState(false)
  const [cicloEscolhido, setCicloEscolhido] = useState('mensal')
  const [mensagemPlano, setMensagemPlano] = useState('')

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: perfil, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setMensagem('Erro ao carregar: ' + error.message)
    } else if (perfil) {
      setNome(perfil.nome || '')
      setNif(perfil.nif || '')
      setDataInicioAtividade(perfil.data_inicio_atividade || '')
      setCategoriaCoeficiente(perfil.categoria_coeficiente != null ? String(perfil.categoria_coeficiente) : '0.75')
      setRegimeIva(perfil.regime_iva || 'isento')
      setTaxaSS(perfil.taxa_ss != null ? String(perfil.taxa_ss) : '0.214')
      setAcumulaOutroTrabalho(!!perfil.acumula_outro_trabalho)
      setPensionista(!!perfil.pensionista)
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function guardarPerfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!nome || !nif) {
      setMensagem('Preenche pelo menos nome e NIF.')
      return
    }

    const { error } = await supabase.from('perfis').upsert({
      id: user.id,
      nome: nome,
      nif: nif,
      data_inicio_atividade: dataInicioAtividade || null,
      categoria_coeficiente: parseFloat(categoriaCoeficiente),
      regime_iva: regimeIva,
      taxa_ss: parseFloat(taxaSS),
      acumula_outro_trabalho: acumulaOutroTrabalho,
      pensionista: pensionista
    }, { onConflict: 'id' })

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
    } else {
      setMensagem('Perfil guardado!')
    }
  }

  async function subscreverPro() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMensagemPlano('Precisas de iniciar sessão primeiro.')
      return
    }

    setMensagemPlano('A abrir o checkout...')

    try {
      const resposta = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ ciclo: cicloEscolhido })
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setMensagemPlano(dados.error || 'Não foi possível iniciar o checkout.')
        return
      }

      // Redireciona para o Checkout hospedado pela Stripe. A ativação do is_pro
      // acontece no webhook (checkout.session.completed), não aqui.
      window.location.href = dados.url
    } catch {
      setMensagemPlano('Não foi possível ligar ao servidor. Tenta novamente.')
    }
  }

  async function chamarCancelSubscription(acao, mensagemAPedir) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMensagemPlano('Precisas de iniciar sessão primeiro.')
      return
    }

    setMensagemPlano(mensagemAPedir)

    try {
      const resposta = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ acao })
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setMensagemPlano(dados.error || 'Não foi possível concluir o pedido.')
        return
      }

      // O estado real (pro_cancelled) só fica confirmado quando o webhook
      // (customer.subscription.updated) chegar da Stripe — isto só pede à Stripe
      // para mudar. Por isso tentamos ler o perfil algumas vezes, com um pequeno
      // atraso entre tentativas, para dar tempo ao webhook de atualizar a base
      // de dados antes de desistirmos e deixarmos a mensagem "em processamento".
      const pendenteEsperado = acao === 'cancelar'
      const ATRASO_MS = 1500
      const MAX_TENTATIVAS = 3

      for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        await new Promise((resolve) => setTimeout(resolve, ATRASO_MS))
        const perfilAtualizado = await recarregarPerfil()

        if (!!perfilAtualizado?.pro_cancelled === pendenteEsperado) {
          setMensagemPlano('')
          return
        }
      }
      // Esgotaram-se as tentativas — mantém a mensagem "em processamento" já definida acima.
    } catch {
      setMensagemPlano('Não foi possível ligar ao servidor. Tenta novamente.')
    }
  }

  function cancelarSubscricao() {
    chamarCancelSubscription('cancelar', 'Cancelamento em processamento...')
  }

  function reativarSubscricao() {
    chamarCancelSubscription('reativar', 'A reativar subscrição...')
  }

  if (carregando) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Perfil</PageTitle>

      <Card className="mb-8 flex flex-col gap-5">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="nif">NIF</Label>
          <Input id="nif" type="text" placeholder="NIF" value={nif} onChange={(e) => setNif(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="data-inicio">
            Data de início de atividade
            <InfoIcon
              titulo="Data de início de atividade"
              texto="Determina se estás no teu 1º ano de atividade, período em que estás isento de pagar Segurança Social. Essa isenção acaba automaticamente a partir do 12º mês."
            />
          </Label>
          <Input
            id="data-inicio"
            type="date"
            value={dataInicioAtividade}
            onChange={(e) => setDataInicioAtividade(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="categoria">
            Categoria de atividade
            <InfoIcon
              titulo="Categoria de atividade (coeficiente)"
              texto="É a percentagem do que faturas que conta como &quot;lucro&quot; para efeitos de impostos — o resto é tratado como despesa automática, mesmo que não a tenhas tido. Profissões liberais têm coeficiente mais alto (75%), o que costuma significar pagar mais impostos sobre o mesmo valor faturado do que, por exemplo, quem vende mercadorias (15%)."
            />
          </Label>
          <Select id="categoria" value={categoriaCoeficiente} onChange={(e) => setCategoriaCoeficiente(e.target.value)}>
            <option value="0.75">Profissão liberal (75%)</option>
            <option value="0.35">Outros serviços (35%)</option>
            <option value="0.15">Venda de mercadorias (15%)</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="regime-iva">
            Regime de IVA
            <InfoIcon
              titulo="Regime de IVA"
              texto="Isento (art. 53º) significa que não cobras IVA aos teus clientes — só podes escolher isto se faturares abaixo de um limite anual. Regime normal significa que cobras IVA nos teus recibos e depois entregas esse valor ao Estado; não é dinheiro teu, só passa pela tua conta."
            />
          </Label>
          <Select id="regime-iva" value={regimeIva} onChange={(e) => setRegimeIva(e.target.value)}>
            <option value="isento">Isento</option>
            <option value="normal">Normal</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="taxa-ss">
            Taxa de Segurança Social
            <InfoIcon
              titulo="Taxa de Segurança Social"
              texto="É a percentagem que pagas sobre o rendimento relevante. A taxa de 25,2% dá mais proteção social (por exemplo, um subsídio de doença mais alto), mas custa mais por mês do que a taxa padrão de 21,4%."
            />
          </Label>
          <Select id="taxa-ss" value={taxaSS} onChange={(e) => setTaxaSS(e.target.value)}>
            <option value="0.214">21,4%</option>
            <option value="0.252">25,2%</option>
          </Select>
        </div>

        <div className="flex items-start gap-2.5 text-sm text-gray-900">
          <input
            id="acumula-outro-trabalho"
            type="checkbox"
            checked={acumulaOutroTrabalho}
            onChange={(e) => setAcumulaOutroTrabalho(e.target.checked)}
            className="accent-brand-navy w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="acumula-outro-trabalho" className="cursor-pointer">
            Acumula com trabalho por conta de outrem
            <InfoIcon
              titulo="Acumula com trabalho por conta de outrem"
              texto="Se já descontas para a Segurança Social através de um emprego por conta de outrem, podes ficar isento de descontar também como independente, dependendo da tua situação em concreto."
            />
          </label>
        </div>

        <div className="flex items-start gap-2.5 text-sm text-gray-900">
          <input
            id="pensionista"
            type="checkbox"
            checked={pensionista}
            onChange={(e) => setPensionista(e.target.checked)}
            className="accent-brand-navy w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="pensionista" className="cursor-pointer">
            É pensionista
            <InfoIcon
              titulo="Pensionista / reformado"
              texto="Quem já é pensionista e também trabalha como independente está, geralmente, isento de descontar para a Segurança Social nesta atividade."
            />
          </label>
        </div>

        <Button onClick={guardarPerfil}>Guardar perfil</Button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mb-8 -mt-4">{mensagem}</p>}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Plano</h2>
      {carregandoPerfil && <p className="text-sm text-brand-muted">A carregar plano...</p>}

      {!carregandoPerfil && !perfil?.is_pro && (
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Plano Grátis</h3>
          <p className="text-sm text-brand-muted mb-4">Estás a usar a versão gratuita do Freela.</p>
          <Button onClick={() => setModalProAberto(true)}>Ver Freela Pro</Button>
        </Card>
      )}

      {!carregandoPerfil && perfil?.is_pro && !perfil?.pro_cancelled && (
        <Card className="mb-4 border-brand-navy">
          <h3 className="font-semibold text-gray-900 mb-1">Freela Pro ativo</h3>
          <p className="text-sm text-brand-muted mb-4">Já tens acesso a todas as funcionalidades Pro.</p>
          <Button variant="secondary" onClick={cancelarSubscricao}>Cancelar subscrição</Button>
        </Card>
      )}

      {!carregandoPerfil && perfil?.is_pro && perfil?.pro_cancelled && (
        <Card className="mb-4 border-brand-navy">
          <h3 className="font-semibold text-gray-900 mb-1">Freela Pro ativo</h3>
          <p className="text-sm text-brand-muted mb-4">
            Cancelamento agendado para {formatarDataPT(perfil.pro_ends_at)}. Continuas com acesso Pro até lá.
          </p>
          <Button onClick={reativarSubscricao}>Reativar subscrição</Button>
        </Card>
      )}

      {mensagemPlano && <p className="text-sm text-brand-muted">{mensagemPlano}</p>}

      <Modal open={modalProAberto} onClose={() => setModalProAberto(false)}>
        <h2 className="text-xl font-bold text-gray-900 mb-5">Freela Pro</h2>

        <div className="flex gap-2.5 mb-5">
          <button
            onClick={() => setCicloEscolhido('mensal')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
              cicloEscolhido === 'mensal'
                ? 'bg-brand-navy text-white border-2 border-brand-navy'
                : 'bg-white text-gray-900 border border-brand-line'
            }`}
          >
            Mensal — 4,99 €/mês
          </button>
          <button
            onClick={() => setCicloEscolhido('anual')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
              cicloEscolhido === 'anual'
                ? 'bg-brand-navy text-white border-2 border-brand-navy'
                : 'bg-white text-gray-900 border border-brand-line'
            }`}
          >
            Anual — 50 €/ano
          </button>
        </div>

        <ul className="list-disc pl-5 mb-6 space-y-1.5 text-sm text-gray-900">
          {FUNCIONALIDADES_PRO.map((funcionalidade) => (
            <li key={funcionalidade}>{funcionalidade}</li>
          ))}
        </ul>

        {mensagemPlano && <p className="text-sm text-brand-muted mb-4">{mensagemPlano}</p>}

        <div className="flex gap-2.5">
          <Button className="flex-1" onClick={subscreverPro}>Subscrever Freela Pro</Button>
          <Button variant="secondary" onClick={() => setModalProAberto(false)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}

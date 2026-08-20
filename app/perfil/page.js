'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { traduzirErroAuth } from '../../lib/traduzirErroAuth'
import { suportaPasskey, obterPasskeyGuardada, guardarPasskey, limparPasskeyGuardada } from '../../lib/passkey'
import { usePerfil } from '../context/PerfilContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import RotuloInfo from '../components/ui/RotuloInfo'

function formatarDataPT(dataStr) {
  if (!dataStr) return ''
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-PT')
}

// Rótulo (prefixo, usado para encontrar a obrigação já criada e atualizá-la
// em vez de duplicar) e mês/dia de cada prestação de Pagamentos por conta.
const PARCELAS_PPC = [
  { rotulo: 'Pagamento por conta (1/3)', mesDia: '07-20' },
  { rotulo: 'Pagamento por conta (2/3)', mesDia: '09-20' },
  { rotulo: 'Pagamento por conta (3/3)', mesDia: '12-20' }
]

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

  const [passkeySuportada, setPasskeySuportada] = useState(false)
  const [passkeyAtiva, setPasskeyAtiva] = useState(false)
  const [aProcessarPasskey, setAProcessarPasskey] = useState(false)
  const [mensagemPasskey, setMensagemPasskey] = useState('')

  // Pagamentos por conta — sempre referente ao ano corrente (mesmo padrão do
  // resto da app: um ano "atual" calculado com new Date(), nunca guardado
  // como um conceito à parte). Um valor guardado para um ano anterior não
  // conta como definido este ano — ver carregarPerfil().
  const anoCorrente = new Date().getFullYear()
  const [ppcIsento, setPpcIsento] = useState(false)
  const [ppcValor, setPpcValor] = useState('')
  const [ppcDefinidoEsteAno, setPpcDefinidoEsteAno] = useState(false)
  const [aGuardarPpc, setAGuardarPpc] = useState(false)
  const [mensagemPpc, setMensagemPpc] = useState('')

  useEffect(() => {
    // Só se sabe com certeza depois de montar (depende de window/navigator),
    // por isso começa sempre a false para não desalinhar a 1ª renderização
    // no servidor com a do browser.
    setPasskeySuportada(suportaPasskey())
    setPasskeyAtiva(!!obterPasskeyGuardada())
  }, [])

  async function ativarPasskey() {
    setMensagemPasskey('')
    setAProcessarPasskey(true)
    const { data, error } = await supabase.auth.registerPasskey()
    setAProcessarPasskey(false)

    if (error) {
      setMensagemPasskey(traduzirErroAuth(error))
      return
    }

    guardarPasskey(data.id)
    setPasskeyAtiva(true)
    setMensagemPasskey('Face ID / Touch ID ativado com sucesso neste dispositivo!')
  }

  async function desativarPasskey() {
    const passkeyId = obterPasskeyGuardada()
    if (!passkeyId) return

    setMensagemPasskey('')
    setAProcessarPasskey(true)
    const { error } = await supabase.auth.passkey.delete({ passkeyId })
    setAProcessarPasskey(false)

    if (error) {
      setMensagemPasskey(traduzirErroAuth(error))
      return
    }

    limparPasskeyGuardada()
    setPasskeyAtiva(false)
    setMensagemPasskey('Face ID / Touch ID desativado neste dispositivo.')
  }

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

      const definidoEsteAno = perfil.pagamentos_por_conta_ano === anoCorrente
      setPpcDefinidoEsteAno(definidoEsteAno)
      setPpcIsento(definidoEsteAno && !!perfil.pagamentos_por_conta_isento)
      setPpcValor(
        definidoEsteAno && perfil.pagamentos_por_conta_valor != null
          ? String(perfil.pagamentos_por_conta_valor)
          : ''
      )
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarPerfil()
  }, [])

  // Links de upsell Pro apontam para /perfil#plano — mas enquanto "carregando"
  // está true, a página só mostra "A carregar..." e o <h2 id="plano"> nem
  // existe no DOM ainda, por isso o salto automático do browser para o hash
  // não tem para onde ir e fica sem efeito nenhum. Assim que os dados chegam
  // e a secção aparece, fazemos nós o scroll manualmente.
  useEffect(() => {
    if (!carregando && window.location.hash === '#plano') {
      document.getElementById('plano')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [carregando])

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

  // Cria ou atualiza (nunca duplica) as 3 obrigações de "Pagamento por conta"
  // em Prazos, uma por prestação, com data e valor (total ÷ 3) já no nome —
  // a tabela "obrigacoes" não tem coluna própria para valor, e o resto da app
  // (lembrete por email) já lê só "nome" + "data", por isso seguimos o mesmo
  // padrão em vez de criar um conceito novo. Faz update em vez de apagar +
  // recriar para não perder o estado "concluído" se a pessoa já tiver
  // marcado alguma prestação como paga antes de corrigir o valor.
  async function sincronizarPrazosPagamentosPorConta(userId, ano, valorTotal) {
    const valorParcela = valorTotal / 3

    const { data: existentes } = await supabase
      .from('obrigacoes')
      .select('*')
      .eq('user_id', userId)
      .gte('data', `${ano}-01-01`)
      .lte('data', `${ano}-12-31`)
      .ilike('nome', 'Pagamento por conta%')

    for (const parcela of PARCELAS_PPC) {
      const nome = `${parcela.rotulo} — ${valorParcela.toFixed(2)} €`
      const data = `${ano}-${parcela.mesDia}`
      const existente = (existentes || []).find((o) => o.nome.startsWith(parcela.rotulo))

      if (existente) {
        await supabase.from('obrigacoes').update({ nome, data }).eq('id', existente.id)
      } else {
        await supabase.from('obrigacoes').insert({ user_id: userId, nome, data, done: false })
      }
    }
  }

  async function removerPrazosPagamentosPorConta(userId, ano) {
    await supabase
      .from('obrigacoes')
      .delete()
      .eq('user_id', userId)
      .gte('data', `${ano}-01-01`)
      .lte('data', `${ano}-12-31`)
      .ilike('nome', 'Pagamento por conta%')
  }

  async function guardarPagamentosPorConta() {
    setMensagemPpc('')

    if (!ppcIsento && (!ppcValor || parseFloat(ppcValor) <= 0)) {
      setMensagemPpc('Introduz o valor total anual, ou marca que estás isento este ano.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    setAGuardarPpc(true)

    const { error } = await supabase.from('perfis').upsert({
      id: user.id,
      pagamentos_por_conta_ano: anoCorrente,
      pagamentos_por_conta_valor: ppcIsento ? null : parseFloat(ppcValor),
      pagamentos_por_conta_isento: ppcIsento
    }, { onConflict: 'id' })

    if (error) {
      setAGuardarPpc(false)
      setMensagemPpc('Erro ao guardar: ' + error.message)
      return
    }

    if (ppcIsento) {
      await removerPrazosPagamentosPorConta(user.id, anoCorrente)
    } else {
      await sincronizarPrazosPagamentosPorConta(user.id, anoCorrente, parseFloat(ppcValor))
    }

    setPpcDefinidoEsteAno(true)
    setAGuardarPpc(false)
    setMensagemPpc(
      ppcIsento
        ? 'Guardado! Já não vais ver prazos de pagamento por conta este ano.'
        : 'Guardado! As 3 prestações foram criadas em Prazos.'
    )
    recarregarPerfil()
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
            <RotuloInfo
              titulo="Data de início de atividade"
              texto="Determina se estás no teu 1º ano de atividade, período em que estás isento de pagar Segurança Social. Essa isenção acaba automaticamente a partir do 12º mês."
            >
              Data de início de atividade
            </RotuloInfo>
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
            <RotuloInfo
              titulo="Categoria de atividade (coeficiente)"
              texto="É a percentagem do que faturas que conta como &quot;lucro&quot; para efeitos de impostos — o resto é tratado como despesa automática, mesmo que não a tenhas tido. Profissões liberais têm coeficiente mais alto (75%), o que costuma significar pagar mais impostos sobre o mesmo valor faturado do que, por exemplo, quem vende mercadorias (15%)."
            >
              Categoria de atividade
            </RotuloInfo>
          </Label>
          <Select id="categoria" value={categoriaCoeficiente} onChange={(e) => setCategoriaCoeficiente(e.target.value)}>
            <option value="0.75">Profissão liberal (75%)</option>
            <option value="0.35">Outros serviços (35%)</option>
            <option value="0.15">Venda de mercadorias (15%)</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="regime-iva">
            <RotuloInfo
              titulo="Regime de IVA"
              texto="Isento (art. 53º) significa que não cobras IVA aos teus clientes — só podes escolher isto se faturares abaixo de um limite anual. Regime normal significa que cobras IVA nos teus recibos e depois entregas esse valor ao Estado; não é dinheiro teu, só passa pela tua conta."
            >
              Regime de IVA
            </RotuloInfo>
          </Label>
          <Select id="regime-iva" value={regimeIva} onChange={(e) => setRegimeIva(e.target.value)}>
            <option value="isento">Isento</option>
            <option value="normal">Normal</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="taxa-ss">
            <RotuloInfo
              titulo="Taxa de Segurança Social"
              texto="É a percentagem que pagas sobre o rendimento relevante. A taxa de 25,2% dá mais proteção social (por exemplo, um subsídio de doença mais alto), mas custa mais por mês do que a taxa padrão de 21,4%."
            >
              Taxa de Segurança Social
            </RotuloInfo>
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
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="acumula-outro-trabalho" className="cursor-pointer">
            <RotuloInfo
              titulo="Acumula com trabalho por conta de outrem"
              texto="Se já descontas para a Segurança Social através de um emprego por conta de outrem, podes ficar isento de descontar também como independente, dependendo da tua situação em concreto."
            >
              Acumula com trabalho por conta de outrem
            </RotuloInfo>
          </label>
        </div>

        <div className="flex items-start gap-2.5 text-sm text-gray-900">
          <input
            id="pensionista"
            type="checkbox"
            checked={pensionista}
            onChange={(e) => setPensionista(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="pensionista" className="cursor-pointer">
            <RotuloInfo
              titulo="Pensionista / reformado"
              texto="Quem já é pensionista e também trabalha como independente está, geralmente, isento de descontar para a Segurança Social nesta atividade."
            >
              É pensionista
            </RotuloInfo>
          </label>
        </div>

        <Button onClick={guardarPerfil}>Guardar perfil</Button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mb-8 -mt-4">{mensagem}</p>}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagamentos por conta ({anoCorrente})</h2>
      <Card className="mb-8">
        <p className="text-sm text-brand-muted mb-4">
          A app não consegue calcular isto sozinha — o valor só existe na Demonstração de Liquidação de IRS
          do ano anterior, no Portal das Finanças. Introduz aqui o valor total anual assim que o souberes.
        </p>

        <div className="flex items-start gap-2.5 text-sm text-gray-900 mb-4">
          <input
            id="ppc-isento"
            type="checkbox"
            checked={ppcIsento}
            onChange={(e) => setPpcIsento(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="ppc-isento" className="cursor-pointer">
            Não sou obrigado a pagamentos por conta este ano
          </label>
        </div>

        {!ppcIsento && (
          <div className="mb-4">
            <Label htmlFor="ppc-valor">Valor total anual (€)</Label>
            <Input
              id="ppc-valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor total anual (€)"
              value={ppcValor}
              onChange={(e) => setPpcValor(e.target.value)}
            />
          </div>
        )}

        <Button onClick={guardarPagamentosPorConta} disabled={aGuardarPpc}>
          {aGuardarPpc ? 'A guardar...' : 'Guardar'}
        </Button>

        {ppcDefinidoEsteAno && !mensagemPpc && (
          <p className="text-xs text-brand-muted mt-3">
            {ppcIsento
              ? 'Isento este ano.'
              : 'Já definido este ano — as 3 prestações estão em Prazos.'}
          </p>
        )}

        {mensagemPpc && <p className="text-sm text-brand-muted mt-3">{mensagemPpc}</p>}
      </Card>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Acesso rápido</h2>
      <Card className="mb-8">
        <h3 className="font-semibold text-gray-900 mb-1">Face ID / Touch ID</h3>

        {!passkeySuportada && (
          <p className="text-sm text-brand-muted">
            O teu dispositivo ou navegador não suporta este tipo de acesso.
          </p>
        )}

        {passkeySuportada && passkeyAtiva && (
          <>
            <p className="text-sm text-brand-muted mb-4">
              Já podes entrar neste dispositivo com Face ID ou Touch ID, sem escreveres a palavra-passe.
            </p>
            <Button variant="secondary" onClick={desativarPasskey} disabled={aProcessarPasskey}>
              {aProcessarPasskey ? 'A desativar...' : 'Desativar neste dispositivo'}
            </Button>
          </>
        )}

        {passkeySuportada && !passkeyAtiva && (
          <>
            <p className="text-sm text-brand-muted mb-4">
              Ativa o Face ID ou Touch ID para entrares mais depressa neste dispositivo, sem escreveres a palavra-passe sempre que abres a app.
            </p>
            <Button onClick={ativarPasskey} disabled={aProcessarPasskey}>
              {aProcessarPasskey ? 'A ativar...' : 'Ativar Face ID / Touch ID neste dispositivo'}
            </Button>
          </>
        )}

        {mensagemPasskey && <p className="text-sm text-brand-muted mt-4">{mensagemPasskey}</p>}
      </Card>

      <h2 id="plano" className="text-lg font-semibold text-gray-900 mb-3 scroll-mt-6">Plano</h2>
      {carregandoPerfil && <p className="text-sm text-brand-muted">A carregar plano...</p>}

      {!carregandoPerfil && !perfil?.is_pro && (
        <Card className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">Plano Grátis</h3>
          <p className="text-sm text-brand-muted mb-4">Estás a usar a versão gratuita da Recibos Claros.</p>
          <Button onClick={() => setModalProAberto(true)}>Ver Recibos Claros Pro</Button>
        </Card>
      )}

      {!carregandoPerfil && perfil?.is_pro && !perfil?.pro_cancelled && (
        <Card className="mb-4 border-brand-primary">
          <h3 className="font-semibold text-gray-900 mb-1">Recibos Claros Pro ativo</h3>
          <p className="text-sm text-brand-muted mb-4">Já tens acesso a todas as funcionalidades Pro.</p>
          <Button variant="secondary" onClick={cancelarSubscricao}>Cancelar subscrição</Button>
        </Card>
      )}

      {!carregandoPerfil && perfil?.is_pro && perfil?.pro_cancelled && (
        <Card className="mb-4 border-brand-primary">
          <h3 className="font-semibold text-gray-900 mb-1">Recibos Claros Pro ativo</h3>
          <p className="text-sm text-brand-muted mb-4">
            Cancelamento agendado para {formatarDataPT(perfil.pro_ends_at)}. Continuas com acesso Pro até lá.
          </p>
          <Button onClick={reativarSubscricao}>Reativar subscrição</Button>
        </Card>
      )}

      {mensagemPlano && <p className="text-sm text-brand-muted">{mensagemPlano}</p>}

      <Modal open={modalProAberto} onClose={() => setModalProAberto(false)}>
        <h2 className="text-xl font-bold text-gray-900 mb-5">Recibos Claros Pro</h2>

        <div className="flex gap-2.5 mb-5">
          <button
            onClick={() => setCicloEscolhido('mensal')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
              cicloEscolhido === 'mensal'
                ? 'bg-brand-primary text-white border-2 border-brand-primary'
                : 'bg-white text-gray-900 border border-brand-line'
            }`}
          >
            Mensal — 4,99 €/mês
          </button>
          <button
            onClick={() => setCicloEscolhido('anual')}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
              cicloEscolhido === 'anual'
                ? 'bg-brand-primary text-white border-2 border-brand-primary'
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
          <Button className="flex-1" onClick={subscreverPro}>Subscrever Recibos Claros Pro</Button>
          <Button variant="secondary" onClick={() => setModalProAberto(false)}>Fechar</Button>
        </div>
      </Modal>
    </div>
  )
}

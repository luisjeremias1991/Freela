'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePerfil } from '../context/PerfilContext'

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

  if (carregando) return <p style={{ padding: 20 }}>A carregar...</p>

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 20 }}>
      <h1>Perfil</h1>

      <div style={{ marginBottom: 30, padding: 15, border: '1px solid #444' }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Nome</label>
        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />

        <label style={{ display: 'block', marginBottom: 4 }}>NIF</label>
        <input
          type="text"
          placeholder="NIF"
          value={nif}
          onChange={(e) => setNif(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />

        <label style={{ display: 'block', marginBottom: 4 }}>Data de início de atividade</label>
        <input
          type="date"
          value={dataInicioAtividade}
          onChange={(e) => setDataInicioAtividade(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        />

        <label style={{ display: 'block', marginBottom: 4 }}>Categoria de atividade</label>
        <select
          value={categoriaCoeficiente}
          onChange={(e) => setCategoriaCoeficiente(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        >
          <option value="0.75">Profissão liberal (75%)</option>
          <option value="0.35">Outros serviços (35%)</option>
          <option value="0.15">Venda de mercadorias (15%)</option>
        </select>

        <label style={{ display: 'block', marginBottom: 4 }}>Regime de IVA</label>
        <select
          value={regimeIva}
          onChange={(e) => setRegimeIva(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        >
          <option value="isento">Isento</option>
          <option value="normal">Normal</option>
        </select>

        <label style={{ display: 'block', marginBottom: 4 }}>Taxa de Segurança Social</label>
        <select
          value={taxaSS}
          onChange={(e) => setTaxaSS(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
        >
          <option value="0.214">21,4%</option>
          <option value="0.252">25,2%</option>
        </select>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={acumulaOutroTrabalho}
            onChange={(e) => setAcumulaOutroTrabalho(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Acumula com trabalho por conta de outrem
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={pensionista}
            onChange={(e) => setPensionista(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          É pensionista
        </label>

        <button onClick={guardarPerfil} style={{ padding: 10 }}>Guardar perfil</button>
      </div>

      <p>{mensagem}</p>

      <h3>Plano</h3>
      {carregandoPerfil && <p style={{ color: '#888' }}>A carregar plano...</p>}

      {!carregandoPerfil && !perfil?.is_pro && (
        <div style={{ padding: 15, border: '1px solid #444', marginBottom: 15 }}>
          <h4>Plano Grátis</h4>
          <p style={{ color: '#888' }}>Estás a usar a versão gratuita do Freela.</p>
          <button onClick={() => setModalProAberto(true)} style={{ padding: 10 }}>Ver Freela Pro</button>
        </div>
      )}

      {!carregandoPerfil && perfil?.is_pro && !perfil?.pro_cancelled && (
        <div style={{ padding: 15, border: '1px solid #10284D', marginBottom: 15 }}>
          <h4>Freela Pro ativo</h4>
          <p style={{ color: '#888' }}>Já tens acesso a todas as funcionalidades Pro.</p>
          <button onClick={cancelarSubscricao} style={{ padding: 10 }}>Cancelar subscrição</button>
        </div>
      )}

      {!carregandoPerfil && perfil?.is_pro && perfil?.pro_cancelled && (
        <div style={{ padding: 15, border: '1px solid #10284D', marginBottom: 15 }}>
          <h4>Freela Pro ativo</h4>
          <p style={{ color: '#888' }}>
            Cancelamento agendado para {formatarDataPT(perfil.pro_ends_at)}. Continuas com acesso Pro até lá.
          </p>
          <button onClick={reativarSubscricao} style={{ padding: 10 }}>Reativar subscrição</button>
        </div>
      )}

      {mensagemPlano && <p>{mensagemPlano}</p>}

      {modalProAberto && (
        <div
          onClick={() => setModalProAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--background)',
              color: 'var(--foreground)',
              width: '100%',
              maxWidth: 420,
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 20,
              border: '1px solid #444',
              borderRadius: 8
            }}
          >
            <h2>Freela Pro</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
              <button
                onClick={() => setCicloEscolhido('mensal')}
                style={{
                  flex: 1,
                  padding: 10,
                  border: cicloEscolhido === 'mensal' ? '2px solid #10284D' : '1px solid #444',
                  background: cicloEscolhido === 'mensal' ? '#10284D' : 'transparent',
                  color: cicloEscolhido === 'mensal' ? '#fff' : 'inherit',
                  cursor: 'pointer'
                }}
              >
                Mensal — 4,99 €/mês
              </button>
              <button
                onClick={() => setCicloEscolhido('anual')}
                style={{
                  flex: 1,
                  padding: 10,
                  border: cicloEscolhido === 'anual' ? '2px solid #10284D' : '1px solid #444',
                  background: cicloEscolhido === 'anual' ? '#10284D' : 'transparent',
                  color: cicloEscolhido === 'anual' ? '#fff' : 'inherit',
                  cursor: 'pointer'
                }}
              >
                Anual — 50 €/ano
              </button>
            </div>

            <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
              {FUNCIONALIDADES_PRO.map((funcionalidade) => (
                <li key={funcionalidade} style={{ marginBottom: 6 }}>{funcionalidade}</li>
              ))}
            </ul>

            {mensagemPlano && <p>{mensagemPlano}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={subscreverPro}
                style={{ flex: 1, padding: 10, background: '#10284D', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                Subscrever Freela Pro
              </button>
              <button onClick={() => setModalProAberto(false)} style={{ padding: 10, cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

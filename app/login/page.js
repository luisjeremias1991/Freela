'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { traduzirErroAuth } from '../../lib/traduzirErroAuth'
import { suportaPasskey, obterPasskeyGuardada } from '../../lib/passkey'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')

  const [passkeyDisponivel, setPasskeyDisponivel] = useState(false)
  const [aEntrarComPasskey, setAEntrarComPasskey] = useState(false)
  const disparoAutomaticoFeito = useRef(false)

  useEffect(() => {
    // Lido diretamente da URL (em vez de useSearchParams) só para não obrigar
    // esta página a precisar de um limite <Suspense>.
    const parametros = new URLSearchParams(window.location.search)
    if (parametros.get('redefinida') === '1') {
      setMensagem('Palavra-passe redefinida com sucesso! Já podes entrar com a nova palavra-passe.')
    }

    // O WebAuthn não deixa perguntar ao browser "há uma passkey guardada para
    // esta conta?" sem já disparar o ecrã nativo — por isso usamos a marca
    // local deixada no Perfil da última vez que uma passkey foi ativada
    // *neste dispositivo* como sinal de que vale a pena tentar logo.
    const disponivel = suportaPasskey() && !!obterPasskeyGuardada()
    setPasskeyDisponivel(disponivel)

    // Dispara o Face ID/Touch ID assim que a página abre, sem precisar de
    // clique — o botão "Entrar com Face ID" fica só como alternativa manual
    // (ex. se a pessoa cancelar o ecrã nativo, ou se o browser não permitir
    // disparar sem um gesto explícito, o que acontece nalguns Safari/iOS mais
    // antigos). "disparoAutomaticoFeito" evita repetir isto se o efeito
    // correr duas vezes (ex. Strict Mode em desenvolvimento).
    if (disponivel && !disparoAutomaticoFeito.current) {
      disparoAutomaticoFeito.current = true
      tentarEntrarComPasskey({ automatico: true })
    }
  }, [])

  async function tentarEntrarComPasskey({ automatico }) {
    if (!automatico) setMensagem('')
    setAEntrarComPasskey(true)
    const { error } = await supabase.auth.signInWithPasskey()
    setAEntrarComPasskey(false)

    if (error) {
      // Numa tentativa automática (a pessoa não pediu), uma falha ou
      // cancelamento não deve assustar ninguém com uma mensagem de erro —
      // fica simplesmente no formulário normal, como se nada tivesse acontecido.
      if (!automatico) setMensagem(traduzirErroAuth(error))
      return
    }

    router.replace('/painel')
  }

  function entrarComPasskey() {
    tentarEntrarComPasskey({ automatico: false })
  }

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      setMensagem('Sessão iniciada com sucesso!')
      router.replace('/painel')
    }
  }

  function abrirRecuperacao() {
    setModoRecuperacao(true)
    setEmailRecuperacao(email)
    setMensagem('')
  }

  function fecharRecuperacao() {
    setModoRecuperacao(false)
    setMensagem('')
  }

  async function enviarLinkRecuperacao() {
    if (!emailRecuperacao) {
      setMensagem('Preenche o teu email.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacao, {
      redirectTo: `${window.location.origin}/redefinir-password`
    })

    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      // Volta ao ecrã de login normal com a confirmação — mesmo padrão usado para
      // a mensagem de "?redefinida=1" depois de definir a nova password.
      setModoRecuperacao(false)
      setMensagem('O link de recuperação foi enviado para o teu email.')
    }
  }

  if (modoRecuperacao) {
    return (
      <div className="max-w-sm mx-auto px-5 py-24">
        <PageTitle>Recuperar palavra-passe</PageTitle>

        <Card className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email-recuperacao">Email</Label>
            <Input
              id="email-recuperacao"
              type="email"
              placeholder="Email"
              value={emailRecuperacao}
              onChange={(e) => setEmailRecuperacao(e.target.value)}
            />
          </div>

          <Button onClick={enviarLinkRecuperacao}>Enviar link de recuperação</Button>
          <Button variant="secondary" onClick={fecharRecuperacao}>Voltar ao login</Button>
        </Card>

        {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <PageTitle>Entrar</PageTitle>

      {passkeyDisponivel && (
        <>
          <Button onClick={entrarComPasskey} disabled={aEntrarComPasskey} className="w-full mb-3">
            {aEntrarComPasskey ? 'A entrar...' : '🔐 Entrar com Face ID'}
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-brand-line" />
            <span className="text-xs text-brand-muted">ou entra com email e palavra-passe</span>
            <div className="flex-1 h-px bg-brand-line" />
          </div>
        </>
      )}

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="Palavra-passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button onClick={entrar}>Entrar</Button>

        <button
          type="button"
          onClick={abrirRecuperacao}
          className="text-sm text-brand-navy text-left cursor-pointer"
        >
          Esqueci-me da palavra-passe
        </button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}

      <p className="text-sm text-brand-muted mt-6 text-center">
        Ainda não tens conta?{' '}
        <Link href="/criar-conta" className="text-brand-navy font-semibold">Criar conta</Link>
      </p>
    </div>
  )
}

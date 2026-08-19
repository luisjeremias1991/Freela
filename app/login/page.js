'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { traduzirErroAuth } from '../../lib/traduzirErroAuth'
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

  useEffect(() => {
    // Lido diretamente da URL (em vez de useSearchParams) só para não obrigar
    // esta página a precisar de um limite <Suspense>.
    const parametros = new URLSearchParams(window.location.search)
    if (parametros.get('redefinida') === '1') {
      setMensagem('Palavra-passe redefinida com sucesso! Já podes entrar com a nova palavra-passe.')
    }
  }, [])

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      setMensagem('Sessão iniciada com sucesso!')
      router.replace('/painel')
    }
  }

  async function criarConta() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      setMensagem('Conta criada! Verifica o teu email para confirmar.')
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
      setMensagem('Se existir uma conta com este email, foi enviado um link de recuperação.')
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

        <div className="flex gap-2.5">
          <Button className="flex-1" onClick={entrar}>Entrar</Button>
          <Button variant="secondary" className="flex-1" onClick={criarConta}>Criar conta</Button>
        </div>

        <button
          type="button"
          onClick={abrirRecuperacao}
          className="text-sm text-brand-navy text-left cursor-pointer"
        >
          Esqueci-me da palavra-passe
        </button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}
    </div>
  )
}

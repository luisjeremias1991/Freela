'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { traduzirErroAuth } from '../../lib/traduzirErroAuth'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageTitle from '../components/ui/PageTitle'
import Label from '../components/ui/Label'
import Input from '../components/ui/Input'

export default function CriarConta() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function criarConta() {
    if (!email || !password || !confirmarPassword) {
      setMensagem('Preenche o email e a palavra-passe.')
      return
    }

    if (password !== confirmarPassword) {
      setMensagem('As palavras-passe não coincidem.')
      return
    }

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMensagem(traduzirErroAuth(error))
      return
    }

    // Nome é opcional — se preenchido, guarda-o já no perfil. Não bloqueia a
    // criação da conta nem o redirecionamento se isto falhar por algum motivo.
    if (nome && data.user) {
      const { error: erroNome } = await supabase
        .from('perfis')
        .upsert({ id: data.user.id, nome }, { onConflict: 'id' })

      if (erroNome) {
        console.error('Erro ao guardar o nome no perfil:', erroNome.message)
      }
    }

    // A conta fica logo utilizável — a confirmação de email está desligada,
    // por isso já existe sessão ativa a seguir ao signUp.
    setMensagem('Conta criada com sucesso!')
    router.replace('/painel')
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <PageTitle>Criar conta</PageTitle>

      <Card className="flex flex-col gap-4">
        <div>
          <Label htmlFor="nome">Nome (opcional)</Label>
          <Input id="nome" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

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

        <div>
          <Label htmlFor="confirmar-password">Confirmar palavra-passe</Label>
          <Input
            id="confirmar-password"
            type="password"
            placeholder="Confirmar palavra-passe"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
          />
        </div>

        <Button onClick={criarConta}>Criar conta</Button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}

      <p className="text-sm text-brand-muted mt-6 text-center">
        Já tens conta?{' '}
        <Link href="/login" className="text-brand-navy font-semibold">Entrar</Link>
      </p>
    </div>
  )
}

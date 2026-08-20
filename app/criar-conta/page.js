'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { traduzirErroAuth } from '../../lib/traduzirErroAuth'
import { VERSAO_TERMOS } from '../../lib/termos'
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
  const [termosAceites, setTermosAceites] = useState(false)
  const [mensagem, setMensagem] = useState('')

  async function criarConta() {
    // Segunda barreira além do "disabled" do botão — impede também um envio
    // por Enter dentro de um campo de texto enquanto a checkbox não está marcada.
    if (!termosAceites) {
      setMensagem('Tens de aceitar os Termos de Uso e a Política de Privacidade para criares conta.')
      return
    }

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

    // Nome é opcional — só entra no upsert se preenchido. A aceitação dos
    // termos, pelo contrário, é sempre gravada (data + versão do texto),
    // como prova de quando e o que exatamente cada pessoa aceitou.
    if (data.user) {
      const { error: erroPerfil } = await supabase
        .from('perfis')
        .upsert(
          {
            id: data.user.id,
            ...(nome ? { nome } : {}),
            termos_aceites_em: new Date().toISOString(),
            termos_versao: VERSAO_TERMOS
          },
          { onConflict: 'id' }
        )

      if (erroPerfil) {
        console.error('Erro ao guardar o perfil:', erroPerfil.message)
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

        <div className="flex items-start gap-2.5 text-sm text-gray-900">
          <input
            id="termos"
            type="checkbox"
            checked={termosAceites}
            onChange={(e) => setTermosAceites(e.target.checked)}
            className="accent-brand-primary w-4 h-4 mt-0.5 shrink-0"
          />
          <label htmlFor="termos" className="cursor-pointer">
            Li e aceito os{' '}
            <Link
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              // Impede que o clique no link também seja interpretado como
              // clique no <label> (o que alternaria a checkbox sem a pessoa
              // querer) — mesmo cuidado já aplicado ao InfoIcon dentro de labels.
              onClick={(e) => e.stopPropagation()}
              className="text-brand-primary font-semibold"
            >
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-brand-primary font-semibold"
            >
              Política de Privacidade
            </Link>
          </label>
        </div>

        <Button onClick={criarConta} disabled={!termosAceites}>Criar conta</Button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}

      <p className="text-sm text-brand-muted mt-6 text-center">
        Já tens conta?{' '}
        <Link href="/login" className="text-brand-primary font-semibold">Entrar</Link>
      </p>
    </div>
  )
}

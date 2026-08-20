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

export default function RedefinirPassword() {
  const router = useRouter()
  const [novaPassword, setNovaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [aVerificar, setAVerificar] = useState(true)
  const [prontoParaRedefinir, setProntoParaRedefinir] = useState(false)

  useEffect(() => {
    let ativo = true

    // O link do email traz um token na própria URL — o cliente Supabase deteta-o
    // automaticamente ao carregar a página e estabelece uma sessão temporária,
    // disparando o evento "PASSWORD_RECOVERY". Verificamos também se já existe
    // sessão nesse preciso momento, caso esse processamento já tenha terminado
    // antes deste efeito chegar a ligar o listener.
    const { data: subscricao } = supabase.auth.onAuthStateChange((event) => {
      if (!ativo) return
      if (event === 'PASSWORD_RECOVERY') {
        setProntoParaRedefinir(true)
        setAVerificar(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ativo) return
      if (session) {
        setProntoParaRedefinir(true)
      }
      setAVerificar(false)
    })

    return () => {
      ativo = false
      subscricao.subscription.unsubscribe()
    }
  }, [])

  async function guardarNovaPassword() {
    if (!novaPassword || !confirmarPassword) {
      setMensagem('Preenche os dois campos.')
      return
    }
    if (novaPassword !== confirmarPassword) {
      setMensagem('As palavras-passe não coincidem.')
      return
    }
    if (novaPassword.length < 6) {
      setMensagem('A palavra-passe tem de ter pelo menos 6 caracteres.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: novaPassword })

    if (error) {
      setMensagem(traduzirErroAuth(error))
    } else {
      // A sessão de recuperação é só para este momento — termina-a para a pessoa
      // ter de entrar já com a password nova, em vez de ficar meio autenticada.
      await supabase.auth.signOut()
      router.replace('/login?redefinida=1')
    }
  }

  if (aVerificar) {
    return <p className="p-5 text-brand-muted">A verificar o link...</p>
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-24">
      <PageTitle>Nova palavra-passe</PageTitle>

      {!prontoParaRedefinir ? (
        <Card>
          <p className="text-sm text-gray-900">
            Este link de recuperação é inválido ou já expirou. Pede um novo em{' '}
            <a href="/login" className="text-brand-primary font-semibold">/login</a>.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nova-password">Nova palavra-passe</Label>
            <Input
              id="nova-password"
              type="password"
              placeholder="Nova palavra-passe"
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
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

          <Button onClick={guardarNovaPassword}>Guardar nova palavra-passe</Button>
        </Card>
      )}

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}
    </div>
  )
}

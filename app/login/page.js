'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMensagem('Erro: ' + error.message)
    } else {
      setMensagem('Sessão iniciada com sucesso!')
      router.replace('/painel')
    }
  }

  async function criarConta() {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMensagem('Erro: ' + error.message)
    } else {
      setMensagem('Conta criada! Verifica o teu email para confirmar.')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>Entrar</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
      />
      <input
        type="password"
        placeholder="Palavra-passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 10, padding: 10 }}
      />
      <button onClick={entrar} style={{ marginRight: 10, padding: 10 }}>Entrar</button>
      <button onClick={criarConta} style={{ padding: 10 }}>Criar conta</button>
      <p>{mensagem}</p>
    </div>
  )
}
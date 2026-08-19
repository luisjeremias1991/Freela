'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import PageTitle from '../../components/ui/PageTitle'
import Label from '../../components/ui/Label'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const ESPECIALIDADES = [
  'Recibos verdes e IRS',
  'IVA e regime normal',
  'Constituição de empresa',
  'Contabilidade geral PME'
]

export default function PerfilContabilista() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [especialidade, setEspecialidade] = useState(ESPECIALIDADES[0])
  const [precoHora, setPrecoHora] = useState('')
  const [calLink, setCalLink] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregarPerfil() {
    const { data: { user } } = await supabase.auth.getUser()

    // O email é sempre o da conta autenticada — não vem do formulário nem é
    // editável, precisamente para nunca desalinhar do email usado no Cal.com.
    setEmail(user.email || '')

    const { data: perfil, error } = await supabase
      .from('contabilistas')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      setMensagem('Erro ao carregar: ' + error.message)
    } else if (perfil) {
      setNome(perfil.nome || '')
      setBio(perfil.bio || '')
      setEspecialidade(perfil.especialidade || ESPECIALIDADES[0])
      setPrecoHora(perfil.preco_hora != null ? String(perfil.preco_hora) : '')
      setCalLink(perfil.cal_link || '')
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarPerfil()
  }, [])

  async function guardarPerfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!nome) {
      setMensagem('Preenche pelo menos o nome.')
      return
    }

    const { error } = await supabase.from('contabilistas').upsert({
      id: user.id,
      nome: nome,
      email: user.email || null,
      bio: bio || null,
      especialidade: especialidade,
      preco_hora: precoHora ? parseFloat(precoHora) : null,
      cal_link: calLink || null
    }, { onConflict: 'id' })

    if (error) {
      setMensagem('Erro ao guardar: ' + error.message)
    } else {
      setMensagem('Perfil guardado!')
    }
  }

  if (carregando) return <p className="p-5 text-brand-muted">A carregar...</p>

  return (
    <div className="max-w-md mx-auto px-5 py-10">
      <PageTitle>Perfil de contabilista</PageTitle>

      <Card className="flex flex-col gap-5">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            readOnly
            className="bg-gray-50 text-brand-muted cursor-not-allowed"
          />
          <p className="text-xs text-brand-muted mt-1">
            É o email da tua conta — tem de ser o mesmo que usas no Cal.com.
          </p>
        </div>

        <div>
          <Label htmlFor="bio">Bio curta</Label>
          <Input
            id="bio"
            type="text"
            placeholder="Ex.: especialista em freelancers e pequenos negócios"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="especialidade">Especialidade</Label>
          <Select id="especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            {ESPECIALIDADES.map((valor) => (
              <option key={valor} value={valor}>{valor}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="preco-hora">Preço por hora (€)</Label>
          <Input
            id="preco-hora"
            type="number"
            placeholder="Preço por hora (€)"
            value={precoHora}
            onChange={(e) => setPrecoHora(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cal-link">Link da conta Cal.com</Label>
          <Input
            id="cal-link"
            type="text"
            placeholder="https://cal.com/o-teu-utilizador"
            value={calLink}
            onChange={(e) => setCalLink(e.target.value)}
          />
          <p className="text-xs text-brand-muted mt-1">
            Os horários livres são geridos lá — a app só mostra os slots que definires como disponíveis.
          </p>
        </div>

        <Button onClick={guardarPerfil}>Guardar perfil</Button>
      </Card>

      {mensagem && <p className="text-sm text-brand-muted mt-4">{mensagem}</p>}
    </div>
  )
}

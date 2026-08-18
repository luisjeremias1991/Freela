'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Perfil() {
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
    </div>
  )
}

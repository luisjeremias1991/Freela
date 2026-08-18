'use client'

import { createContext, useContext } from 'react'

// Disponibiliza a linha da tabela "perfis" do utilizador autenticado (incluindo is_pro)
// a todas as páginas, para não repetirmos esta chamada à Supabase em cada uma.
export const PerfilContext = createContext({
  perfil: null,
  carregandoPerfil: true,
  recarregarPerfil: async () => {}
})

export function usePerfil() {
  return useContext(PerfilContext)
}

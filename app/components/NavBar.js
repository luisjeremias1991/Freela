'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/simulador', label: 'Simulador' },
  { href: '/painel', label: 'Painel' },
  { href: '/recibos', label: 'Recibos' },
  { href: '/prazos', label: 'Prazos' },
  { href: '/perfil', label: 'Perfil' }
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid #ddd',
        zIndex: 100
      }}
    >
      {ITENS.map((item) => {
        const ativo = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '12px 0',
              textDecoration: 'none',
              color: ativo ? '#10284D' : '#000',
              fontWeight: ativo ? 'bold' : 'normal',
              fontSize: 14
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

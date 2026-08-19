'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/simulador', label: 'Simulador', icone: '🧮' },
  { href: '/painel', label: 'Painel', icone: '📊' },
  { href: '/recibos', label: 'Recibos', icone: '🧾' },
  { href: '/prazos', label: 'Prazos', icone: '📅' },
  { href: '/perfil', label: 'Perfil', icone: '👤' }
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex bg-white border-t border-brand-line z-100">
      {ITENS.map((item) => {
        const ativo = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 min-h-12 text-[13px] no-underline transition ${
              ativo ? 'text-brand-navy font-semibold' : 'text-brand-muted'
            }`}
          >
            <span aria-hidden="true" className="text-base">{item.icone}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

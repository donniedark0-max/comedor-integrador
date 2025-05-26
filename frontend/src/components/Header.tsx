'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Inicio', href: '/' },
  { label: 'Generar Menú', href: '/menu' },
]

export default function Header() {
  const pathname = usePathname() || '/'

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Comedor Universitario UTP
        </Link>
        <nav>
          <ul className="flex space-x-6">
            {navItems.map(({ label, href }) => {
              const isActive = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`transition-colors px-2 py-1 ${
                      isActive
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
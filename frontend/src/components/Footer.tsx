'use client'

import Link from 'next/link'

const footerLinks = [
  { label: 'Aviso Legal', href: '/aviso-legal' },
  { label: 'Política de Privacidad', href: '/privacidad' },
  { label: 'Contacto', href: '/contacto' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-100 mt-auto border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} Comedor Universitario UTP. Todos los derechos reservados.
        </p>
        <ul className="flex space-x-4 mt-4 md:mt-0">
          {footerLinks.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
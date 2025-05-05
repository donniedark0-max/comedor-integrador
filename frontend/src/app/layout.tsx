import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

export const metadata: Metadata = {
  title: "Comedor Universitario",
  description: "Sistema de generación de menús para el comedor universitario",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-[var(--color-neutral-light)]">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-[var(--color-primary)]">
                  Comedor Universitario UTP
                </Link>
                <ul className="flex space-x-6">
                  <li>
                    <Link
                      href="/"
                      className="text-[var(--color-neutral-dark)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      Inicio
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/menu"
                      className="text-[var(--color-neutral-dark)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      Generar Menú
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </header>

          <main className="flex-grow">{children}</main>

          <footer className="bg-[var(--color-neutral-light)] py-6">
            <div className="container mx-auto px-4 text-center text-[var(--color-neutral-dark)]/70">
              <p>© {new Date().getFullYear()} Comedor Universitario. Todos los derechos reservados.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

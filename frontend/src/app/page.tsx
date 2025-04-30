import Link from 'next/link'

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Bienvenido</h1>
      <nav className="space-x-4">
        {/* En Next 13 App Router, Link ya genera el <a>, no pongas un <a> interno */}
        <Link href="/menu" className="text-blue-600 hover:underline">
          Generar Menú
        </Link>
      </nav>
    </main>
  )
}

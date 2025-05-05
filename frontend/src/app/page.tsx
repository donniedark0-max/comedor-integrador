import Link from "next/link"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--color-neutral-dark)]">
          Bienvenido al Comedor Universitario
        </h1>
        <p className="text-lg mb-12 text-[var(--color-neutral-dark)]/80">
          Genera menús balanceados y nutritivos adaptados a tus preferencias alimenticias.
        </p>

        <div className="grid grid-cols-1 gap-6">
          <Link href="/menu" className="card group">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-[var(--color-primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-[var(--color-neutral-dark)] group-hover:text-[var(--color-primary)] transition-colors">
                Generar Menú
              </h2>
              <p className="text-[var(--color-neutral-dark)]/70">
                Crea un menú personalizado según tus preferencias y necesidades nutricionales.
              </p>
            </div>
          </Link>

          {/* Generar Menú Aleatorio */}
          <Link href="/random-menu" className="card group">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-[var(--color-primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4-4m4 4l-4 4" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-[var(--color-neutral-dark)] group-hover:text-[var(--color-primary)] transition-colors">
                Generar Menú Aleatorio
              </h2>
              <p className="text-[var(--color-neutral-dark)]/70">
                Genera un menú aleatorio con opciones variadas y balanceadas.
              </p>
            </div>
          </Link>
          
        </div>
      </div>
    </div>
  )
}

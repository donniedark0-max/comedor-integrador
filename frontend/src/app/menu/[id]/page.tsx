import { useParams } from 'next/navigation'

export default function MenuDetail() {
  const { id } = useParams()
  return (
    <main className="p-8">
      <h1 className="text-2xl">Detalle del menú #{id}</h1>
      {/* aquí podrías volver a GET /menus/{id} si lo implementas */}
    </main>
  )
}

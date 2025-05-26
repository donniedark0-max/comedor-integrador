'use client'

import { useState, useMemo } from 'react'
import { TableCellsIcon } from '@heroicons/react/24/outline'  

interface HistoryRecord {
  id: number
  dish: string
  proteins: number
  fats: number
  carbs: number
  datetime: string
  student: string
  code: string
}

// Datos ficticios (más recientes primeros)
const historyData: HistoryRecord[] = [
  { id: 1, dish: 'Pollo Asado', proteins: 30, fats: 10, carbs: 5, datetime: '2025-05-29T18:23:45', student: 'María López', code: 'U21201234' },
  { id: 2, dish: 'Spaghetti Boloñesa', proteins: 12, fats: 8, carbs: 40, datetime: '2025-05-29T17:45:10', student: 'Carlos Ruiz', code: 'U00005678' },
  { id: 3, dish: 'Ensalada César', proteins: 8, fats: 6, carbs: 10, datetime: '2025-05-29T16:12:30', student: 'Ana Gómez', code: 'U00009876' },
  { id: 4, dish: 'Tacos', proteins: 15, fats: 12, carbs: 20, datetime: '2025-05-28T13:34:05', student: 'Luis Torres', code: 'U00001111' },
  { id: 5, dish: 'Sushi', proteins: 10, fats: 4, carbs: 28, datetime: '2025-05-28T12:05:55', student: 'Elena Díaz', code: 'U21002222' },
  { id: 6, dish: 'Hamburguesa', proteins: 20, fats: 18, carbs: 35, datetime: '2025-05-27T19:54:12', student: 'Jorge Pérez', code: 'U00003333' },
  { id: 7, dish: 'Pizza', proteins: 14, fats: 16, carbs: 38, datetime: '2025-05-27T18:03:21', student: 'Lucía Martín', code: 'U00004444' },
  { id: 8, dish: 'Ensalada Mixta', proteins: 6, fats: 5, carbs: 12, datetime: '2025-05-26T11:22:09', student: 'Pedro Sánchez', code: 'U00005555' },
  { id: 9, dish: 'Pescado al Horno', proteins: 25, fats: 8, carbs: 0, datetime: '2025-05-26T13:47:33', student: 'Sofía Ruiz', code: 'U00006666' },
  { id: 10, dish: 'Lasaña', proteins: 18, fats: 14, carbs: 45, datetime: '2025-05-25T20:15:02', student: 'Miguel Castro', code: 'U00007777' },
  { id: 11, dish: 'Ceviche', proteins: 12, fats: 4, carbs: 8, datetime: '2025-05-25T18:30:47', student: 'Gabriela Herrera', code: 'U00008888' },
  { id: 12, dish: 'Paella', proteins: 16, fats: 10, carbs: 50, datetime: '2025-05-24T14:12:54', student: 'Ricardo Flores', code: 'U202009999' },
    { id: 13, dish: 'Tortilla Española', proteins: 10, fats: 6, carbs: 20, datetime: '2025-05-24T12:45:30', student: 'Clara Jiménez', code: 'U00009999' },
    { id: 14, dish: 'Crepas', proteins: 8, fats: 3, carbs: 25, datetime: '2025-05-23T17:00:00', student: 'Andrés Morales', code: 'U00010000' },
    { id: 15, dish: 'Sopa de Verduras', proteins: 5, fats: 2, carbs: 15, datetime: '2025-05-23T19:30:00', student: 'Laura Ortega', code: 'U00011111' },
    { id: 16, dish: 'Guiso de Lentejas', proteins: 12, fats: 5, carbs: 30, datetime: '2025-05-22T13:15:00', student: 'Fernando Ruiz', code: 'U00012222' },
    { id: 17, dish: 'Pasta al Pesto', proteins: 10, fats: 7, carbs: 40, datetime: '2025-05-22T18:45:00', student: 'Natalia Castro', code: 'U00013333' },
    { id: 18, dish: 'Pollo al Curry', proteins: 20, fats: 8, carbs: 25, datetime: '2025-05-21T14:00:00', student: 'Diego Romero', code: 'U00014444' },
    { id: 19, dish: 'Arroz con Pollo', proteins: 15, fats: 6, carbs: 35, datetime: '2025-05-21T19:00:00', student: 'Valentina Torres', code: 'U00015555' },
    { id: 20, dish: 'Burritos', proteins: 18, fats: 9, carbs: 30, datetime: '2025-05-20T12:30:00', student: 'Samuel López', code:'U00016666' },
    { id: 21, dish: 'Falafel', proteins: 12, fats: 4, carbs: 20, datetime: '2025-05-20T17:00:00', student: 'Camila Martínez', code:'U00017777' },
    { id: 22, dish: 'Tortas', proteins: 14, fats: 5, carbs: 28, datetime: '2025-05-19T13:00:00', student: 'Joaquín Pérez', code:'U00018888' },
    { id: 23, dish: 'Chili con Carne', proteins: 20, fats: 10, carbs: 15, datetime: '2025-05-19T18:30:00', student: 'Isabel Gómez', code:'U00019999' },
    { id: 24, dish: 'Pasta Carbonara', proteins: 16, fats: 12, carbs: 40, datetime: '2025-05-18T14:45:00', student: 'Santiago Ruiz', code:'U00020000' },
    { id: 25, dish: 'Sushi Rolls', proteins: 10, fats: 5, carbs: 30, datetime: '2025-05-18T19:15:00', student: 'Valeria Castro', code:'U00021111' },
    { id: 26, dish: 'Pancakes', proteins: 8, fats: 4, carbs: 35, datetime: '2025-05-17T12:00:00', student: 'Emilio Ortega', code:'U00022222' },
    { id: 27, dish: 'Curry de Garbanzos', proteins: 12, fats: 6, carbs: 20, datetime: '2025-05-17T16:30:00', student: 'Renata Morales', code:'U00023333' },
    { id: 28, dish: 'Pizza Vegetariana', proteins: 14, fats: 8, carbs: 45, datetime: '2025-05-16T13:00:00', student: 'Agustín Romero', code:'U00024444' },
    { id: 29, dish: 'Ensalada de Quinoa', proteins: 10, fats: 3, carbs: 25, datetime: '2025-05-16T18:00:00', student:'Sideral Lujan Carrion', code:'U00025555' },
    { id: 30, dish:'Bowl de Acai', proteins :8 , fats :2 , carbs :20 , datetime :'2025-05-15T12 :30 :00' , student :'U00026666' , code :'U00026666' },
    { id: 31, dish:'Wrap de Pollo', proteins :15 , fats :5 , carbs :30 , datetime :'2025-05-15T17 :00 :00' , student :'U00027777' , code :'U00027777' },
]

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
    const pageSize = 17

  // Filtrar por código o nombre de plato
  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return historyData.filter(
      (r) =>
        r.code.toLowerCase().includes(term) ||
        r.dish.toLowerCase().includes(term)
    )
  }, [search])

  const pageCount = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  return (
    <main className="flex flex-col h-screen p-8">
      <h1 className="text-3xl font-bold mb-4 flex">
        <TableCellsIcon className="h-10 w-10 mr-2"/> Historial de Pedidos</h1>

      <div className="flex justify-between items-center mb-4">
        <div className="text-gray-600">
          Mostrando {paginated.length} de {filtered.length} registros
        </div>
        <input
          type="text"
          placeholder="Buscar por código o plato..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto mb-4">
        <table className="min-w-full bg-white border border-[#e2e8f0]">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-right">Proteínas (g)</th>
              <th className="px-4 py-2 text-right">Grasas (g)</th>
              <th className="px-4 py-2 text-right">Carbs (g)</th>
              <th className="px-4 py-2 text-center">Fecha</th>
              <th className="px-4 py-2 text-center">Hora</th>
              <th className="px-4 py-2 text-left">Estudiante</th>
              <th className="px-4 py-2 text-left">Código</th>

            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => {
              const dt = new Date(r.datetime)
              const date = dt.toLocaleDateString('es-ES')
              const time = dt.toLocaleTimeString('es-ES')
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.dish}</td>
                  <td className="px-4 py-2 text-right">{r.proteins}</td>
                  <td className="px-4 py-2 text-right">{r.fats}</td>
                  <td className="px-4 py-2 text-right">{r.carbs}</td>
                  <td className="px-4 py-2 text-center">{date}</td>
                  <td className="px-4 py-2 text-center">{time}</td>
                  <td className="px-4 py-2">{r.student}</td>
                  <td className="px-4 py-2">{r.code}</td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            onClick={() => setPage(num)}
            className={`px-3 py-1 rounded-md ${
              num === page
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
    </main>
  )
}
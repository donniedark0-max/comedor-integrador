'use client'
import { ChartBarSquareIcon } from '@heroicons/react/24/outline'  

import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'usage' | 'daily'>('usage')
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')

  // Datos simulados
  const topPlates = [
    { name: 'Ensalada César', count: 120 },
    { name: 'Spaghetti Boloñesa', count: 98 },
    { name: 'Pollo Asado', count: 85 },
    { name: 'Tacos', count: 76 },
    { name: 'Sushi', count: 60 },
  ]

  const dailyCounts = [
    { date: '2025-05-01', count: 34 },
    { date: '2025-05-02', count: 28 },
    { date: '2025-05-03', count: 45 },
    { date: '2025-05-04', count: 50 },
    { date: '2025-05-05', count: 42 },
    { date: '2025-05-06', count: 38 },
    { date: '2025-05-07', count: 47 },
    { date: '2025-05-08', count: 49 },
    { date: '2025-05-09', count: 31 },
    { date: '2025-05-10', count: 55 },
    { date: '2025-05-11', count: 44 },
    { date: '2025-05-12', count: 29 },
    { date: '2025-05-13', count: 53 },
    { date: '2025-05-14', count: 46 },
    { date: '2025-05-15', count: 52 },
    { date: '2025-05-16', count: 40 },
    { date: '2025-05-17', count: 36 },
    { date: '2025-05-18', count: 48 },
    { date: '2025-05-19', count: 41 },
    { date: '2025-05-20', count: 50 },
    { date: '2025-05-21', count: 43 },
    { date: '2025-05-22', count: 39 },
    { date: '2025-05-23', count: 58 },
    { date: '2025-05-24', count: 60 },
    { date: '2025-05-25', count: 54 },
    { date: '2025-05-26', count: 47 },
    { date: '2025-05-27', count: 49 },
    { date: '2025-05-28', count: 51 },
    { date: '2025-05-29', count: 45 },
    { date: '2025-07-30', count: 37 },
    { date: '2025-06-31', count: 56 },
  ]

  // Estadísticas generales
  const totalUsage = topPlates.reduce((sum, p) => sum + p.count, 0)
  const avgDaily =
    dailyCounts.reduce((sum, d) => sum + d.count, 0) / dailyCounts.length
  const maxDay = dailyCounts.reduce(
    (prev, curr) => (curr.count > prev.count ? curr : prev),
    dailyCounts[0]
  )

  // Datos de chart según periodo
  const { labels, data } = useMemo(() => {
    if (period === 'day') {
      return {
        labels: dailyCounts.map((d) => d.date),
        data: dailyCounts.map((d) => d.count),
      }
    }
    if (period === 'week') {
      const weeks: Record<string, number> = {}
      dailyCounts.forEach(({ date, count }, idx) => {
        const weekNum = Math.floor(idx / 7) + 1
        const key = `Semana ${weekNum}`
        weeks[key] = (weeks[key] || 0) + count
      })
      return {
        labels: Object.keys(weeks),
        data: Object.values(weeks),
      }
    }
    // month
    const months: Record<string, number> = {}
    dailyCounts.forEach(({ date, count }) => {
      const month = date.slice(0, 7) // 'YYYY-MM'
      months[month] = (months[month] || 0) + count
    })
    return {
      labels: Object.keys(months),
      data: Object.values(months),
    }
  }, [period])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: period === 'day'
        ? 'Platos por Día'
        : period === 'week'
        ? 'Platos por Semana'
        : 'Platos por Mes'
      },
    },
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6 flex"> 
        <ChartBarSquareIcon className="h-10 w-10 mr-2 "/> Reportes</h1>

      {/* Resumen general */}
      <div className="bg-gray-50 p-4 mb-6 rounded-[30px] border border-[#e2e8f0]">
        <h2 className="text-xl font-semibold mb-2">🔍 Resumen General</h2>
        <p>Total de usos de platos: <strong>{totalUsage}</strong></p>
        <p>Uso medio por día: <strong>{avgDaily.toFixed(1)}</strong></p>
        <p>Día más activo: <strong>{maxDay.date}</strong> ({maxDay.count})</p>
      </div>

      {/* Tab list */}
      <div role="tablist" className="flex space-x-4 mb-4">
        <button 
          role="tab"
          aria-selected={activeTab === 'usage'}
          onClick={() => setActiveTab('usage')}
          className={`px-3 py-2 border-b-2 ${
            activeTab === 'usage'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          } focus:outline-none`}
        >
          Platos más usados
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'daily'}
          onClick={() => setActiveTab('daily')}
          className={`px-3 py-2 border-b-2 ${
            activeTab === 'daily'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          } focus:outline-none`}
        >
          Nº platos por período
        </button>
      </div>

      {/* Contenedor de contenido */}
      <div className="rounded-[30px] border border-[#e2e8f0] bg-white p-6 text-gray-900">
        {activeTab === 'usage' ? (
          <Bar
            data={{
              labels: topPlates.map((p) => p.name),
              datasets: [
                {
                  label: 'Veces usadas',
                  data: topPlates.map((p) => p.count),
                  backgroundColor: 'rgba(59,130,246,0.5)',
                  borderColor: 'rgba(59,130,246,1)',
                  borderWidth: 1,
                },
              ],
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: { display: true, text: 'Top 5 Platos Más Usados' },
              },
            }}
          />
        ) : (
          <>
            {/* Sub-tabs para día/semana/mes */}
            <div className="flex space-x-4 mb-4">
              {['day', 'week', 'month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-3 py-1 rounded ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {p === 'day'
                    ? 'Día'
                    : p === 'week'
                    ? 'Semana'
                    : 'Mes'}
                </button>
              ))}
            </div>

            <Line
              data={{
                labels,
                datasets: [
                  {
                    label:
                      period === 'day'
                        ? 'Platos/día'
                        : period === 'week'
                        ? 'Platos/semana'
                        : 'Platos/mes',
                    data,
                    fill: false,
                    borderColor:
                      period === 'month' ? 'rgb(234, 179, 8)' : 'rgb(16,185,129)',
                    tension: 0.3,
                  },
                ],
              }}
              options={chartOptions}
            />
          </>
        )}
      </div>
    </main>
  )
}
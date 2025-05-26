'use client'

import { ChartPieIcon } from '@heroicons/react/24/outline'  
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
import { Line, Bar } from 'react-chartjs-2'

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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'macros' | 'plates' | 'hours' | 'menus'>('macros')

  // Datos simulados
  const monthlyMacro = [
    { month: 'Ene', proteins: 3200, fats: 800, carbs: 1200 },
    { month: 'Feb', proteins: 2800, fats: 700, carbs: 1100 },
    { month: 'Mar', proteins: 3500, fats: 900, carbs: 1300 },
    { month: 'Abr', proteins: 3000, fats: 850, carbs: 1250 },
    { month: 'May', proteins: 3700, fats: 950, carbs: 1350 },
    { month: 'Jun', proteins: 3400, fats: 880, carbs: 1280 },
  ]
  const monthlyStudents = [120, 110, 130, 125, 140, 135]

  const dailyPlates = [
    { date: '25 May', count: 42 },
    { date: '26 May', count: 50 },
    { date: '27 May', count: 38 },
    { date: '28 May', count: 47 },
    { date: '29 May', count: 60 },
    { date: '30 May', count: 54 },
    { date: '31 May', count: 56 },
  ]
  const hourlyDemand = [
    { hour: '08:00', count: 12 },
    { hour: '10:00', count: 25 },
    { hour: '12:00', count: 40 },
    { hour: '14:00', count: 35 },
    { hour: '16:00', count: 28 },
    { hour: '18:00', count: 30 },
    { hour: '20:00', count: 20 },
  ]
  const menuUsage = { balanced: 152, completed: 87 }

  // Chart data
  const chartData = useMemo(() => {
    if (activeTab === 'macros') {
      // calcular promedio por estudiante
      const avgProteins = monthlyMacro.map((m, i) =>
        Number((m.proteins / monthlyStudents[i]).toFixed(1))
      )
      const avgFats = monthlyMacro.map((m, i) =>
        Number((m.fats / monthlyStudents[i]).toFixed(1))
      )
      const avgCarbs = monthlyMacro.map((m, i) =>
        Number((m.carbs / monthlyStudents[i]).toFixed(1))
      )
      return {
        labels: monthlyMacro.map((m) => m.month),
        datasets: [
          {
            label: 'Proteínas avg (g)',
            data: avgProteins,
            borderColor: '#EAB308',
            backgroundColor: 'rgba(234,179,8,0.3)',
            tension: 0.4,
          },
          {
            label: 'Grasas avg (g)',
            data: avgFats,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239,68,68,0.3)',
            tension: 0.4,
          },
          {
            label: 'Carbs avg (g)',
            data: avgCarbs,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59,130,246,0.3)',
            tension: 0.4,
          },
        ],
      }
    }
    if (activeTab === 'plates') {
      return {
        labels: dailyPlates.map(d => d.date),
        datasets: [{
          label: 'Platos generados',
          data: dailyPlates.map(d => d.count),
          backgroundColor: 'rgba(59,130,246,0.5)',
          borderColor: 'rgba(59,130,246,1)',
          borderWidth: 1
        }]
      }
    }
    return {
      labels: hourlyDemand.map(h => h.hour),
      datasets: [{
        label: 'Demanda por hora',
        data: hourlyDemand.map(h => h.count),
        backgroundColor: 'rgba(16,185,129,0.5)',
        borderColor: 'rgba(16,185,129,1)',
        borderWidth: 1
      }]
    }
  }, [activeTab])

  // Chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text:
          activeTab === 'macros'
            ? 'Macro nutrientes promedio por estudiante'
            : activeTab === 'plates'
            ? 'Platos generados por día'
            : 'Horas con mayor demanda',
      },
    },
  }), [activeTab])

  // Nota explicativa
  const note = useMemo(() => {
    if (activeTab === 'macros') return 'Este gráfico muestra los promedios mensuales de proteínas, grasas y carbohidratos utilizados por estudiante.'
    if (activeTab === 'plates')   return 'Aquí ves cuántos platos se generaron cada día de la última semana.'
    return 'Demanda de servicio por franjas horarias a lo largo del día.'
  }, [activeTab])

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6 flex"> 
        <ChartPieIcon className="h-10 w-10 mr-2"/>Dashboard</h1>

      {/* Resumen general */}
      <div className="bg-gray-50 p-4 mb-6 rounded-[30px] border border-gray-200">
        <h2 className="text-xl font-semibold mb-2"> Resumen de uso de menús</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <span className="block text-sm text-gray-600">Menú “balanced”</span>
            <p className="text-3xl font-bold">{menuUsage.balanced}</p>
          </div>
          <div className="text-center">
            <span className="block text-sm text-gray-600">Menú “completed”</span>
            <p className="text-3xl font-bold">{menuUsage.completed}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex space-x-4 mb-6">
        {['macros','plates','hours'].map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } focus:outline-none`}
          >
            {tab === 'macros'
              ? 'Macros'
              : tab === 'plates'
              ? 'Platos'
              : tab === 'hours'
              ? 'Horas'
              : 'Menús'}
          </button>
        ))}
      </div>

      {/* Contenedor de gráfico o métricas */}
      <div className="rounded-[30px] border border-[#e2e8f0] bg-white p-6 text-gray-900">
        { activeTab === 'plates' ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Nota explicativa */}
      <p className="mt-4 text-sm text-gray-600">{note}</p>
    </main>
  )
}
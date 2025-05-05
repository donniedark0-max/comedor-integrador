import Link from "next/link"
import { useState, useEffect } from "react"
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import type { MenuItem } from "@/types"

ChartJS.register(ArcElement, Tooltip, Legend)

interface MenuCardProps {
  dish: MenuItem[]
  id: string
}

export function MenuCard({ dish, id }: MenuCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [description, setDescription] = useState("")

  // Calcular totales
  const totalCalories = dish.reduce((sum, item) => sum + item.energy, 0)
  const totalCarbs    = dish.reduce((sum, item) => sum + item.carbs, 0)
  const totalProtein  = dish.reduce((sum, item) => sum + item.protein, 0)
  const totalFat      = dish.reduce((sum, item) => sum + item.fat, 0)

  // Nombre del plato
  const mainDishName = dish[0]?.name || "Plato sin nombre"
  // Imagen 
  const imageUrl = "https://trexperienceperu.com/sites/default/files/2024-06/peruvian%20food.jpg"


  // Datos para el gráfico
  const pieData = {
    labels: ["Carbohidratos", "Proteínas", "Grasas"],
    datasets: [
      {
        data: [totalCarbs, totalProtein, totalFat],
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    ],
  }



  return (
    <div className="card hover:border-primary hover:border text-black flex flex-col justify-between h-full">
      <h3 className="text-xl font-semibold mb-3 text-neutral-dark text-center">{mainDishName}</h3>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-neutral-dark/70 mb-2">Ingredientes:</h4>
        <ul className="space-y-1">
          {dish.map((item, index) => (
            <li key={index} className="text-sm flex justify-between">
              <span>{item.name}</span>
              <span className="text-neutral-dark/60">{item.grams}g</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-neutral-dark/70 mb-2">Macronutrientes:</h4>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <p className="font-medium">{totalCalories.toFixed(0)}</p>
            <p className="text-xs text-neutral-dark/60">kcal</p>
          </div>
          <div>
            <p className="font-medium">{totalCarbs.toFixed(1)}g</p>
            <p className="text-xs text-neutral-dark/60">Carbs</p>
          </div>
          <div>
            <p className="font-medium">{totalProtein.toFixed(1)}g</p>
            <p className="text-xs text-neutral-dark/60">Prot</p>
          </div>
          <div>
            <p className="font-medium">{totalFat.toFixed(1)}g</p>
            <p className="text-xs text-neutral-dark/60">Grasas</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-primary block text-center w-full mt-auto"
      >
        Ver detalle
      </button>



      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl overflow-hidden relative flex flex-col md:flex-row">
            {/* Botón cerrar */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl"
            >
              ×
            </button>

            {/* imagen */}
            <div className="md:w-1/2 h-64 md:h-auto">
              <img
                src={imageUrl}
                alt="Comida deliciosa"
                className="w-full h-full object-cover"
              />
            </div>

            {/* contenido */}
            <div className="md:w-1/2 p-6 flex flex-col">
              <h2 className="text-3xl font-serif mb-4">{mainDishName}</h2>

              <details className="border-b pb-4 mb-4">
                <summary className="flex justify-between items-center cursor-pointer">
                  <span className="text-lg font-medium">Descripción</span>
                  <span className="text-xl">▾</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed">
                  {description || "Cargando descripción…"}
                </p>
              </details>

              <details className="border-b pb-4 mb-6">
                <summary className="flex justify-between items-center cursor-pointer">
                  <span className="text-lg font-medium">Macronutrientes</span>
                  <span className="text-xl">▾</span>
                </summary>
                <div className="mt-4 flex flex-col items-center">
                  <div className="w-60 h-60"> 
                      <Pie data={pieData} />
                  </div>
                  <div className="mt-4 text-sm space-y-1">
                    <p><strong>Calorías:</strong> {totalCalories.toFixed(0)} kcal</p>
                    <p><strong>Carbs:</strong> {totalCarbs.toFixed(1)} g</p>
                    <p><strong>Prot:</strong> {totalProtein.toFixed(1)} g</p>
                    <p><strong>Grasas:</strong> {totalFat.toFixed(1)} g</p>
                  </div>
                </div>
              </details>

              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-auto py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

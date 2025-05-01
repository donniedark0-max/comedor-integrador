"use client"

import { useEffect, useState } from "react"
import type { MenuItem } from "@/types"
import { MacroProgressBar } from "@/components/MacroProgressBar"

// Metas diarias de macronutrientes (ejemplo)
const DAILY_GOALS = {
  calories: 2000,
  carbs: 250,
  protein: 75,
  fat: 65,
}

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [dish, setDish] = useState<MenuItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMenuDetail() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menus/${id}`)

        if (!response.ok) {
          throw new Error("No se pudo cargar el detalle del menú")
        }

        const data = await response.json()
        setDish(data.plato)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMenuDetail()
  }, [id])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    )
  }

  if (error || !dish) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error || "No se encontró el menú solicitado"}
        </div>
      </div>
    )
  }

  // Calcular totales
  const totalCalories = dish.reduce((sum, item) => sum + item.energy, 0)
  const totalCarbs = dish.reduce((sum, item) => sum + item.carbs, 0)
  const totalProtein = dish.reduce((sum, item) => sum + item.protein, 0)
  const totalFat = dish.reduce((sum, item) => sum + item.fat, 0)

  // Obtener el nombre del plato principal
  const mainDishName = dish[0]?.name || "Plato sin nombre"

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{mainDishName}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Ingredientes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Ingrediente</th>
                      <th className="text-right py-3 px-4">Gramos</th>
                      <th className="text-right py-3 px-4">Calorías</th>
                      <th className="text-right py-3 px-4">Carbs (g)</th>
                      <th className="text-right py-3 px-4">Proteína (g)</th>
                      <th className="text-right py-3 px-4">Grasas (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dish.map((item, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="py-3 px-4">{item.name}</td>
                        <td className="text-right py-3 px-4">{item.grams}</td>
                        <td className="text-right py-3 px-4">{item.energy.toFixed(0)}</td>
                        <td className="text-right py-3 px-4">{item.carbs.toFixed(1)}</td>
                        <td className="text-right py-3 px-4">{item.protein.toFixed(1)}</td>
                        <td className="text-right py-3 px-4">{item.fat.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-[var(--color-neutral-light)]/30">
                      <td className="py-3 px-4">Total</td>
                      <td className="text-right py-3 px-4">-</td>
                      <td className="text-right py-3 px-4">{totalCalories.toFixed(0)}</td>
                      <td className="text-right py-3 px-4">{totalCarbs.toFixed(1)}</td>
                      <td className="text-right py-3 px-4">{totalProtein.toFixed(1)}</td>
                      <td className="text-right py-3 px-4">{totalFat.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Macronutrientes</h2>
              <p className="text-sm text-[var(--color-neutral-dark)]/70 mb-4">Comparación con metas diarias</p>

              <MacroProgressBar
                value={totalCalories}
                max={DAILY_GOALS.calories}
                label="Calorías"
                color="bg-[var(--color-primary)]"
              />

              <MacroProgressBar
                value={totalCarbs}
                max={DAILY_GOALS.carbs}
                label="Carbohidratos"
                color="bg-[var(--color-accent)]"
              />

              <MacroProgressBar
                value={totalProtein}
                max={DAILY_GOALS.protein}
                label="Proteínas"
                color="bg-[var(--color-secondary)]"
              />

              <MacroProgressBar
                value={totalFat}
                max={DAILY_GOALS.fat}
                label="Grasas"
                color="bg-[var(--color-neutral-dark)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

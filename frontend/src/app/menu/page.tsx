"use client"

import { useState } from "react"
import { FilterForm, type Filters } from "@/components/FilterForm"
import { MenuCard } from "@/components/MenuCard"
import type { MenuItem } from "@/types"

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[][]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerateMenu(filters: Filters) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          turno: filters.turno,
          includeCategories: filters.includeCategories,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al generar el menú")
      }

      const data = await response.json()
      setMenu(data.platos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-black mb-8 text-center">Generar Menú</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <FilterForm onSubmit={handleGenerateMenu} />
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          ) : menu.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map((dish, index) => (
                <MenuCard key={index} dish={dish} id={`${index + 1}`} />
              ))}
            </div>
          ) : (
            <div className="bg-[var(--color-neutral-light)]/50 rounded-xl p-8 text-center">
              <p className="text-[var(--color-neutral-dark)]/70">
                Selecciona tus preferencias y haz clic en "Generar Menú" para ver opciones de platos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"

export interface Filters {
  turno: "desayuno" | "almuerzo" | "cena"
  includeCategories: {
    carnes: boolean
    legumbres: boolean
    vegetales: boolean
    granos: boolean
  }
}

interface FilterFormProps {
  onSubmit: (filters: Filters) => Promise<void>
}

export function FilterForm({ onSubmit }: FilterFormProps) {
  const [filters, setFilters] = useState<Filters>({
    turno: "almuerzo",
    includeCategories: {
      carnes: true,
      legumbres: true,
      vegetales: true,
      granos: true,
    },
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleCategoryChange = (category: keyof Filters["includeCategories"]) => {
    setFilters((prev) => ({
      ...prev,
      includeCategories: {
        ...prev.includeCategories,
        [category]: !prev.includeCategories[category],
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(filters)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl text-black font-semibold mb-4">Filtros</h2>

      

      <div className="mb-6">
        <p className="block text-sm font-medium text-[var(--color-neutral-dark)] mb-2">Incluir categorías</p>
        <div className="space-y-2 text-black">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeCategories.carnes}
              onChange={() => handleCategoryChange("carnes")}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-2"
            />
            <span>Carnes</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeCategories.legumbres}
              onChange={() => handleCategoryChange("legumbres")}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-2"
            />
            <span>Legumbres</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeCategories.vegetales}
              onChange={() => handleCategoryChange("vegetales")}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-2"
            />
            <span>Vegetales</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.includeCategories.granos}
              onChange={() => handleCategoryChange("granos")}
              className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-2"
            />
            <span>Granos</span>
          </label>
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary w-full flex justify-center items-center">
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generando...
          </>
        ) : (
          "Generar Menú"
        )}
      </button>
    </form>
  )
}

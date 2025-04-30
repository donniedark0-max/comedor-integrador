"use client"

import { useState } from 'react'
import { FilterForm, Filters } from '../components/FilterForm'
import { MenuCard } from '../components/MenuCard'
import { MenuItem } from '../../../types'

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[][]>([])

  async function onGenerate(filters: Filters) {
    const body = {
      n_platos: filters.n_platos,
      // aquí podrías pasar include/exclude arrays
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/balanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      const data = await res.json()
      setMenu(data.platos)
    } else {
      alert('Error generando menú')
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Generar Menú</h1>
      <FilterForm onSubmit={onGenerate} />
      <section className="mt-8">
        {menu.map((dish, i) => (
          <MenuCard key={i} dish={dish} />
        ))}
      </section>
    </main>
  )
}

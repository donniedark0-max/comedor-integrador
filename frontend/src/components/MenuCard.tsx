import Link from "next/link"
import type { MenuItem } from "@/types"

interface MenuCardProps {
  dish: MenuItem[]
  id: string
}

export function MenuCard({ dish, id }: MenuCardProps) {
  // Calcular totales
  const totalCalories = dish.reduce((sum, item) => sum + item.energy, 0)
  const totalCarbs = dish.reduce((sum, item) => sum + item.carbs, 0)
  const totalProtein = dish.reduce((sum, item) => sum + item.protein, 0)
  const totalFat = dish.reduce((sum, item) => sum + item.fat, 0)

  // Obtener el nombre del plato principal (primer elemento)
  const mainDishName = dish[0]?.name || "Plato sin nombre"

  return (
    <div className="card hover:border-primary hover:border text-black">
      <h3 className="text-xl font-semibold mb-3 text-neutral-dark">{mainDishName}</h3>

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

      <Link href={`/menu/${id}`} className="btn-primary block text-center w-full">
        Ver detalle
      </Link>
    </div>
  )
}

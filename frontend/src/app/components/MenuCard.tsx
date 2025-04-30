import { MenuItem } from '../../../types'

export function MenuCard({ dish }: { dish: MenuItem[] }) {
  return (
    <div className="border p-4 rounded shadow mb-4">
      <h2 className="text-xl font-semibold">{dish[0].name.split(' ')[0]}...</h2>
      <ul className="mt-2">
        {dish.map(item => (
          <li key={item.name}>
            {item.name}: {item.grams} g &middot; 
            E:{item.energy} kcal &middot;
            C:{item.carbs} g &middot;
            P:{item.protein} g &middot;
            F:{item.fat} g
          </li>
        ))}
      </ul>
    </div>
  )
}

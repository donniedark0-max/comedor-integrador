"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { IngredientCard } from "@/components/ingredient-card"
import { AnimatedButton } from "@/components/animated-button"

const availableIngredients = [
  { id: "pollo", name: "Pollo", calories: 150, image: "/assets/images/ingredients/chicken.png" },
  { id: "tofu", name: "Tofu", calories: 120, image: "/assets/images/ingredients/tofu.png" },
  { id: "lentejas", name: "Lentejas", calories: 110, image: "/assets/images/ingredients/lentils.png" },
  { id: "quinoa", name: "Quinoa", calories: 100, image: "/assets/images/ingredients/quinoa.png" },
  { id: "arroz", name: "Arroz Integral", calories: 90, image: "/assets/images/ingredients/rice.png" },
  { id: "espinacas", name: "Espinacas", calories: 30, image: "/assets/images/ingredients/spinach.png" },
  { id: "broccoli", name: "Brócoli", calories: 50, image: "/assets/images/ingredients/broccoli.png" },
  { id: "zanahorias", name: "Zanahorias", calories: 40, image: "/assets/images/ingredients/carrots.png" },
  { id: "tomates", name: "Tomates", calories: 25, image: "/assets/images/ingredients/tomatoes.png" },
  { id: "aguacate", name: "Aguacate", calories: 160, image: "/assets/images/ingredients/avocado.png" },
]

export default function MenuPersonalizadoPage() {
  const router = useRouter()
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])

  const handleIngredientToggle = (ingredientId: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredientId) ? prev.filter((id) => id !== ingredientId) : [...prev, ingredientId],
    )
  }

  const selectedItems = availableIngredients.filter((ingredient) => selectedIngredients.includes(ingredient.id))

  const availableItems = availableIngredients.filter((ingredient) => !selectedIngredients.includes(ingredient.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">


      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Personaliza tu Menú</h1>
          <p className="text-gray-600">Selecciona los ingredientes que más te gusten para crear tu menú ideal</p>
        </motion.div>

        {/* Available Ingredients */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Ingredientes Disponibles</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {availableItems.map((ingredient, index) => (
              <IngredientCard
                key={ingredient.id}
                name={ingredient.name}
                calories={ingredient.calories}
                image={ingredient.image}
                isSelected={false}
                onToggle={() => handleIngredientToggle(ingredient.id)}
                index={index}
              />
            ))}
          </div>
        </motion.section>

        {/* Selected Ingredients */}
        {selectedItems.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Ingredientes Seleccionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {selectedItems.map((ingredient, index) => (
                <IngredientCard
                  key={ingredient.id}
                  name={ingredient.name}
                  calories={ingredient.calories}
                  image={ingredient.image}
                  isSelected={true}
                  onToggle={() => handleIngredientToggle(ingredient.id)}
                  index={index}
                />
              ))}
            </div>

            <div className="flex justify-center gap-4">
              <AnimatedButton
                onClick={() => setSelectedIngredients([])}
                variant="outline"
                className="px-6 py-3 rounded-full"
              >
                Eliminar Todo
              </AnimatedButton>
              <AnimatedButton
                onClick={() => router.push("/menu-personalizado/resultados")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold"
                disabled={selectedItems.length === 0}
              >
                Generar Menú ({selectedItems.length} ingredientes)
              </AnimatedButton>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}

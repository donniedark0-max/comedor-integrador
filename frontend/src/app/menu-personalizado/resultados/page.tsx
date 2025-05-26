"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { DishCard } from "@/components/dish-card"
import { NutritionModal } from "@/components/nutrition-modal"
import { AnimatedButton } from "@/components/animated-button"
import { ArrowLeft, ChefHat } from "lucide-react"

const menuOptions = [
  {
    id: "1",
    name: "Ensalada Mediterránea",
    description:
      "Una mezcla refrescante de lechuga, tomate, pepino, aceitunas y queso feta, aderezada con vinagreta balsámica.",
    image: "/assets/images/results/EnsaladaMediterranea.png",
    nutrition: { calories: 320, protein: 12, carbs: 18, fat: 24 },
    ingredients: [
      "Lechuga fresca y crujiente como base",
      "Tomates cherry maduros",
      "Pepino cortado en rodajas",
      "Aceitunas negras y verdes",
      "Queso feta cremoso",
      "Vinagreta balsámica casera",
    ],
  },
  {
    id: "2",
    name: "Pollo al Limón con Quinoa",
    description:
      "Pechuga de pollo marinada en limón y hierbas, servida con una porción de quinoa y vegetales al vapor.",
    image: "/assets/images/results/PolloLimonQuinoa.png",
    nutrition: { calories: 450, protein: 35, carbs: 42, fat: 12 },
    ingredients: [
      "Pechuga de pollo marinada en limón",
      "Quinoa cocida al punto perfecto",
      "Brócoli al vapor",
      "Zanahorias baby",
      "Hierbas aromáticas frescas",
    ],
  },
  {
    id: "3",
    name: "Sopa de Lentejas y Verduras",
    description:
      "Una sopa nutritiva y reconfortante, llena de lentejas, zanahorias, apio y espinacas, sazonada con especias.",
    image: "/assets/images/results/SopaLentejasVerduras.png",
    nutrition: { calories: 280, protein: 16, carbs: 48, fat: 3 },
    ingredients: [
      "Lentejas rojas y verdes",
      "Zanahorias cortadas en cubos",
      "Apio fresco",
      "Espinacas tiernas",
      "Caldo de verduras casero",
      "Especias mediterráneas",
    ],
  },
  {
    id: "4",
    name: "Wrap de Hummus y Aguacate",
    description:
      "Un wrap ligero y sabroso, relleno de hummus cremoso, aguacate, espinacas, pimientos y un toque de salsa picante.",
    image: "/assets/images/results/WrapHummusAguacate.png",
    nutrition: { calories: 380, protein: 14, carbs: 45, fat: 18 },
    ingredients: [
      "Tortilla integral suave",
      "Hummus cremoso casero",
      "Aguacate fresco en rodajas",
      "Espinacas baby",
      "Pimientos rojos asados",
      "Salsa picante artesanal",
    ],
  },
]

export default function MenuPersonalizadoResultados() {
  const router = useRouter()
  const [selectedDish, setSelectedDish] = useState<(typeof menuOptions)[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleDishClick = (dish: (typeof menuOptions)[0]) => {
    setSelectedDish(dish)
    setIsModalOpen(true)
  }

  const handleAddToCart = () => {
    // Aquí iría la lógica para añadir al carrito
    setIsModalOpen(false)
    // Mostrar notificación de éxito
  }

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tu Menú Personalizado</h1>
          <p className="text-gray-600">
            Disfruta de opciones saludables y deliciosas, diseñadas especialmente para ti.
          </p>
        </motion.div>

        {/* Menu Options */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Opciones de Menú</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuOptions.map((dish, index) => (
              <DishCard
                key={dish.id}
                id={dish.id}
                name={dish.name}
                description={dish.description}
                image={dish.image}
                onClick={() => handleDishClick(dish)}
                index={index}
              />
            ))}
          </div>
        </motion.section>
      </div>

      {/* Nutrition Modal */}
      <NutritionModal
        dish={selectedDish}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}

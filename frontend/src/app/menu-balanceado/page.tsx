"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { DishCard } from "@/components/dish-card"
import { NutritionModal } from "@/components/nutrition-modal"
import { FilterDropdown } from "@/components/filter-dropdown"
import { AnimatedButton } from "@/components/animated-button"
import { OrderModal } from "@/components/OrderModal"

const randomDishes = [
  {
    id: "1",
    name: "Ensalada de Quinoa y Aguacate",
    description: "Quinoa, aguacate, tomate, pepino, aderezo de limón",
    image: "/assets/images/completos/EnsaladaQuinoaAguacate.png",
    nutrition: { calories: 320, protein: 12, carbs: 45, fat: 12 },
    ingredients: ["Quinoa cocida", "Aguacate fresco", "Tomates cherry", "Pepino", "Aderezo de limón"],
  },
  {
    id: "2",
    name: "Tacos de Pescado con Salsa de Mango",
    description: "Pescado blanco, tortillas de maíz, salsa de mango, col morada",
    image: "/assets/images/completos/TacosPescadoSalsaMango.png",
    nutrition: { calories: 380, protein: 28, carbs: 42, fat: 12 },
    ingredients: ["Pescado blanco a la plancha", "Tortillas de maíz", "Salsa de mango fresca", "Col morada"],
  },
  {
    id: "3",
    name: "Curry de Pollo con Arroz Basmati",
    description: "Pollo, leche de coco, curry, arroz basmati",
    image: "/assets/images/completos/CurryPolloArrozBasmati.png",
    nutrition: { calories: 450, protein: 32, carbs: 48, fat: 16 },
    ingredients: ["Pollo tierno", "Leche de coco", "Especias de curry", "Arroz basmati"],
  },
  {
    id: "4",
    name: "Sopa de Lentejas y Verduras",
    description: "Lentejas, zanahoria, apio, caldo de verduras",
    image: "/assets/images/results/SopaLentejasVerduras.png",
    nutrition: { calories: 280, protein: 16, carbs: 48, fat: 3 },
    ingredients: ["Lentejas rojas", "Zanahorias", "Apio", "Caldo de verduras casero"],
  },
  {
    id: "5",
    name: "Hamburguesa Vegana con Batatas Fritas",
    description: "Hamburguesa de lentejas, pan integral, batatas fritas",
    image: "/assets/images/completos/HamburguesaVeganaBatatasFritas.png",
    nutrition: { calories: 420, protein: 18, carbs: 58, fat: 14 },
    ingredients: ["Hamburguesa de lentejas", "Pan integral", "Batatas al horno", "Vegetales frescos"],
  },
  {
    id: "6",
    name: "Pasta con Salsa de Pesto y Tomates Cherry",
    description: "Pasta integral, pesto, tomates cherry, parmesano",
    image: "/assets/images/completos/PastaSalsaPestoTomatesCherry.png",
    nutrition: { calories: 380, protein: 14, carbs: 52, fat: 14 },
    ingredients: ["Pasta integral", "Pesto casero", "Tomates cherry", "Queso parmesano"],
  },
]

const popularDishes = [
  {
    id: "7",
    name: "Pizza Margarita",
    description: "Salsa de tomate, mozzarella, albahaca fresca",
    image: "/assets/images/completos/PizzaMargarita.png",
    rating: 4.8,
    nutrition: { calories: 350, protein: 16, carbs: 45, fat: 12 },
    ingredients: ["Masa artesanal", "Salsa de tomate", "Mozzarella fresca", "Albahaca"],
  },
  {
    id: "8",
    name: "Sushi Variado",
    description: "Nigiri, maki, sashimi",
    image: "/assets/images/completos/SushiVariado.png",
    rating: 4.9,
    nutrition: { calories: 280, protein: 24, carbs: 32, fat: 6 },
    ingredients: ["Arroz para sushi", "Pescado fresco", "Nori", "Wasabi"],
  },
  {
    id: "9",
    name: "Paella de Mariscos",
    description: "Arroz, mariscos variados, azafrán",
    image: "/assets/images/completos/PaellaMariscos.png",
    rating: 4.7,
    nutrition: { calories: 420, protein: 28, carbs: 48, fat: 12 },
    ingredients: ["Arroz bomba", "Mariscos frescos", "Azafrán", "Caldo de pescado"],
  },
  {
    id: "10",
    name: "Tarta de Manzana",
    description: "Manzanas, canela, masa quebrada",
    image: "/assets/images/completos/TartaManzana.png",
    rating: 4.6,
    nutrition: { calories: 320, protein: 4, carbs: 58, fat: 12 },
    ingredients: ["Manzanas frescas", "Canela", "Masa quebrada", "Azúcar moreno"],
  },
]

const topRatedDishes = [
  {
    id: "11",
    name: "Lasagna de Carne",
    description: "Carne molida, salsa bechamel, pasta, queso",
    image: "/assets/images/completos/LasagnaCarne.png",
    rating: 1.9,
    nutrition: { calories: 480, protein: 28, carbs: 42, fat: 22 },
    ingredients: ["Carne molida", "Salsa bechamel", "Pasta fresca", "Queso"],
  },
  {
    id: "12",
    name: "Salmón a la Parrilla",
    description: "Salmón, limón, hierbas aromáticas",
    image: "/assets/images/completos/SalmonParrilla.png",
    rating: 4.8,
    nutrition: { calories: 380, protein: 32, carbs: 8, fat: 24 },
    ingredients: ["Salmón fresco", "Limón", "Hierbas aromáticas", "Aceite de oliva"],
  },
  {
    id: "13",
    name: "Tiramisú",
    description: "Bizcocho, café, mascarpone, cacao",
    image: "/assets/images/completos/Tiramisu.png",
    rating: 4.7,
    nutrition: { calories: 420, protein: 8, carbs: 48, fat: 22 },
    ingredients: ["Bizcocho de soletilla", "Café espresso", "Mascarpone", "Cacao en polvo"],
  },
  {
    id: "14",
    name: "Ensalada César",
    description: "Lechuga romana, crutones, aderezo césar",
    image: "/assets/images/completos/EnsaladaCesar.png",
    rating: 4.5,
    nutrition: { calories: 280, protein: 12, carbs: 18, fat: 18 },
    ingredients: ["Lechuga romana", "Crutones caseros", "Aderezo césar", "Parmesano"],
  },
]

// Opciones de filtro
const ingredientOptions = [
  { id: "Quinoa cocida", label: "Quinoa" },
  { id: "Aguacate fresco", label: "Aguacate" },
  { id: "Tomates cherry", label: "Tomates" },
  { id: "Pepino", label: "Pepino" },
  { id: "Aderezo de limón", label: "Aderezo" },
  // Agrega más según los ingredientes de tus platos...
]

const ratingOptions = [
  { id: "4-5", label: "4-5 estrellas" },
  { id: "3-4", label: "3-4 estrellas" },
  { id: "2-3", label: "2-3 estrellas" },
]
function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function MenuBalanceadoPage() {
  const router = useRouter()
  const [displayedRandomDishes, setDisplayedRandomDishes] = useState(randomDishes)
  const [selectedDish, setSelectedDish] = useState<any>(null)
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<string[]>([])

  const filterDish = (dish: any): boolean => {
    const ingredientMatch =
      selectedIngredients.length === 0 ||
      dish.ingredients.some((ing: string) => selectedIngredients.includes(ing))
    
    let ratingMatch = true
    if (selectedRatings.length > 0 && dish.rating) {
      ratingMatch = selectedRatings.some((range) => {
        const [min, max] = range.split("-").map(Number)
        return dish.rating >= min && dish.rating <= max
      })
    }
    return ingredientMatch && ratingMatch
  }

  const filteredRandomDishes = displayedRandomDishes.filter(filterDish)
  const filteredPopularDishes = popularDishes.filter(filterDish)
  const filteredTopRatedDishes = topRatedDishes.filter(filterDish)

  const handleDishClick = (dish: any) => {
    setSelectedDish(dish)
    setIsNutritionModalOpen(true)
  }

  // En NutritionModal, el botón "Seleccionar Menu" (onAddToCart) ahora abre el OrderModal
  const handleSelectMenu = () => {
    setIsNutritionModalOpen(false)
    setIsOrderModalOpen(true)
  }

  // Callback al realizar el pedido desde OrderModal
  const handlePlaceOrder = (orderDetails: { quantity: number; code: string }) => {
    setIsOrderModalOpen(false)
    // Aquí puedes implementar la lógica de envío del pedido
    console.log("Pedido realizado:", orderDetails)
  }

  const handleGenerateNewDishes = () => {
    setDisplayedRandomDishes(shuffleArray(randomDishes))
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Descubre tu próximo plato favorito</h1>
          <p className="text-gray-600">Explora nuestra selección de platos balanceados y deliciosos</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-wrap gap-4">
            <FilterDropdown
              title="Ingredientes"
              options={ingredientOptions}
              selectedOptions={selectedIngredients}
              onSelectionChange={setSelectedIngredients}
            />
            <FilterDropdown
              title="Calificaciones"
              options={ratingOptions}
              selectedOptions={selectedRatings}
              onSelectionChange={setSelectedRatings}
            />
          </div>
        </motion.div>

        {/* Random Dishes */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Platos Aleatorios</h2>
            <motion.div
              animate={{
                background: [
                  "linear-gradient(90deg, #4e029d, #3b82f6, #ef4444)",
                  "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)",
                  "linear-gradient(90deg, #ef4444, #4e029d, #3b82f6)",
                ],
                backgroundSize: "200% 200%",
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{ borderRadius: "9999px", padding: 0 }}
              className="w-auto"
            >
              <AnimatedButton
                onClick={handleGenerateNewDishes}
                className="bg-transparent text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl transition-colors duration-300 backdrop-blur-[6px] w-full"
              >
                <div className="flex items-center gap-2">
                  Generar Nuevos Platos
                </div>
              </AnimatedButton>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRandomDishes.map((dish, index) => (
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

        {/* Popular Dishes */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Platos Populares</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPopularDishes.map((dish, index) => (
              <DishCard
                key={dish.id}
                id={dish.id}
                name={dish.name}
                description={dish.description}
                image={dish.image}
                rating={dish.rating}

                onClick={() => handleDishClick(dish)}
                index={index}
              />
            ))}
          </div>
        </motion.section>

        {/* Top Rated Dishes */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Mejor Valorados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTopRatedDishes.map((dish, index) => (
              <DishCard
                key={dish.id}
                id={dish.id}
                name={dish.name}
                description={dish.description}
                image={dish.image}
                rating={dish.rating}
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
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
        onAddToCart={handleSelectMenu}
      />

      {/* Order Modal */}
      <OrderModal
        dishName={selectedDish?.name || ""}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  )
}
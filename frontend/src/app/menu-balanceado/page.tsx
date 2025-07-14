"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { DishCard } from "@/components/dish-card"
import { NutritionModal } from "@/components/nutrition-modal"
import { FilterDropdown } from "@/components/filter-dropdown"
import { AnimatedButton } from "@/components/animated-button"
import { OrderModal } from "@/components/OrderModal"

// Retorna una imagen aleatoria para el plato
function getRandomImage() {
  const images = [
    "/assets/images/completos/EnsaladaQuinoaAguacate.png",
    "/assets/images/completos/TacosPescadoSalsaMango.png",
    "/assets/images/completos/CurryPolloArrozBasmati.png",
    "/assets/images/results/SopaLentejasVerduras.png",
    "/assets/images/completos/HamburguesaVeganaBatatasFritas.png",
    "/assets/images/completos/PastaSalsaPestoTomatesCherry.png",
    "/assets/images/completos/PizzaMargarita.png",
    "/assets/images/completos/SushiVariado.png",
    "/assets/images/completos/PaellaMariscos.png",
    "/assets/images/completos/TartaManzana.png",
    "/assets/images/completos/LasagnaCarne.png",
    "/assets/images/completos/SalmonParrilla.png",
    "/assets/images/completos/Tiramisu.png",
    "/assets/images/completos/EnsaladaCesar.png"
  ]
  return images[Math.floor(Math.random() * images.length)]
}

// Función para obtener ranking desde la BD para un plato dado.
// Se asume que el endpoint GET /api/ranking?dishName=... está implementado
async function fetchRanking(dishName: string) {
  try {
    const res = await fetch(`/api/ranking?dishName=${encodeURIComponent(dishName)}`)
    if (!res.ok) return null
    return await res.json() // Se espera: { avg, count }
  } catch (error) {
    console.error(`Error fetching ranking for ${dishName}:`, error)
    return null
  }
}

export default function MenuBalanceadoPage() {
  const router = useRouter()
  const [dishes, setDishes] = useState<any[]>([])
  const [selectedDish, setSelectedDish] = useState<any>(null)
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<string[]>([])

  // Obtiene platos nuevos desde el backend (CSV)
  async function fetchDishes(nPlatos = 3) {
    try {
      const res = await fetch(`/api/menus/complete?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n_platos: nPlatos })
      })
      if (!res.ok) throw new Error("Error al obtener platos desde el backend")
      const data = await res.json()
      // Por cada plato, se obtiene ranking desde la BD y se une a la información del plato
      const transformed = await Promise.all(
        data.dishes.map(async (dish: any, index: number) => {
          const baseDish = {
            id: String(index + 1),
            name: dish.dish_name,
            description: dish.dish_name,
            image: getRandomImage(),
            rating: null, // Se actualizará si hay ranking previo
            reviewCount: 0, // Contador de reseñas
            nutrition: dish.items && dish.items[0]
              ? {
                  calories: dish.items[0].energy,
                  protein: dish.items[0].protein,
                  carbs: dish.items[0].carbs,
                  fat: dish.items[0].fat
                }
              : { calories: 0, protein: 0, carbs: 0, fat: 0 },
            ingredients: dish.items ? dish.items.map((i: any) => i.name) : []
          }
          const ranking = await fetchRanking(dish.dish_name)
          if (ranking) {
            baseDish.rating = ranking.avg
            baseDish.reviewCount = ranking.count
          }
          return baseDish
        })
      )
      setDishes(transformed)
    } catch (error) {
      console.error("Error al cargar platos del CSV:", error)
    }
  }

  useEffect(() => {
    fetchDishes(6)
  }, [])

  const handleGenerateNewDishes = () => {
    fetchDishes(6)
  }

const filterDish = (dish: any): boolean => {
  const ingredientMatch =
    selectedIngredients.length === 0 ||
    dish.ingredients.some((ing: string) => selectedIngredients.includes(ing))
  let ratingMatch = true
  if (selectedRatings.length > 0) {
    // Si no hay rating, se descarta
    if (dish.rating == null) return false
    const numericRating = Number(dish.rating)
    ratingMatch = selectedRatings.some((range) => {
      const [min, max] = range.split("-").map(Number)
      return numericRating >= min && numericRating <= max
    })
  }
  return ingredientMatch && ratingMatch
}

  const filteredDishes = dishes.filter(filterDish)
  // Secciones adicionales: Top Rated y Popular Dishes
  const topRatedDishes = dishes.filter(d => d.rating != null && d.rating >= 4)
  // Aquí definimos “populares” como aquellos con al menos 1 reseña; ajusta la lógica según tu criterio
  const popularDishes = dishes.filter(d => d.reviewCount >= 1)

  const handleDishClick = (dish: any) => {
    setSelectedDish(dish)
    setIsNutritionModalOpen(true)
  }

  const handleSelectMenu = () => {
    setIsNutritionModalOpen(false)
    setIsOrderModalOpen(true)
  }

  const handlePlaceOrder = async (orderDetails: { quantity: number; code: string }) => {
    try {
      const orderData = {
        dish_id: selectedDish.id,
        quantity: orderDetails.quantity,
        code: orderDetails.code,
        datetime: new Date().toISOString()
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      })
      if (!res.ok) throw new Error(`Error en la API: ${res.status}`)
      console.log("Pedido realizado:", orderData)
      setIsOrderModalOpen(false)
    } catch (error) {
      console.error("Error al registrar el pedido:", error)
    }
  }

  // Ahora, usando dish.name para identificar y actualizar el promedio y la cantidad de reseñas
  const handleRatingChange = async (dishId: string, newRating: number) => {
    const dish = dishes.find((d) => d.id === dishId)
    if (!dish) return;
    console.log("handleRatingChange llamado para dish:", dish.name, "nuevo rating:", newRating);
    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: dish.name, rating: newRating })
      });
      console.log("response status:", res.status);
      if (!res.ok) throw new Error("Error al actualizar ranking");
      const data = await res.json(); // { avg, count }
      console.log("Respuesta ranking:", data);
      // Actualizar el plato en la lista con el nuevo promedio y cantidad de reseñas
      const updatedDishes = dishes.map((d) =>
        d.id === dishId ? { ...d, rating: data.avg, reviewCount: data.count } : d
      );
      setDishes(updatedDishes);
    } catch (error) {
      console.error("Error al actualizar ranking:", error);
    }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Descubre tu próximo plato favorito
          </h1>
          <p className="text-gray-600">
            Explora nuestra selección de platos balanceados y deliciosos
          </p>
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
              options={[
                { id: "Quinoa cocida", label: "Quinoa" },
                { id: "Aguacate fresco", label: "Aguacate" },
                { id: "Tomates cherry", label: "Tomates" },
                { id: "Pepino", label: "Pepino" },
                { id: "Aderezo de limón", label: "Aderezo" }
              ]}
              selectedOptions={selectedIngredients}
              onSelectionChange={setSelectedIngredients}
            />
            <FilterDropdown
              title="Calificaciones"
              options={[
                { id: "4-5", label: "4-5 estrellas" },
                { id: "3-4", label: "3-4 estrellas" },
                { id: "2-3", label: "2-3 estrellas" }
              ]}
              selectedOptions={selectedRatings}
              onSelectionChange={setSelectedRatings}
            />
          </div>
        </motion.div>
        {/* Sección: Platos Aleatorios */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Platos Aleatorios</h2>
            <motion.div
              className="w-auto"
              animate={{
                background: [
                  "linear-gradient(90deg, #4e029d, #3b82f6, #ef4444)",
                  "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)",
                  "linear-gradient(90deg, #ef4444, #4e029d, #3b82f6)"
                ],
                backgroundSize: "200% 200%",
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{ borderRadius: "9999px", padding: 0 }}
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
            {filteredDishes.map((dish, index) => (
  <DishCard
    key={dish.id}
    id={dish.id}
    name={dish.name}
    description={dish.description}
    image={dish.image}
    rating={dish.rating} // <-- Agregado
    onClick={() => handleDishClick(dish)}
    onRatingChange={(newRating: number) => handleRatingChange(dish.id, newRating)}
    index={index}
    reviewCount={dish.reviewCount}
  />
))}
          </div>
        </motion.section>
        {/* Sección: Platos Populares */}
        {popularDishes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Platos Populares</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {popularDishes.map((dish, index) => (
               <DishCard
    key={dish.id}
    id={dish.id}
    name={dish.name}
    description={dish.description}
    image={dish.image}
    rating={dish.rating} // <-- Agregado
    onClick={() => handleDishClick(dish)}
    onRatingChange={(newRating: number) => handleRatingChange(dish.id, newRating)}
    index={index}
    reviewCount={dish.reviewCount}
  />
))}
            </div>
          </motion.section>
        )}
        {/* Sección: Top Rated Dishes */}
        {topRatedDishes.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Platos Mejor Valorados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {topRatedDishes.map((dish, index) => (
                <DishCard
    key={dish.id}
    id={dish.id}
    name={dish.name}
    description={dish.description}
    image={dish.image}
    rating={dish.rating} // <-- Agregado
    onClick={() => handleDishClick(dish)}
    onRatingChange={(newRating: number) => handleRatingChange(dish.id, newRating)}
    index={index}
    reviewCount={dish.reviewCount}
  />
))}
            </div>
          </motion.section>
        )}
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
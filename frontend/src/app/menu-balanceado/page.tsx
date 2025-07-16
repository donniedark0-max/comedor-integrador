"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { DishCard } from "@/components/dish-card"
import { NutritionModal } from "@/components/nutrition-modal"
import { FilterDropdown } from "@/components/filter-dropdown"
import { AnimatedButton } from "@/components/animated-button"
import { OrderModal } from "@/components/OrderModal"
import { OrderStatusModal } from "@/components/OrderStatusModal" 

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
    "/assets/images/completos/EnsaladaCesar.png",
    "/assets/images/results/EnsaladaMediterranea.png",
    "/assets/images/results/WrapHummusAguacate.png",
    "/assets/images/results/PolloLimonQuinoa.png",
  ]
  return images[Math.floor(Math.random() * images.length)]
}

async function fetchRanking(dishName: string) {
  try {
    const res = await fetch(`/api/ranking?dishName=${encodeURIComponent(dishName)}`)
    if (!res.ok) return null
    return await res.json()
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
 const [orderStatusModalOpen, setOrderStatusModalOpen] = useState(false)
  const [orderStatusMessage, setOrderStatusMessage] = useState("")

  async function fetchDishes(nPlatos = 3) {
  try {
    const res = await fetch(`/api/menus/complete?t=${Date.now()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n_platos: nPlatos })
    })
    if (!res.ok) throw new Error("Error al obtener platos desde el backend")
    const data = await res.json()
    console.log("JSON recibido desde /api/menus/complete:", data)
    // Asigna la imagen de forma dinámica (no proveniente de la BD)
    const transformed = await Promise.all(
      data.dishes.map(async (dish: any, index: number) => {
        const baseDish = {
          id: String(index + 1),
          name: dish.name,
          description: dish.name, // o usa la propiedad que prefieras
          image: getRandomImage(),
          rating: null,
          reviewCount: 0,
          // Usar dish.nutrition en lugar de dish.items
          nutrition: dish.nutrition ? dish.nutrition : { calories: 0, protein: 0, carbs: 0, fat: 0 },
          // Usar dish.ingredients en lugar de dish.items
          ingredients: dish.ingredients ? dish.ingredients : []
        }
        const ranking = await fetchRanking(dish.name)
        if (ranking) {
          baseDish.rating = ranking.avg
          baseDish.reviewCount = ranking.count
        }
        return baseDish
      })
    )
    console.log("Objetos transformados:", transformed)
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
  const topRatedDishes = dishes.filter(d => d.rating != null && d.rating >= 4)
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
        dish_id: selectedDish.name,
        quantity: orderDetails.quantity,
        code: orderDetails.code,
        datetime: new Date().toISOString()
      }
      const res = await fetch('/api/orders', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      })
      if (!res.ok) throw new Error(`Error en la API: ${res.status}`)
      console.log("Pedido realizado:", orderData)
      // Mostrar modal de estado en lugar de alert
      setOrderStatusMessage("Tu pedido ha sido recibido y se encuentra en proceso.")
      setOrderStatusModalOpen(true)
      setIsOrderModalOpen(false)
    } catch (error) {
      console.error("Error al registrar el pedido:", error)
      setOrderStatusMessage("Error al registrar el pedido, intenta nuevamente.")
      setOrderStatusModalOpen(true)
    }
  }

  const handleRatingChange = async (dishId: string, newRating: number) => {
    const dish = dishes.find((d) => d.id === dishId)
    if (!dish) return;
    console.log("handleRatingChange llamado para dish:", dish.name, "nuevo rating:", newRating)
    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: dish.name, rating: newRating })
      })
      console.log("response status:", res.status)
      if (!res.ok) throw new Error("Error al actualizar ranking")
      const data = await res.json()
      console.log("Respuesta ranking:", data)
      const updatedDishes = dishes.map((d) =>
        d.id === dishId ? { ...d, rating: data.avg, reviewCount: data.count } : d
      )
      setDishes(updatedDishes)
    } catch (error) {
      console.error("Error al actualizar ranking:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
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
                rating={dish.rating}
                onClick={() => handleDishClick(dish)}
                onRatingChange={(newRating: number) => handleRatingChange(dish.id, newRating)}
                index={index}
                reviewCount={dish.reviewCount}
              />
            ))}
          </div>
        </motion.section>
        
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
                  rating={dish.rating}
                  onClick={() => handleDishClick(dish)}
                  onRatingChange={(newRating: number) => handleRatingChange(dish.id, newRating)}
                  index={index}
                  reviewCount={dish.reviewCount}
                />
              ))}
            </div>
          </motion.section>
        )}
        
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
                  rating={dish.rating}
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
      
      <NutritionModal
        dish={selectedDish}
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
        onAddToCart={handleSelectMenu}
      />
      
      <OrderModal
        dishName={selectedDish?.name || ""}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onPlaceOrder={handlePlaceOrder}
      />
    <OrderStatusModal
        isOpen={orderStatusModalOpen}
        message={orderStatusMessage}
        onClose={() => setOrderStatusModalOpen(false)}
      />
    </div>
  )
}
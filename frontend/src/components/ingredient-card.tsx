"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Plus, Minus } from "lucide-react"


interface IngredientCardProps {
  name: string
  calories: number
  image: string
  isSelected: boolean
  onToggle: () => void
  index: number
}

export function IngredientCard({ name, calories, image, isSelected, onToggle, index }: IngredientCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
          isSelected ? "ring-4 ring-blue-500 shadow-2xl bg-blue-50" : "hover:shadow-lg"
        }`}
        onClick={onToggle}
      >
        <div className="aspect-square relative">
          <img src={image || "/placeholder.svg"} alt={name} className="object-cover" />
          <motion.div
            className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent`}
            initial={false}
            animate={{ opacity: isSelected ? 1 : 0.7 }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm opacity-90">{calories} kcal</p>
          </div>
          <motion.div
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center ${
              isSelected ? "bg-red-500" : "bg-green-500"
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
          </motion.div>
        </div>
      </Card>
    </motion.div>
  )
}

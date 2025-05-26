"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import Image from "next/image"

interface DishCardProps {
  id: string
  name: string
  description: string
  image: string
  rating?: number
  isPopular?: boolean
  onClick: () => void
  index: number
}

export function DishCard({ id, name, description, image, rating, isPopular, onClick, index }: DishCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 relative group">
        {isPopular && (
          <motion.div
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            className="absolute top-4 left-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 text-sm font-semibold z-10 rounded-r-full"
          >
            Popular
          </motion.div>
        )}
        <div className="aspect-[4/3] relative overflow-hidden">
          <Image
            src={image || "/placeholder.svg"}
            alt={name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
            {rating && (
              <div className="flex items-center gap-1 ml-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{rating}</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

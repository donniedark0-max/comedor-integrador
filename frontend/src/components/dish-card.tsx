"use client"

import { useState, useEffect } from "react"
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
  reviewCount?: number
  onClick: () => void
  onRatingChange?: (newRating: number) => void
  index: number
  isPopular?: boolean
}

interface InteractiveStarRatingProps {
  initialRating?: number
  onRatingChange: (rating: number) => void
}

function InteractiveStarRating({
  initialRating = 0,
  onRatingChange
}: InteractiveStarRatingProps) {
  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(0)

  // Sincroniza el estado interno cuando initialRating cambia
  useEffect(() => {
    setRating(initialRating)
  }, [initialRating])

  const getStarType = (starIndex: number) => {
    const current = hoverRating || rating
    if (current >= starIndex) return "full"
    if (current >= starIndex - 0.5) return "half"
    return "empty"
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>, starIndex: number) => {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - left
    const newHoverRating = x < width / 2 ? starIndex - 0.5 : starIndex
    setHoverRating(newHoverRating)
  }

  const handleMouseLeave = () => {
    setHoverRating(0)
  }

  const handleClick = (starValue: number) => {
    setRating(starValue)
    onRatingChange(starValue)
  }

  const renderStar = (starIndex: number) => {
    const type = getStarType(starIndex)
    if (type === "full") {
      return <Star className="w-6 h-6 text-yellow-500" />
    } else if (type === "half") {
      return (
        <div className="relative w-6 h-6">
          <Star className="w-6 h-6 text-gray-300" />
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      )
    } else {
      return <Star className="w-6 h-6 text-gray-300" />
    }
  }

  return (
    <div className="flex space-x-1" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((starIndex) => (
        <span
          key={starIndex}
          className="cursor-pointer"
          onMouseMove={(e) => handleMouseMove(e, starIndex)}
          onClick={(e) => {
            e.stopPropagation()
            handleClick(hoverRating || starIndex)
          }}
        >
          {renderStar(starIndex)}
        </span>
      ))}
    </div>
  )
}

export function DishCard({
  id,
  name,
  description,
  image,
  rating,
  reviewCount,
  onClick,
  onRatingChange,
  index,
  isPopular
}: DishCardProps) {
  const [userRating, setUserRating] = useState(rating || 0)

  // Actualiza el estado cuando cambie la prop rating
  useEffect(() => {
    setUserRating(rating || 0)
  }, [rating])

  const handleRating = (newRating: number) => {
    setUserRating(newRating)
    if (onRatingChange) {
      onRatingChange(newRating)
    }
  }

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
          <Image src={image || "/placeholder.svg"} alt={name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
            {(userRating > 0 || reviewCount) && (
              <div className="flex items-center gap-1 ml-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">
                  {userRating > 0 ? userRating.toFixed(1) : "-"} {reviewCount ? `(${reviewCount} reseña${reviewCount > 1 ? "s" : ""})` : ""}
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
          <div className="mt-2">
            <InteractiveStarRating initialRating={userRating} onRatingChange={handleRating} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
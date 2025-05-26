"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ShoppingCart, X } from "lucide-react"

interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface DishDetails {
  id: string
  name: string
  description: string
  nutrition: NutritionInfo
  ingredients: string[]
  image: string
}

interface NutritionModalProps {
  dish: DishDetails | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: () => void
}

export function NutritionModal({ dish, isOpen, onClose, onAddToCart }: NutritionModalProps) {
  if (!dish) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="relative">
                <motion.button
                  onClick={onClose}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
                <DialogTitle className="text-2xl font-bold pr-8">{dish.name}</DialogTitle>
                <p className="text-gray-600 mt-2">{dish.description}</p>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <h3 className="text-lg font-semibold mb-4">Información Nutricional</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Calorías", value: `${dish.nutrition.calories} kcal`, color: "bg-blue-500" },
                      { label: "Proteínas", value: `${dish.nutrition.protein}g`, color: "bg-green-500" },
                      { label: "Carbohidratos", value: `${dish.nutrition.carbs}g`, color: "bg-orange-500" },
                      { label: "Grasas", value: `${dish.nutrition.fat}g`, color: "bg-purple-500" },
                    ].map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="font-medium text-gray-700">{item.label}</span>
                        </div>
                        <span className="font-bold text-lg">{item.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="ingredients">
                      <AccordionTrigger className="text-lg font-semibold">Descripción de los Platos</AccordionTrigger>
                      <AccordionContent>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="space-y-3"
                        >
                          {dish.ingredients.map((ingredient, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center gap-2"
                            >
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-gray-700">{ingredient}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center pt-4"
                >
                  <Button
                    onClick={onAddToCart}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <motion.div
                      className="flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Seleccionar Menu
                    </motion.div>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}

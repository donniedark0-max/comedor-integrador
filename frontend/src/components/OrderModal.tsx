"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"


interface OrderModalProps {
  dishName: string
  isOpen: boolean
  onClose: () => void
  onPlaceOrder: (orderDetails: { quantity: number; code: string }) => void
}

export function OrderModal({ dishName, isOpen, onClose, onPlaceOrder }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [code, setCode] = useState("")
  const [isCodeValid, setIsCodeValid] = useState(false)

  useEffect(() => {
    const regex = /^U\d{8}$/
    setIsCodeValid(regex.test(code))
  }, [code])

  // Reiniciar los estados cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1)
      setCode("")
    }
  }, [isOpen])

  const increment = () => setQuantity(quantity + 1)
  const decrement = () => {
    if (quantity > 1) setQuantity(quantity - 1)
  }

  const handlePlaceOrder = () => {
    if (isCodeValid) {
      onPlaceOrder({ quantity, code })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-md mx-auto rounded-2xl p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="relative mb-4">
                <DialogTitle className="text-2xl font-bold">{dishName}</DialogTitle>
                
              </DialogHeader>
              <div>
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={decrement}
                    className="w-10 h-10 rounded-full bg-gray-300 text-xl font-bold disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    –
                  </button>
                  <span className="text-2xl font-semibold">{quantity}</span>
                  <button
                    onClick={increment}
                    className="w-10 h-10 rounded-full bg-gray-300 text-xl font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ingresa tu codigo. Ejm U19308437"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mt-6">
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={!isCodeValid}
                    className={`w-full py-3 rounded-md font-semibold ${
                      isCodeValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                    } text-white`}
                  >
                    Realizar Pedido
                  </Button>
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
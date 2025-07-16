"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface OrderStatusModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export function OrderStatusModal({ isOpen, message, onClose }: OrderStatusModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-sm mx-auto rounded-2xl p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold">Información del Pedido</DialogTitle>
              </DialogHeader>
              <p>{message}</p>
              <button
                onClick={onClose}
                className="mt-4 w-full py-2 rounded-md bg-blue-600 text-white"
              >
                Cerrar
              </button>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: "default" | "secondary" | "outline"
  className?: string
  disabled?: boolean
}

export function AnimatedButton({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled = false,
}: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Button
        onClick={onClick}
        variant={variant}
        className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}
        disabled={disabled}
      >
        {children}
      </Button>
    </motion.div>
  )
}

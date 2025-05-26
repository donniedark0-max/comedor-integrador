"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface FilterOption {
  id: string
  label: string
  count?: number
}

interface FilterDropdownProps {
  title: string
  options: FilterOption[]
  selectedOptions: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

export function FilterDropdown({ title, options, selectedOptions, onSelectionChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleOptionToggle = (optionId: string) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter((id) => id !== optionId)
      : [...selectedOptions, optionId]
    onSelectionChange(newSelection)
  }

  return (
    <div className="relative">
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
            selectedOptions.length > 0 ? "bg-blue-50 border-blue-300 text-blue-700" : "hover:shadow-md"
          }`}
        >
          <Filter className="w-4 h-4" />
          {title}
          {selectedOptions.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
            >
              {selectedOptions.length}
            </motion.span>
          )}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4"
          >
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {options.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleOptionToggle(option.id)}
                >
                  <Checkbox
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleOptionToggle(option.id)}
                  />
                  <span className="flex-1 text-sm font-medium">{option.label}</span>
                  {option.count && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{option.count}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

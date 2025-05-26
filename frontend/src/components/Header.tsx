'use client'

import { motion } from 'framer-motion'
import { Utensils } from 'lucide-react'
import { AnimatedButton } from '@/components/animated-button'
import { useRouter } from 'next/navigation'
// Asegúrate de que la ruta a AnimatedButton sea correcta

export default function LandingHeader() {
  const router = useRouter();

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 flex items-center border-b border-gray-300 justify-between p-6"
    >
      <div className="flex items-center gap-2">
        <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
          <Utensils className="w-8 h-8 text-black" />
        </motion.div>
        <span className="text-2xl font-bold text-black">Campus Eats</span>
      </div>
      <nav className="hidden md:flex items-center gap-6 text-black">
        <a href="/" className="hover:text-blue-600 transition-colors">
          Inicio
        </a>
        <a href="/menu-balanceado" className="hover:text-blue-600 transition-colors">
          Menú Balanceado
        </a>
        <a href="#" className="hover:text-blue-600 transition-colors">
          Contacto
        </a>
        <AnimatedButton
          variant="secondary"
          className="bg-blue-600 hover:bg-blue-700 rounded-full text-white border-0"
          onClick={() => router.push('/login')} // Ejemplo si necesitaras navegación
        >
          Iniciar Sesión
        </AnimatedButton>
      </nav>
    </motion.header>
  )
}
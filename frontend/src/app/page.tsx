"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { AnimatedButton } from "@/components/animated-button"
import { Utensils, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"

export default function HomePage() {
  const router = useRouter()
const images = [
    "/assets/images/cafeteria-bg1.png",
    "/assets/images/cafeteria-bg2.png",
    "/assets/images/cafeteria-bg3.png",
    "/assets/images/cafeteria-bg4.png",
  ]
    const [currentImage, setCurrentImage] = useState(images[0])

    useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * images.length)
      setCurrentImage(images[randomIndex])
    }, 15000) 
    return () => clearInterval(interval)
  }, [images])
  return (
    <div className="min-h-screen bg-gray-50">
     
     <div className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-[30px] overflow-hidden shadow-2xl min-h-[600px]">
            {/* Fondo con animación de blur */}
            <motion.div
              key={currentImage}
              initial={{ opacity: 0, filter: "blur(20px)" }}
              animate={{ opacity: 2, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(20px)" }}
              transition={{ duration: 2 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${currentImage})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center min-h-[600px] px-8">
              <div className="text-center max-w-4xl">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mb-8"
                >
                  <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                    Comidas Universitarias
                    <motion.span
                      className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.8 }}
                    >
                      Personalizadas
                    </motion.span>
                  </h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                    className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed"
                  >
                    Descubre menús balanceados y adaptados a tus preferencias cumpliendo los requerimientos nutricionales.
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.1 }}
                  className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                >
                  <motion.div
                    animate={{
                      background: [
                        "linear-gradient(90deg, #2563eb, #9333ea, #06b6d4)",
                        "linear-gradient(90deg, #9333ea, #facc15, #2563eb)",
                        "linear-gradient(90deg, #06b6d4, #2563eb, #9333ea)",
                      ],
                      backgroundSize: "200% 200%",
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    style={{
                      borderRadius: "9999px",
                      padding: 0,
                   
                    }}
                    className="w-full"
                  >
                    <AnimatedButton
                      onClick={() => router.push("/menu-personalizado")}
                      className="bg-transparent text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl transition-colors duration-300 backdrop-blur-[6px] w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-300 drop-shadow-glow" />
                        Generar Menú Personalizado
                      </div>
                    </AnimatedButton>
                  </motion.div>

                  <motion.div
                    animate={{
                      background: [
                        "linear-gradient(90deg, #fff, #523bf6, #9333ea)",
                        "linear-gradient(90deg, #523bf6, #9333ea, #facc15)",
                        "linear-gradient(90deg, #f6b03b, #facc15, #f6523b)",
                      ],
                      backgroundSize: "200% 200%",
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    style={{

                      borderRadius: "9999px",
                      padding: 0,
                    }}
                    className="w-full"
                  >
                    <AnimatedButton
                      onClick={() => router.push("/menu-balanceado")}
                      variant="secondary"
                      className="bg-white/82 backdrop-blur-sm border-0 text-gray-800  px-8 py-4 text-lg font-semibold rounded-full shadow-xl w-full"
                    >
                      <div className="flex items-center gap-2">
                        <Utensils className="w-5 h-5" />
                        Generar Menú Balanceado
                       </div>
                    </AnimatedButton>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-32 left-10 w-4 h-4 bg-blue-400 rounded-full opacity-60"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute top-52 right-20 w-6 h-6 bg-purple-400 rounded-full opacity-40"
        animate={{
          y: [0, 20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
      <motion.div
        className="absolute bottom-32 left-20 w-3 h-3 bg-yellow-400 rounded-full opacity-50"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 5,
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-5 h-5 bg-green-400 rounded-full opacity-70"
        animate={{
          y: [0, -105, 0],
          x: [0, -100, 0],
        }}
        transition={{
          duration: 9.5,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      />
     
    </div>
  )
}

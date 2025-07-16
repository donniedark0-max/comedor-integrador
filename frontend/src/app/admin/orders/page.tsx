"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface Order {
  _id: string
  dish: string
  datetime: string
  student: string
  code: string
  delivered: boolean
  quantity: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"pending" | "delivered">("pending")

  // Función para cargar pedidos desde la API
  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error("Error al cargar los pedidos")
      const data = await res.json()
      setOrders(data.orders)  // Se asume que la API retorna { orders: Order[] }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  // Polling para refrescar automáticamente la lista cada 5 segundos
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(() => {
      fetchOrders()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Función para actualizar el estado de un pedido (marcar como entregado)
  const markAsDelivered = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",  // o PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivered: true })
      })
      if (!res.ok) throw new Error("Error al actualizar el pedido")
      await fetchOrders()
    } catch (err) {
      console.error(err)
    }
  }

  // Separa los pedidos en pendientes y entregados
  const pendingOrders = orders.filter(order => !order.delivered)
  const deliveredOrders = orders.filter(order => order.delivered)

  // Función de renderizado para cada pedido (con número en columna izquierda)
  const renderOrderCard = (order: Order, orderNumber: number, isPending: boolean) => (
    <motion.div
      key={order._id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white flex rounded-[30px] border border-[#e2e8f0] shadow-sm overflow-hidden"
    >
      {/* Columna para el número de pedido */}
      <div className="bg-indigo-400 text-white flex items-center justify-center px-4">
        <p className="text-2xl font-bold">#{orderNumber}</p>
      </div>
      {/* Contenido del pedido */}
      <div className="p-6 flex-1">
        <p className="mb-1"><strong>Plato:</strong> {order.dish}</p>
        <p className="mb-1"><strong>Estudiante:</strong> {order.student}</p>
        <p className="mb-1"><strong>Código:</strong> {order.code}</p>
        <p className="mb-1"><strong>Fecha:</strong> {new Date(order.datetime).toLocaleString()}</p>
        <p className="mb-1">
          <strong>Estado:</strong>{" "}
          {isPending
            ? <span className="text-red-600 font-semibold">Pendiente</span>
            : <span className="text-green-600 font-semibold">Entregado</span>
          }
        </p>
      </div>
      {isPending && (
        <div className="p-6 flex flex-col items-center space-y-4">
          <p className="text-lg font-bold">Platos: {order.quantity}</p>
          <button
            onClick={() => markAsDelivered(order._id)}
            className="px-6 py-2 bg-blue-600 text-white rounded-[30px] hover:bg-blue-700"
          >
            Marcar como entregado
          </button>
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Pedidos</h1>
      {loading && <p></p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && orders.length === 0 && <p>No hay pedidos disponibles.</p>}

      {/* Tab list para elegir entre pedidos pendientes y entregados */}
      <div role="tablist" className="flex space-x-4 mb-6">
        <button
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 border-b-2 focus:outline-none ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pendientes ({pendingOrders.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'delivered'}
          onClick={() => setActiveTab('delivered')}
          className={`px-4 py-2 border-b-2 focus:outline-none ${
            activeTab === 'delivered'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Entregados ({deliveredOrders.length})
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingOrders.length === 0 && <p className="text-gray-500">No hay pedidos pendientes.</p>}
          {pendingOrders.map((order, index) => renderOrderCard(order, index + 1, true))}
        </div>
      )}

      {activeTab === "delivered" && (
        <div className="space-y-4">
          {deliveredOrders.length === 0 && <p className="text-gray-500">No hay pedidos entregados.</p>}
          {deliveredOrders.map((order, index) => renderOrderCard(order, index + 1, false))}
        </div>
      )}
    </div>
  )
}
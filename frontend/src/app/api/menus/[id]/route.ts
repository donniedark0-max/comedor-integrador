import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // Proxy la solicitud al backend FastAPI
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/${id}`)

    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al obtener detalle del menú:", error)
    return NextResponse.json({ error: "Error al obtener el detalle del menú" }, { status: 500 })
  }
}

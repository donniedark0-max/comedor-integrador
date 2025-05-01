import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Proxy la solicitud al backend FastAPI
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al generar menú:", error)
    return NextResponse.json({ error: "Error al generar el menú" }, { status: 500 })
  }
}

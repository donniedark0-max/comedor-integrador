import { type NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Proxy la solicitud al backend FastAPI
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status}`);
    }
    
    const backendData = await response.json();
    // backendData.dishes es un array con objetos de la forma:
    // { dish_name: string, items: [ { name, energy, protein, carbs, fat } ] }
    const transformed = backendData.dishes.map((dish: any) => {
      // Crear el objeto plato SIN el campo image (para no almacenarlo en la BD)
      return {
        name: dish.dish_name,
        description: dish.dish_name,
        rating: null,
        reviewCount: 0,
        nutrition: dish.items && dish.items[0]
          ? {
              calories: dish.items[0].energy,
              protein: dish.items[0].protein,
              carbs: dish.items[0].carbs,
              fat: dish.items[0].fat
            }
          : { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: dish.items ? dish.items.map((i: any) => i.name) : []
      };
    });
    
    // Insertar o actualizar cada plato en la colección "menu_balanceado" sin el campo image
    const client = await clientPromise;
    const db = client.db("menu_db");
    
    await Promise.all(
      transformed.map(async (plato: any) => {
        await db.collection("menu_balanceado").updateOne(
          { name: plato.name },
          { $set: plato },
          { upsert: true }
        );
      })
    );
    
    // Retornar los platos transformados sin imagen.
    // La presentación (frontend) asignará la imagen dinámicamente
    return NextResponse.json({ dishes: transformed });
    
  } catch (error) {
    console.error("Error al generar menú:", error);
    return NextResponse.json({ error: "Error al generar el menú" }, { status: 500 });
  }
}
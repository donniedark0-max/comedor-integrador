import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const IMAGES = [
  "/assets/images/completos/EnsaladaQuinoaAguacate.png",
  "/assets/images/completos/TacosPescadoSalsaMango.png",
  "/assets/images/completos/CurryPolloArrozBasmati.png",
  "/assets/images/results/SopaLentejasVerduras.png",
  "/assets/images/completos/HamburguesaVeganaBatatasFritas.png",
  "/assets/images/completos/PastaSalsaPestoTomatesCherry.png",
  "/assets/images/completos/PizzaMargarita.png",
  "/assets/images/completos/SushiVariado.png",
  "/assets/images/completos/PaellaMariscos.png",
  "/assets/images/completos/TartaManzana.png",
  "/assets/images/completos/LasagnaCarne.png",
  "/assets/images/completos/SalmonParrilla.png",
  "/assets/images/completos/Tiramisu.png",
  "/assets/images/completos/EnsaladaCesar.png"
];

function getRandomImage() {
  return IMAGES[Math.floor(Math.random() * IMAGES.length)];
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("menu_db");
    const platos = await db.collection("menu_balanceado").find({}).toArray();
    return NextResponse.json({ platos });
  } catch (error) {
    console.error("Error al obtener menú:", error);
    return NextResponse.json({ error: "Error al obtener menú" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Llamar al endpoint de FastAPI para obtener el menú completo
    const fastapiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menus/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text()
    });
    if (!fastapiRes.ok) {
      throw new Error(`Error en FastAPI: ${fastapiRes.status}`);
    }
    const backendData = await fastapiRes.json();
    // Se espera que backendData tenga la forma:
    // { "dishes": [ { dish_name: "...", items: [ { name, energy, carbs, protein, fat, grams } ] }, ... ] }
    
    const platos = backendData.dishes.map((dish: any, index: number) => {
      return {
        id: String(index + 1),
        name: dish.dish_name,
        description: dish.dish_name, // Puedes mejorar esto según tu lógica de negocio
        image: getRandomImage(),
        rating: null, // Se actualizará conforme se realicen pedidos o valoraciones
        nutrition: dish.items[0]
          ? { 
              calories: dish.items[0].energy, 
              protein: dish.items[0].protein, 
              carbs: dish.items[0].carbs, 
              fat: dish.items[0].fat 
            }
          : { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: dish.items.map((i: any) => i.name)
      }
    });

    const client = await clientPromise;
    const db = client.db("menu_db");
    const result = await db.collection("menu_balanceado").insertMany(platos);
    return NextResponse.json({ insertedCount: result.insertedCount });
  } catch (error) {
    console.error("Error al sembrar menú completo:", error);
    return NextResponse.json({ error: "Error al insertar el menú" }, { status: 500 });
  }
}
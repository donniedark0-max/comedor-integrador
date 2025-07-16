import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const STUDENT_NAMES = [
  "Carlos Ruiz",
  "Ana González",
  "Luis Pérez",
  "María López",
  "Jorge Martínez"
];

function getRandomStudentName() {
  return STUDENT_NAMES[Math.floor(Math.random() * STUDENT_NAMES.length)];
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("menu_db");
    const orders = await db.collection("orders").find({}).toArray();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error al obtener pedidos:", error);
    return NextResponse.json({ error: "Error al obtener pedidos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log("POST /api/orders called");
  try {
    const orderData = await request.json();
    console.log("Order Data recibida:", orderData);
    
    if (!orderData.dish_id || !orderData.datetime || !orderData.code) {
      console.error("Campos requeridos faltantes:", orderData);
      return NextResponse.json(
        { error: "Faltan campos requeridos: dish_id, datetime o code" },
        { status: 400 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db("menu_db");
    console.log("Conectado a MongoDB");
    
    // Se busca el plato usando su nombre (orderData.dish_id se envía con el nombre)
    const dish = await db.collection("menu_balanceado").findOne({ name: orderData.dish_id });
    console.log("Plato obtenido:", dish);
    if (!dish) {
      console.error("Plato no encontrado para name:", orderData.dish_id);
      return NextResponse.json({ error: "Plato no encontrado" }, { status: 404 });
    }
    
    const newOrder = {
      dish_id: dish.name,
      dish: dish.name,
      proteins: dish.nutrition?.protein,
      fats: dish.nutrition?.fat,
      carbs: dish.nutrition?.carbs,
      datetime: orderData.datetime,
      student: getRandomStudentName(),
      code: orderData.code,
      delivered: false,
      quantity: orderData.quantity || 1,
    };
    
    console.log("Nuevo pedido a insertar:", newOrder);
    const result = await db.collection("orders").insertOne(newOrder);
    console.log("Resultado de la inserción:", result);
    
    return NextResponse.json(newOrder);
  } catch (error) {
    console.error("Error al crear pedido:", error);
    return NextResponse.json({ error: "Error al crear el pedido" }, { status: 500 });
  }
}
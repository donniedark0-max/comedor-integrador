import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("menu_db");

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      { $set: body }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "No se pudo actualizar el pedido" }, { status: 404 });
    }

    return NextResponse.json({ message: "Pedido actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar el pedido:", error);
    return NextResponse.json({ error: "Error al actualizar el pedido" }, { status: 500 });
  }
}
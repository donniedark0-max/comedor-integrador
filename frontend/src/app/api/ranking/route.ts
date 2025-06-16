import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { dishId, rating } = await request.json();
    const client = await clientPromise;
    const db = client.db("menu_db");
    const result = await db.collection("plato_ranking").updateOne(
      { dishId },
      { $set: { dishId, rating, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error updating ranking:", error);
    return NextResponse.json({ error: "Error updating ranking" }, { status: 500 });
  }
}
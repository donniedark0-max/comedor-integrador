import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dishName = searchParams.get("dishName");
    if (!dishName) {
      return NextResponse.json({ error: "dishName is required" }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db("menu_db");
    const doc = await db.collection("plato_ranking").findOne({ dishName });
    if (!doc) {
      return NextResponse.json({ avg: null, count: 0 });
    }
    return NextResponse.json({ avg: doc.avg, count: doc.count });
  } catch (error) {
    console.error("Error retrieving ranking:", error);
    return NextResponse.json({ error: "Error retrieving ranking" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dishName, rating } = await request.json();
    if (!dishName) {
      return NextResponse.json({ error: "dishName is required" }, { status: 400 });
    }
    if (rating == null) {
      return NextResponse.json({ error: "rating is required" }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db("menu_db");
    
    // Buscar si ya existe un ranking para este plato
    const doc = await db.collection("plato_ranking").findOne({ dishName });
    let newAvg = rating;
    let newCount = 1;
    
    if (doc) {
      const currentAvg = doc.avg || 0;
      const currentCount = doc.count || 0;
      newCount = currentCount + 1;
      newAvg = (currentAvg * currentCount + rating) / newCount;
    }
    
    const result = await db.collection("plato_ranking").updateOne(
      { dishName },
      { $set: { dishName, avg: newAvg, count: newCount, updatedAt: new Date() } },
      { upsert: true }
    );
    
    return NextResponse.json({ avg: newAvg, count: newCount });
  } catch (error) {
    console.error("Error updating ranking:", error);
    return NextResponse.json({ error: "Error updating ranking" }, { status: 500 });
  }
}
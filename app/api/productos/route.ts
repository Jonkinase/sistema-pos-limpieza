import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const productos = db.prepare('SELECT * FROM productos').all();
    const sucursales = db.prepare('SELECT * FROM sucursales').all();
    const stocks = db.prepare('SELECT * FROM stock').all();
    
    return NextResponse.json({ 
      success: true,
      productos,
      sucursales,
      stocks,
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

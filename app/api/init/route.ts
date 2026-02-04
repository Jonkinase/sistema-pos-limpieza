import { initDatabase } from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    initDatabase();
    return NextResponse.json({ 
      success: true, 
      message: "Base de datos inicializada correctamente" 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

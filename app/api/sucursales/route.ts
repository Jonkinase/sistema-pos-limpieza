import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.query('SELECT * FROM sucursales WHERE activo = 1');
    return NextResponse.json({
      success: true,
      sucursales: result.rows,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

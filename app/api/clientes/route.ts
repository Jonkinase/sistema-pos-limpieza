import db from "@/lib/db/database";
import { NextResponse } from "next/server";

// Obtener todos los clientes
export async function GET() {
  try {
    const clientes = db.prepare(`
      SELECT * FROM clientes 
      WHERE activo = 1
      ORDER BY nombre
    `).all();

    return NextResponse.json({
      success: true,
      clientes
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al obtener clientes"
    }, { status: 500 });
  }
}

// Crear nuevo cliente
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, telefono } = body;

    if (!nombre) {
      return NextResponse.json({ 
        success: false, 
        error: "El nombre es obligatorio" 
      }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO clientes (nombre, telefono, saldo_deuda)
      VALUES (?, ?, 0)
    `).run(nombre, telefono || null);

    return NextResponse.json({
      success: true,
      cliente_id: result.lastInsertRowid,
      mensaje: "Cliente creado correctamente"
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al crear cliente"
    }, { status: 500 });
  }
}
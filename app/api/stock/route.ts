import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const productos = db.prepare('SELECT * FROM productos WHERE activo = 1').all();
    const sucursales = db.prepare('SELECT * FROM sucursales WHERE activo = 1').all();
    const stocks = db.prepare('SELECT * FROM stock').all();

    return NextResponse.json(
      {
        success: true,
        productos,
        sucursales,
        stocks,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener stock', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener stock',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { producto_id, sucursal_id, cantidad_litros } = body as {
      producto_id?: number;
      sucursal_id?: number;
      cantidad_litros?: number;
    };

    if (!producto_id || !sucursal_id || cantidad_litros === undefined) {
      return NextResponse.json(
        { success: false, error: 'producto_id, sucursal_id y cantidad_litros son obligatorios' },
        { status: 400 }
      );
    }

    if (cantidad_litros < 0) {
      return NextResponse.json(
        { success: false, error: 'La cantidad no puede ser negativa' },
        { status: 400 }
      );
    }

    // Verificar existencia de producto y sucursal
    const producto = db.prepare('SELECT id FROM productos WHERE id = ?').get(producto_id);
    const sucursal = db.prepare('SELECT id FROM sucursales WHERE id = ?').get(sucursal_id);

    if (!producto || !sucursal) {
      return NextResponse.json(
        { success: false, error: 'Producto o sucursal no válidos' },
        { status: 400 }
      );
    }

    // Insertar o actualizar stock
    db.prepare(
      `
      INSERT INTO stock (producto_id, sucursal_id, cantidad_litros)
      VALUES (?, ?, ?)
      ON CONFLICT(producto_id, sucursal_id)
      DO UPDATE SET cantidad_litros = excluded.cantidad_litros
    `
    ).run(producto_id, sucursal_id, cantidad_litros);

    const nuevoStock = db
      .prepare(
        'SELECT * FROM stock WHERE producto_id = ? AND sucursal_id = ?'
      )
      .get(producto_id, sucursal_id);

    return NextResponse.json(
      {
        success: true,
        stock: nuevoStock,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar stock', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar stock',
      },
      { status: 500 }
    );
  }
}


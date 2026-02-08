import db from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const productosResult = await db.query('SELECT * FROM productos WHERE activo = 1');
    const productos = productosResult.rows.map(p => ({
      ...p,
      precio_minorista: parseFloat(p.precio_minorista),
      precio_mayorista: p.precio_mayorista ? parseFloat(p.precio_mayorista) : null,
      litros_minimo_mayorista: p.litros_minimo_mayorista ? parseFloat(p.litros_minimo_mayorista) : null
    }));

    const sucursalesResult = await db.query('SELECT * FROM sucursales WHERE activo = 1');
    const sucursales = sucursalesResult.rows;

    const stocksResult = await db.query('SELECT * FROM stock');
    const stocks = stocksResult.rows.map(s => ({
      ...s,
      cantidad_litros: parseFloat(s.cantidad_litros)
    }));

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

export async function POST(request: NextRequest) {
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

    // Validación de permisos para encargado
    const user = getUserFromRequest(request);
    if (user?.rol === 'encargado' && user.sucursal_id !== sucursal_id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para modificar el stock de otra sucursal' },
        { status: 403 }
      );
    }

    if (cantidad_litros < 0) {
      return NextResponse.json(
        { success: false, error: 'La cantidad no puede ser negativa' },
        { status: 400 }
      );
    }

    // Verificar existencia de producto y sucursal
    const productoResult = await db.query('SELECT id FROM productos WHERE id = $1', [producto_id]);
    const sucursalResult = await db.query('SELECT id FROM sucursales WHERE id = $1', [sucursal_id]);

    if (productoResult.rowCount === 0 || sucursalResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Producto o sucursal no válidos' },
        { status: 400 }
      );
    }

    // Insertar o actualizar stock
    await db.query(`
      INSERT INTO stock (producto_id, sucursal_id, cantidad_litros)
      VALUES ($1, $2, $3)
      ON CONFLICT(producto_id, sucursal_id)
      DO UPDATE SET cantidad_litros = EXCLUDED.cantidad_litros
    `, [producto_id, sucursal_id, cantidad_litros]);

    const nuevoStockResult = await db.query(
      'SELECT * FROM stock WHERE producto_id = $1 AND sucursal_id = $2',
      [producto_id, sucursal_id]
    );
    const nuevoStock = nuevoStockResult.rows[0];

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


import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const productosResult = await db.query('SELECT * FROM productos WHERE activo = 1');
    const productos = productosResult.rows.map(p => ({
      ...p,
      precio_minorista: parseFloat(p.precio_minorista),
      precio_mayorista: p.precio_mayorista ? parseFloat(p.precio_mayorista) : null,
      litros_minimo_mayorista: p.litros_minimo_mayorista ? parseFloat(p.litros_minimo_mayorista) : null
    }));

    const sucursalesResult = await db.query('SELECT * FROM sucursales');
    const sucursales = sucursalesResult.rows;

    const stocksResult = await db.query('SELECT * FROM stock');
    const stocks = stocksResult.rows.map(s => ({
      ...s,
      cantidad_litros: parseFloat(s.cantidad_litros)
    }));

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, tipo, precio_minorista, precio_mayorista, litros_minimo_mayorista, stock_inicial, sucursal_id } = body;

    if (!nombre || !precio_minorista) {
      return NextResponse.json({ success: false, error: "Nombre y precio son obligatorios" }, { status: 400 });
    }

    const tipoProducto = tipo || 'liquido';

    // Para productos secos, precio mayorista es igual al minorista (o 0 si no se usa) 
    // y litros minimos irrelevant, usamos defaults seguros.
    const pMayorista = tipoProducto === 'seco' ? precio_minorista : (precio_mayorista || precio_minorista);
    const lMinimos = tipoProducto === 'seco' ? 0 : (litros_minimo_mayorista || 5);

    const result = await db.query(`
      INSERT INTO productos (nombre, tipo, precio_minorista, precio_mayorista, litros_minimo_mayorista)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [nombre, tipoProducto, precio_minorista, pMayorista, lMinimos]);

    const newProductId = result.rows[0].id;

    // Inicializar stock en 0 para todas las sucursales existentes
    const sucursales = (await db.query('SELECT id FROM sucursales')).rows;

    for (const sucursal of sucursales) {
      const cantidad = (stock_inicial && sucursal_id === sucursal.id) ? parseFloat(stock_inicial) : 0;
      await db.query('INSERT INTO stock (producto_id, sucursal_id, cantidad_litros) VALUES ($1, $2, $3)', [newProductId, sucursal.id, cantidad]);
    }

    return NextResponse.json({
      success: true,
      id: newProductId,
      message: "Producto creado correctamente"
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: "Error al crear producto"
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, nombre, tipo, precio_minorista, precio_mayorista, litros_minimo_mayorista } = body;

    if (!id || !nombre || !precio_minorista) {
      return NextResponse.json({ success: false, error: "ID, Nombre y Precio son obligatorios" }, { status: 400 });
    }

    const tipoProducto = tipo || 'liquido';
    const pMayorista = tipoProducto === 'seco' ? precio_minorista : (precio_mayorista || precio_minorista);
    const lMinimos = tipoProducto === 'seco' ? 0 : (litros_minimo_mayorista || 5);

    const result = await db.query(`
      UPDATE productos 
      SET nombre = $1, tipo = $2, precio_minorista = $3, precio_mayorista = $4, litros_minimo_mayorista = $5
      WHERE id = $6
    `, [nombre, tipoProducto, precio_minorista, pMayorista, lMinimos, id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Producto actualizado correctamente"
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: "Error al actualizar producto"
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const client = await db.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    await client.query('BEGIN');

    // Marcar como inactivo (Soft Delete)
    const result = await client.query('UPDATE productos SET activo = 0 WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new Error("Producto no encontrado");
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, message: "Producto eliminado correctamente" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar producto"
    }, { status: 500 });
  } finally {
    client.release();
  }
}

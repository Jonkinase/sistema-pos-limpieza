import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursal_id = searchParams.get('sucursal_id');

    if (!sucursal_id) {
      return NextResponse.json({ success: false, error: "sucursal_id es requerido" }, { status: 400 });
    }

    const productosResult = await db.query('SELECT * FROM productos WHERE activo = 1 AND sucursal_id = $1', [sucursal_id]);
    const productos = productosResult.rows.map(p => ({
      ...p,
      litros_minimo_mayorista: p.litros_minimo_mayorista ? parseFloat(p.litros_minimo_mayorista) : null
    }));

    const sucursalesResult = await db.query('SELECT * FROM sucursales');
    const sucursales = sucursalesResult.rows;

    const stocksResult = await db.query('SELECT * FROM stock WHERE sucursal_id = $1', [sucursal_id]);
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

    if (!sucursal_id) {
      return NextResponse.json({ success: false, error: "sucursal_id es requerido" }, { status: 400 });
    }

    if (!nombre || !precio_minorista) {
      return NextResponse.json({ success: false, error: "Nombre y precio son obligatorios" }, { status: 400 });
    }

    const tipoProducto = tipo || 'liquido';

    // Para productos secos, precio mayorista es igual al minorista (o 0 si no se usa) 
    // y litros minimos irrelevant, usamos defaults seguros.
    const pMayorista = tipoProducto === 'seco' ? precio_minorista : (precio_mayorista || precio_minorista);
    const lMinimos = tipoProducto === 'seco' ? 0 : (litros_minimo_mayorista || 5);

    const result = await db.query(`
      INSERT INTO productos (nombre, tipo, litros_minimo_mayorista, sucursal_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nombre, tipoProducto, lMinimos, sucursal_id]);

    const newProductId = result.rows[0].id;

    // Inicializar stock solo para la sucursal recibida
    await db.query(`
      INSERT INTO stock (producto_id, sucursal_id, cantidad_litros, precio_minorista, precio_mayorista, activo) 
      VALUES ($1, $2, $3, $4, $5, 1)
    `, [newProductId, sucursal_id, stock_inicial || 0, precio_minorista, pMayorista]);

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
    const { id, nombre, tipo, litros_minimo_mayorista } = body;

    if (!id || !nombre) {
      return NextResponse.json({ success: false, error: "ID y Nombre son obligatorios" }, { status: 400 });
    }

    // Obtener valores actuales para completar lo que falte
    const currentProductResult = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
    const currentProduct = currentProductResult.rows[0];

    if (!currentProduct) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const nombreFinal = nombre || currentProduct.nombre;
    const tipoProducto = tipo || currentProduct.tipo || 'liquido';
    const lMinimosFinal = litros_minimo_mayorista !== undefined ? litros_minimo_mayorista : currentProduct.litros_minimo_mayorista;

    await db.query(`
      UPDATE productos 
      SET nombre = $1, tipo = $2, litros_minimo_mayorista = $3
      WHERE id = $4
    `, [nombreFinal, tipoProducto, lMinimosFinal, id]);

    if (body.precio_minorista !== undefined || body.precio_mayorista !== undefined) {
      await db.query(`
        UPDATE stock SET precio_minorista = $1, precio_mayorista = $2 
        WHERE producto_id = $3
      `, [body.precio_minorista, body.precio_mayorista, id]);
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

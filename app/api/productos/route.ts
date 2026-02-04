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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, tipo, precio_minorista, precio_mayorista, litros_minimo_mayorista } = body;

    if (!nombre || !precio_minorista) {
      return NextResponse.json({ success: false, error: "Nombre y precio son obligatorios" }, { status: 400 });
    }

    const tipoProducto = tipo || 'liquido';
    const stmtd = db.prepare(`
      INSERT INTO productos (nombre, tipo, precio_minorista, precio_mayorista, litros_minimo_mayorista)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Para productos secos, precio mayorista es igual al minorista (o 0 si no se usa) 
    // y litros minimos irrelevant, usamos defaults seguros.
    const pMayorista = tipoProducto === 'seco' ? precio_minorista : (precio_mayorista || precio_minorista);
    const lMinimos = tipoProducto === 'seco' ? 0 : (litros_minimo_mayorista || 5);

    const result = stmtd.run(nombre, tipoProducto, precio_minorista, pMayorista, lMinimos);
    const newProductId = result.lastInsertRowid;

    // Inicializar stock en 0 para todas las sucursales existentes
    const sucursales: any[] = db.prepare('SELECT id FROM sucursales').all();
    const insertStock = db.prepare('INSERT INTO stock (producto_id, sucursal_id, cantidad_litros) VALUES (?, ?, 0)');

    for (const sucursal of sucursales) {
      insertStock.run(newProductId, sucursal.id);
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

    const stmt = db.prepare(`
      UPDATE productos 
      SET nombre = ?, tipo = ?, precio_minorista = ?, precio_mayorista = ?, litros_minimo_mayorista = ?
      WHERE id = ?
    `);

    const result = stmt.run(nombre, tipoProducto, precio_minorista, pMayorista, lMinimos, id);

    if (result.changes === 0) {
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
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const tieneVentas = db.prepare('SELECT count(*) as count FROM detalle_ventas WHERE producto_id = ?').get(id) as { count: number };

    if (tieneVentas.count > 0) {
      return NextResponse.json({
        success: false,
        error: "No se puede eliminar el producto porque tiene ventas asociadas. Primero elimine las ventas."
      }, { status: 400 });
    }

    const transaction = db.transaction(() => {
      // Eliminar stock asociado
      db.prepare('DELETE FROM stock WHERE producto_id = ?').run(id);
      // Eliminar producto
      const result = db.prepare('DELETE FROM productos WHERE id = ?').run(id);

      if (result.changes === 0) throw new Error("Producto no encontrado");
    });

    transaction();

    return NextResponse.json({ success: true, message: "Producto eliminado correctamente" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar producto"
    }, { status: 500 });
  }
}

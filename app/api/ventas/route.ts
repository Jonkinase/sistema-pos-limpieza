import db from "@/lib/db/database";
import { NextResponse } from "next/server";

// Crear tabla de ventas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sucursal_id INTEGER NOT NULL,
    cliente_id INTEGER,
    total REAL NOT NULL,
    pagado REAL NOT NULL,
    tipo_venta TEXT DEFAULT 'contado',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad_litros REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  )
`);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sucursal_id, items, tipo_venta, cliente_id, monto_pagado } = body;

    console.log('📦 Datos recibidos:', { sucursal_id, items, tipo_venta, cliente_id, monto_pagado });

    // Calcular total
    const total = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const pagado = monto_pagado !== undefined ? monto_pagado : total;

    console.log('💰 Total calculado:', total, '| Pagado:', pagado);

    // Insertar venta
    const ventaResult = db.prepare(`
      INSERT INTO ventas (sucursal_id, cliente_id, total, pagado, tipo_venta)
      VALUES (?, ?, ?, ?, ?)
    `).run(sucursal_id, cliente_id || null, total, pagado, tipo_venta || 'contado');

    const venta_id = ventaResult.lastInsertRowid;

    console.log('✅ Venta creada con ID:', venta_id);

    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO detalle_ventas (venta_id, producto_id, cantidad_litros, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertDetalle.run(
        venta_id,
        item.producto_id,
        item.litros,
        item.precio_unitario,
        item.subtotal
      );
    }

    console.log('📝 Detalles de venta insertados');

    // Si es fiado, actualizar deuda del cliente
    if (tipo_venta === 'fiado' && cliente_id) {
      const deuda = total - pagado;
      
      console.log('💳 Actualizando deuda del cliente', cliente_id, '| Deuda a sumar:', deuda);
      
      db.prepare(`
        UPDATE clientes 
        SET saldo_deuda = saldo_deuda + ?
        WHERE id = ?
      `).run(deuda, cliente_id);

      // Verificar que se actualizó
      const clienteActualizado: any = db.prepare('SELECT * FROM clientes WHERE id = ?').get(cliente_id);
      console.log('✅ Cliente actualizado:', clienteActualizado);
    }

    return NextResponse.json({
      success: true,
      venta_id: venta_id,
      total: total,
      mensaje: "Venta registrada correctamente"
    });

  } catch (error) {
    console.error('❌ Error al registrar venta:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al registrar venta"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ventas = db.prepare(`
      SELECT v.*, s.nombre as sucursal
      FROM ventas v
      JOIN sucursales s ON v.sucursal_id = s.id
      ORDER BY v.fecha DESC
      LIMIT 50
    `).all();

    return NextResponse.json({
      success: true,
      ventas
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al obtener ventas"
    }, { status: 500 });
  }
}
import db from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    console.log('🔍 Buscando presupuesto ID:', id);

    // Obtener presupuesto
    const presupuesto = db.prepare(`
      SELECT p.*, s.nombre as sucursal, s.direccion as sucursal_direccion
      FROM presupuestos p
      JOIN sucursales s ON p.sucursal_id = s.id
      WHERE p.id = ?
    `).get(id);

    console.log('📦 Presupuesto encontrado:', presupuesto);

    if (!presupuesto) {
      return NextResponse.json({ 
        success: false, 
        error: "Presupuesto no encontrado" 
      }, { status: 404 });
    }

    // Obtener detalles
    const detalles = db.prepare(`
      SELECT * FROM detalle_presupuestos
      WHERE presupuesto_id = ?
    `).all(id);

    console.log('📋 Detalles encontrados:', detalles.length, 'items');

    return NextResponse.json({
      success: true,
      presupuesto,
      detalles
    });

  } catch (error) {
    console.error('❌ Error en GET presupuesto:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al obtener presupuesto"
    }, { status: 500 });
  }
}

// Convertir presupuesto a venta
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { tipo_venta, cliente_id, monto_pagado } = body;

    console.log('🔄 Convirtiendo presupuesto ID:', id);
    console.log('📦 Datos:', { tipo_venta, cliente_id, monto_pagado });

    // Obtener presupuesto
    const presupuesto: any = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(id);
    
    if (!presupuesto) {
      return NextResponse.json({ 
        success: false, 
        error: "Presupuesto no encontrado" 
      }, { status: 404 });
    }

    if (presupuesto.estado === 'convertido') {
      return NextResponse.json({ 
        success: false, 
        error: "Este presupuesto ya fue convertido a venta" 
      }, { status: 400 });
    }

    // Obtener detalles
    const detalles = db.prepare('SELECT * FROM detalle_presupuestos WHERE presupuesto_id = ?').all(id);

    const total = presupuesto.total;
    const pagado = monto_pagado !== undefined ? monto_pagado : total;

    // Crear venta
    const ventaResult = db.prepare(`
      INSERT INTO ventas (sucursal_id, cliente_id, total, pagado, tipo_venta)
      VALUES (?, ?, ?, ?, ?)
    `).run(presupuesto.sucursal_id, cliente_id || null, total, pagado, tipo_venta || 'contado');

    const venta_id = ventaResult.lastInsertRowid;

    console.log('✅ Venta creada con ID:', venta_id);

    // Insertar detalles de venta
    const insertDetalle = db.prepare(`
      INSERT INTO detalle_ventas (venta_id, producto_id, cantidad_litros, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const detalle of detalles as any[]) {
      insertDetalle.run(
        venta_id,
        detalle.producto_id,
        detalle.cantidad_litros,
        detalle.precio_unitario,
        detalle.subtotal
      );
    }

    // Si es fiado, actualizar deuda
    if (tipo_venta === 'fiado' && cliente_id) {
      const deuda = total - pagado;
      db.prepare(`
        UPDATE clientes 
        SET saldo_deuda = saldo_deuda + ?
        WHERE id = ?
      `).run(deuda, cliente_id);
      
      console.log('💳 Deuda actualizada para cliente:', cliente_id, '| Monto:', deuda);
    }

    // Actualizar presupuesto
    db.prepare(`
      UPDATE presupuestos 
      SET estado = 'convertido', venta_id = ?
      WHERE id = ?
    `).run(venta_id, id);

    console.log('✅ Presupuesto marcado como convertido');

    return NextResponse.json({
      success: true,
      venta_id: venta_id,
      mensaje: "Presupuesto convertido a venta correctamente"
    });

  } catch (error) {
    console.error('❌ Error al convertir presupuesto:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al convertir presupuesto"
    }, { status: 500 });
  }
}
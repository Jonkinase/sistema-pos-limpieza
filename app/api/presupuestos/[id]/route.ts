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
    const result = await db.query(`
      SELECT p.*, s.nombre as sucursal, s.direccion as sucursal_direccion
      FROM presupuestos p
      JOIN sucursales s ON p.sucursal_id = s.id
      WHERE p.id = $1
    `, [id]);
    const presupuesto = result.rows[0];

    console.log('📦 Presupuesto encontrado:', presupuesto);

    if (!presupuesto) {
      return NextResponse.json({
        success: false,
        error: "Presupuesto no encontrado"
      }, { status: 404 });
    }

    // Obtener detalles
    const detallesResult = await db.query(`
      SELECT * FROM detalle_presupuestos
      WHERE presupuesto_id = $1
    `, [id]);
    const detalles = detallesResult.rows;

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
  const client = await db.connect();
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { tipo_venta, cliente_id, monto_pagado } = body;

    console.log('🔄 Convirtiendo presupuesto ID:', id);
    console.log('📦 Datos:', { tipo_venta, cliente_id, monto_pagado });

    // Obtener presupuesto
    const presupuestoResult = await client.query('SELECT * FROM presupuestos WHERE id = $1', [id]);
    const presupuesto = presupuestoResult.rows[0];

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
    const detallesResult = await client.query('SELECT * FROM detalle_presupuestos WHERE presupuesto_id = $1', [id]);
    const detalles = detallesResult.rows;

    const total = parseFloat(presupuesto.total);
    const pagado = monto_pagado !== undefined ? parseFloat(monto_pagado) : total;

    await client.query('BEGIN');

    // Crear venta
    const ventaResult = await client.query(`
      INSERT INTO ventas (sucursal_id, cliente_id, total, pagado, tipo_venta)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [presupuesto.sucursal_id, cliente_id || null, total, pagado, tipo_venta || 'contado']);

    const venta_id = ventaResult.rows[0].id;

    console.log('✅ Venta creada con ID:', venta_id);

    // Insertar detalles de venta
    for (const detalle of detalles) {
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad_litros, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        venta_id,
        detalle.producto_id,
        detalle.cantidad_litros,
        detalle.precio_unitario,
        detalle.subtotal
      ]);
    }

    // Si es fiado, actualizar deuda
    if (tipo_venta === 'fiado' && cliente_id) {
      const deuda = total - pagado;
      await client.query(`
        UPDATE clientes 
        SET saldo_deuda = saldo_deuda + $1
        WHERE id = $2
      `, [deuda, cliente_id]);

      console.log('💳 Deuda actualizada para cliente:', cliente_id, '| Monto:', deuda);
    }

    // Actualizar presupuesto
    await client.query(`
      UPDATE presupuestos 
      SET estado = 'convertido', venta_id = $1
      WHERE id = $2
    `, [venta_id, id]);

    await client.query('COMMIT');

    console.log('✅ Presupuesto marcado como convertido');

    return NextResponse.json({
      success: true,
      venta_id: venta_id,
      mensaje: "Presupuesto convertido a venta correctamente"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al convertir presupuesto:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al convertir presupuesto"
    }, { status: 500 });
  } finally {
    client.release();
  }
}

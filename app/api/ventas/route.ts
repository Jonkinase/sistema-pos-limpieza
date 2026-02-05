import db from "@/lib/db/database";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const body = await request.json();
    const { sucursal_id, items, tipo_venta, cliente_id, monto_pagado } = body;

    // Obtener usuario (vendedor) de las cookies
    const cookieHeader = request.headers.get('cookie');
    let usuario_id = null;

    if (cookieHeader) {
      const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
      const token = cookies['auth_token'];
      if (token) {
        const user = verifyAuthToken(token);
        if (user) usuario_id = user.id;
      }
    }

    console.log('📦 Datos recibidos:', { sucursal_id, items, tipo_venta, cliente_id, monto_pagado, usuario_id });

    // Calcular total
    const total = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const pagado = monto_pagado !== undefined ? monto_pagado : total;

    // Verificar stock disponible por producto en la sucursal
    for (const item of items) {
      const stockResult = await client.query(
        'SELECT cantidad_litros FROM stock WHERE producto_id = $1 AND sucursal_id = $2',
        [item.producto_id, sucursal_id]
      );
      const stockRow = stockResult.rows[0];
      const disponible = stockRow?.cantidad_litros ?? 0;

      if (disponible < item.litros) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock insuficiente para el producto ID ${item.producto_id}. Disponible: ${parseFloat(disponible).toFixed(2)}L`
          },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');

    // Insertar venta
    const ventaResult = await client.query(`
      INSERT INTO ventas (sucursal_id, cliente_id, usuario_id, total, pagado, tipo_venta)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [sucursal_id, cliente_id || null, usuario_id, total, pagado, tipo_venta || 'contado']);

    const venta_id = ventaResult.rows[0].id;

    for (const item of items) {
      // Insertar detalle
      await client.query(`
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad_litros, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [venta_id, item.producto_id, item.litros, item.precio_unitario, item.subtotal]);

      // Actualizar stock
      await client.query(`
        UPDATE stock
        SET cantidad_litros = cantidad_litros - $1
        WHERE producto_id = $2 AND sucursal_id = $3
      `, [item.litros, item.producto_id, sucursal_id]);
    }

    // Si es fiado, actualizar deuda del cliente
    if (tipo_venta === 'fiado' && cliente_id) {
      const deuda = total - pagado;
      await client.query('UPDATE clientes SET saldo_deuda = saldo_deuda + $1 WHERE id = $2', [deuda, cliente_id]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      venta_id: venta_id,
      total: total,
      mensaje: "Venta registrada correctamente"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al registrar venta:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar venta"
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursal_id');

    let queryStr = `
      SELECT 
        v.id, v.fecha, v.total, v.tipo_venta, v.pagado,
        c.nombre as cliente_nombre,
        u.nombre as vendedor_nombre,
        s.nombre as sucursal,
        (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as items_count,
        (SELECT STRING_AGG(p.nombre || ' (' || 
          CASE 
            WHEN p.tipo = 'seco' THEN CAST(dv.cantidad_litros AS INT) || 'u.' 
            ELSE dv.cantidad_litros || 'L' 
          END || ')', ', ') 
         FROM detalle_ventas dv 
         JOIN productos p ON dv.producto_id = p.id 
         WHERE dv.venta_id = v.id) as items_resumen
      FROM ventas v
      JOIN sucursales s ON v.sucursal_id = s.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
    `;

    const params = [];

    if (sucursalId) {
      queryStr += ` WHERE v.sucursal_id = $1`;
      params.push(sucursalId);
    }

    queryStr += ` ORDER BY v.fecha DESC LIMIT 50`;

    const result = await db.query(queryStr, params);
    const ventas = result.rows;

    return NextResponse.json({ success: true, ventas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const client = await db.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const ventaResult = await client.query('SELECT * FROM ventas WHERE id = $1', [id]);
    const venta = ventaResult.rows[0];
    if (!venta) return NextResponse.json({ success: false, error: "Venta no encontrada" }, { status: 404 });

    await client.query('BEGIN');

    // 1. Devolver stock
    const itemsResult = await client.query('SELECT * FROM detalle_ventas WHERE venta_id = $1', [id]);
    const items = itemsResult.rows;

    for (const item of items) {
      await client.query(`
        UPDATE stock
        SET cantidad_litros = cantidad_litros + $1
        WHERE producto_id = $2 AND sucursal_id = $3
      `, [item.cantidad_litros, item.producto_id, venta.sucursal_id]);
    }

    // 2. Revertir saldo cliente si fue fiado
    if (venta.tipo_venta === 'fiado' && venta.cliente_id) {
      const deuda = parseFloat(venta.total) - parseFloat(venta.pagado);
      console.log(`💳 Revertiendo deuda cliente ${venta.cliente_id}: -${deuda}`);
      await client.query('UPDATE clientes SET saldo_deuda = saldo_deuda - $1 WHERE id = $2', [deuda, venta.cliente_id]);
    }

    // 3. Eliminar registros
    await client.query('DELETE FROM detalle_ventas WHERE venta_id = $1', [id]);
    await client.query('DELETE FROM ventas WHERE id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al eliminar venta" }, { status: 500 });
  } finally {
    client.release();
  }
}

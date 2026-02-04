import db from "@/lib/db/database";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

// Crear tabla de ventas si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sucursal_id INTEGER NOT NULL,
    cliente_id INTEGER,
    usuario_id INTEGER,
    total REAL NOT NULL,
    pagado REAL NOT NULL,
    tipo_venta TEXT DEFAULT 'contado',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )
`);

// Migración: Agregar columna usuario_id si no existe
try {
  db.prepare('SELECT usuario_id FROM ventas LIMIT 1').get();
} catch (error) {
  console.log('🔄 Agregando columna usuario_id a tabla ventas...');
  db.exec('ALTER TABLE ventas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)');
}

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
      const stockRow = db.prepare(
        'SELECT cantidad_litros FROM stock WHERE producto_id = ? AND sucursal_id = ?'
      ).get(item.producto_id, sucursal_id) as { cantidad_litros: number } | undefined;

      const disponible = stockRow?.cantidad_litros ?? 0;

      if (disponible < item.litros) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock insuficiente para el producto ID ${item.producto_id}. Disponible: ${disponible.toFixed(2)}L`
          },
          { status: 400 }
        );
      }
    }

    // Transacción: registrar venta, detalle y actualizar stock
    const transaction = db.transaction(() => {
      // Insertar venta
      const ventaResult = db.prepare(`
        INSERT INTO ventas (sucursal_id, cliente_id, usuario_id, total, pagado, tipo_venta)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sucursal_id, cliente_id || null, usuario_id, total, pagado, tipo_venta || 'contado');

      const venta_id = ventaResult.lastInsertRowid;

      // Insertar detalles
      const insertDetalle = db.prepare(`
        INSERT INTO detalle_ventas (venta_id, producto_id, cantidad_litros, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE stock
        SET cantidad_litros = cantidad_litros - ?
        WHERE producto_id = ? AND sucursal_id = ?
      `);

      for (const item of items) {
        insertDetalle.run(venta_id, item.producto_id, item.litros, item.precio_unitario, item.subtotal);
        updateStock.run(item.litros, item.producto_id, sucursal_id);
      }

      // Si es fiado, actualizar deuda del cliente
      if (tipo_venta === 'fiado' && cliente_id) {
        const deuda = total - pagado;
        db.prepare('UPDATE clientes SET saldo_deuda = saldo_deuda + ? WHERE id = ?').run(deuda, cliente_id);
      }

      return venta_id;
    });

    const ventaIdResult = transaction();

    return NextResponse.json({
      success: true,
      venta_id: ventaIdResult,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get('sucursal_id');

    let query = `
      SELECT 
        v.id, v.fecha, v.total, v.tipo_venta, v.pagado,
        c.nombre as cliente_nombre,
        u.nombre as vendedor_nombre,
        s.nombre as sucursal,
        (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as items_count,
        (SELECT group_concat(p.nombre || ' (' || 
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
      query += ` WHERE v.sucursal_id = ?`;
      params.push(sucursalId);
    }

    query += ` ORDER BY v.fecha DESC LIMIT 50`;

    const ventas = db.prepare(query).all(...params);

    return NextResponse.json({ success: true, ventas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });

    const transaction = db.transaction(() => {
      const venta: any = db.prepare('SELECT * FROM ventas WHERE id = ?').get(id);
      if (!venta) throw new Error("Venta no encontrada");

      // 1. Devolver stock
      const items: any[] = db.prepare('SELECT * FROM detalle_ventas WHERE venta_id = ?').all(id);
      const updateStock = db.prepare(`
        UPDATE stock
        SET cantidad_litros = cantidad_litros + ?
        WHERE producto_id = ? AND sucursal_id = ?
      `);

      for (const item of items) {
        updateStock.run(item.cantidad_litros, item.producto_id, venta.sucursal_id);
      }

      // 2. Revertir saldo cliente si fue fiado
      if (venta.tipo_venta === 'fiado' && venta.cliente_id) {
        const deuda = venta.total - venta.pagado;
        console.log(`💳 Revertiendo deuda cliente ${venta.cliente_id}: -${deuda}`);

        try {
          const result = db.prepare('UPDATE clientes SET saldo_deuda = saldo_deuda - ? WHERE id = ?').run(deuda, venta.cliente_id);
          console.log('Update result:', result);
        } catch (err) {
          console.error('Error updating client debt:', err);
          throw new Error('Error al actualizar la cuenta del cliente: ' + (err instanceof Error ? err.message : String(err)));
        }
      }

      // 3. Eliminar registros
      db.prepare('DELETE FROM detalle_ventas WHERE venta_id = ?').run(id);
      db.prepare('DELETE FROM ventas WHERE id = ?').run(id);
    });

    transaction();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Error al eliminar venta" }, { status: 500 });
  }
}
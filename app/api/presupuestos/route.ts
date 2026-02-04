import db from "@/lib/db/database";
import { NextResponse } from "next/server";

// Crear tabla de presupuestos
db.exec(`
  CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sucursal_id INTEGER NOT NULL,
    cliente_nombre TEXT,
    total REAL NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    venta_id INTEGER,
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
    FOREIGN KEY (venta_id) REFERENCES ventas(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS detalle_presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    presupuesto_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    producto_nombre TEXT NOT NULL,
    cantidad_litros REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    tipo_precio TEXT,
    FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
  )
`);

// Crear presupuesto
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sucursal_id, cliente_nombre, items } = body;

    // Calcular total
    const total = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

    // Insertar presupuesto
    const presupuestoResult = db.prepare(`
      INSERT INTO presupuestos (sucursal_id, cliente_nombre, total, estado)
      VALUES (?, ?, ?, 'pendiente')
    `).run(sucursal_id, cliente_nombre || 'Cliente sin nombre', total);

    const presupuesto_id = presupuestoResult.lastInsertRowid;

    // Insertar detalles
    const insertDetalle = db.prepare(`
      INSERT INTO detalle_presupuestos (presupuesto_id, producto_id, producto_nombre, cantidad_litros, precio_unitario, subtotal, tipo_precio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertDetalle.run(
        presupuesto_id,
        item.producto_id,
        item.producto_nombre,
        item.litros,
        item.precio_unitario,
        item.subtotal,
        item.tipo_precio
      );
    }

    return NextResponse.json({
      success: true,
      presupuesto_id: presupuesto_id,
      total: total,
      mensaje: "Presupuesto guardado correctamente"
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al guardar presupuesto"
    }, { status: 500 });
  }
}

// Obtener presupuestos
export async function GET() {
  try {
    const presupuestos = db.prepare(`
      SELECT p.*, s.nombre as sucursal
      FROM presupuestos p
      JOIN sucursales s ON p.sucursal_id = s.id
      ORDER BY p.fecha DESC
      LIMIT 100
    `).all();

    return NextResponse.json({
      success: true,
      presupuestos
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Error al obtener presupuestos"
    }, { status: 500 });
  }
}
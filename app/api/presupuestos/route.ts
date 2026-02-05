import db from "@/lib/db/database";
import { NextResponse, NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

// Crear presupuesto
export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const body = await request.json();
    const { sucursal_id, cliente_nombre, items } = body;

    // Calcular total
    const total = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);

    await client.query('BEGIN');

    // Insertar presupuesto
    const presupuestoResult = await client.query(`
      INSERT INTO presupuestos (sucursal_id, cliente_nombre, total, estado)
      VALUES ($1, $2, $3, 'pendiente')
      RETURNING id
    `, [sucursal_id, cliente_nombre || 'Cliente sin nombre', total]);

    const presupuesto_id = presupuestoResult.rows[0].id;

    // Insertar detalles
    for (const item of items) {
      await client.query(`
        INSERT INTO detalle_presupuestos (presupuesto_id, producto_id, producto_nombre, cantidad_litros, precio_unitario, subtotal, tipo_precio)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        presupuesto_id,
        item.producto_id,
        item.producto_nombre,
        item.litros,
        item.precio_unitario,
        item.subtotal,
        item.tipo_precio
      ]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      presupuesto_id: presupuesto_id,
      total: total,
      mensaje: "Presupuesto guardado correctamente"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al guardar presupuesto"
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// Obtener presupuestos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sucursalIdParam = searchParams.get('sucursal_id');

    // Si es admin puede ver cualquier sucursal pasada por param, si no, usa la suya
    const sucursal_id = (user.rol === 'admin' && sucursalIdParam)
      ? parseInt(sucursalIdParam)
      : user.sucursal_id;

    if (!sucursal_id && user.rol !== 'admin') {
      return NextResponse.json({ success: false, error: "Sucursal no definida" }, { status: 400 });
    }

    let result;
    if (sucursal_id) {
      result = await db.query(`
            SELECT p.*, s.nombre as sucursal
            FROM presupuestos p
            JOIN sucursales s ON p.sucursal_id = s.id
            WHERE p.sucursal_id = $1
            ORDER BY p.fecha DESC
            LIMIT 100
        `, [sucursal_id]);
    } else {
      result = await db.query(`
            SELECT p.*, s.nombre as sucursal
            FROM presupuestos p
            JOIN sucursales s ON p.sucursal_id = s.id
            WHERE p.sucursal_id IS NULL
            ORDER BY p.fecha DESC
            LIMIT 100
        `);
    }

    const presupuestos = result.rows;

    return NextResponse.json({
      success: true,
      presupuestos
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener presupuestos"
    }, { status: 500 });
  }
}

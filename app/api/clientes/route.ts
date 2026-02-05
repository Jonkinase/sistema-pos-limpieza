import db from "@/lib/db/database";
import { NextResponse, NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

// Obtener todos los clientes
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

    const query = sucursal_id
      ? `SELECT * FROM clientes WHERE activo = 1 AND sucursal_id = ? ORDER BY nombre`
      : `SELECT * FROM clientes WHERE activo = 1 AND sucursal_id IS NULL ORDER BY nombre`;

    const clientes = db.prepare(query).all(sucursal_id ? [sucursal_id] : []);

    return NextResponse.json({
      success: true,
      clientes
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener clientes"
    }, { status: 500 });
  }
}

// Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, telefono, sucursal_id: sucursalIdBody } = body;

    // Si es admin usa el de body, si no (vendedor o encargado), el suyo
    const sucursal_id = (user.rol === 'admin' && sucursalIdBody)
      ? sucursalIdBody
      : user.sucursal_id;

    if (!nombre) {
      return NextResponse.json({
        success: false,
        error: "El nombre es obligatorio"
      }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO clientes (nombre, telefono, saldo_deuda, sucursal_id)
      VALUES (?, ?, 0, ?)
    `).run(nombre, telefono || null, sucursal_id);

    return NextResponse.json({
      success: true,
      cliente_id: result.lastInsertRowid,
      mensaje: "Cliente creado correctamente"
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al crear cliente"
    }, { status: 500 });
  }
}
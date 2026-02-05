import db from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

// Crear tabla de pagos
db.exec(`
  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )
`);

// Registrar un pago
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { cliente_id, monto, observaciones, sucursal_id: sucursalIdBody } = body;

    // Si es admin usa el de body, si no (vendedor o encargado), el suyo
    const sucursal_id = (user.rol === 'admin' && sucursalIdBody)
      ? sucursalIdBody
      : user.sucursal_id;

    if (!cliente_id || !monto || monto <= 0) {
      return NextResponse.json({
        success: false,
        error: "Datos inválidos"
      }, { status: 400 });
    }

    // Verificar que el cliente pertenece a la sucursal (o NULL para admin global que no pase SID)
    const clienteQuery = sucursal_id
      ? 'SELECT * FROM clientes WHERE id = ? AND sucursal_id = ?'
      : 'SELECT * FROM clientes WHERE id = ? AND sucursal_id IS NULL';
    const clienteParams = sucursal_id ? [cliente_id, sucursal_id] : [cliente_id];
    const cliente: any = db.prepare(clienteQuery).get(...clienteParams);

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: "Cliente no encontrado"
      }, { status: 404 });
    }

    if (monto > cliente.saldo_deuda) {
      return NextResponse.json({
        success: false,
        error: `El monto ($${monto}) es mayor a la deuda ($${cliente.saldo_deuda})`
      }, { status: 400 });
    }

    // Registrar el pago
    const result = db.prepare(`
      INSERT INTO pagos (cliente_id, monto, observaciones)
      VALUES (?, ?, ?)
    `).run(cliente_id, monto, observaciones || null);

    // Actualizar saldo del cliente
    db.prepare(`
      UPDATE clientes 
      SET saldo_deuda = saldo_deuda - ?
      WHERE id = ?
    `).run(monto, cliente_id);

    const nuevoSaldo = cliente.saldo_deuda - monto;

    return NextResponse.json({
      success: true,
      pago_id: result.lastInsertRowid,
      nuevo_saldo: nuevoSaldo,
      mensaje: "Pago registrado correctamente"
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar pago"
    }, { status: 500 });
  }
}

// Obtener historial de pagos de un cliente
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cliente_id = searchParams.get('cliente_id');
    const sucursalIdParam = searchParams.get('sucursal_id');

    if (!cliente_id) {
      return NextResponse.json({
        success: false,
        error: "cliente_id es requerido"
      }, { status: 400 });
    }

    // Si es admin usa param si existe, si no (vendedor o encargado), el suyo
    const sucursal_id = (user.rol === 'admin' && sucursalIdParam)
      ? parseInt(sucursalIdParam)
      : user.sucursal_id;

    // Verificar que el cliente pertenece a la sucursal
    const clienteQuery = sucursal_id
      ? 'SELECT id FROM clientes WHERE id = ? AND sucursal_id = ?'
      : 'SELECT id FROM clientes WHERE id = ? AND sucursal_id IS NULL';
    const clienteParams = sucursal_id ? [cliente_id, sucursal_id] : [cliente_id];
    const cliente: any = db.prepare(clienteQuery).get(...clienteParams);

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: "Cliente no encontrado o no pertenece a esta sucursal"
      }, { status: 404 });
    }

    const pagos = db.prepare(`
      SELECT * FROM pagos 
      WHERE cliente_id = ?
      ORDER BY fecha DESC
    `).all(cliente_id);

    return NextResponse.json({
      success: true,
      pagos
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener pagos"
    }, { status: 500 });
  }
}
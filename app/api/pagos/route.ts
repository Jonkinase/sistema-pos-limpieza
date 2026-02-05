import db from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

// Registrar un pago
export async function POST(request: NextRequest) {
  const client = await db.connect();
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
      ? 'SELECT * FROM clientes WHERE id = $1 AND sucursal_id = $2'
      : 'SELECT * FROM clientes WHERE id = $1 AND sucursal_id IS NULL';
    const clienteParams = sucursal_id ? [cliente_id, sucursal_id] : [cliente_id];

    const clienteResult = await client.query(clienteQuery, clienteParams);
    const cliente = clienteResult.rows[0];

    if (!cliente) {
      return NextResponse.json({
        success: false,
        error: "Cliente no encontrado"
      }, { status: 404 });
    }

    if (parseFloat(monto) > parseFloat(cliente.saldo_deuda)) {
      return NextResponse.json({
        success: false,
        error: `El monto ($${monto}) es mayor a la deuda ($${cliente.saldo_deuda})`
      }, { status: 400 });
    }

    await client.query('BEGIN');

    // Registrar el pago
    const result = await client.query(`
      INSERT INTO pagos (cliente_id, monto, observaciones)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [cliente_id, monto, observaciones || null]);

    // Actualizar saldo del cliente
    await client.query(`
      UPDATE clientes 
      SET saldo_deuda = saldo_deuda - $1
      WHERE id = $2
    `, [monto, cliente_id]);

    await client.query('COMMIT');

    const nuevoSaldo = parseFloat(cliente.saldo_deuda) - parseFloat(monto);

    return NextResponse.json({
      success: true,
      pago_id: result.rows[0].id,
      nuevo_saldo: nuevoSaldo,
      mensaje: "Pago registrado correctamente"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar pago"
    }, { status: 500 });
  } finally {
    client.release();
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
      ? 'SELECT id FROM clientes WHERE id = $1 AND sucursal_id = $2'
      : 'SELECT id FROM clientes WHERE id = $1 AND sucursal_id IS NULL';
    const clienteParams = sucursal_id ? [cliente_id, sucursal_id] : [cliente_id];

    const clienteResult = await db.query(clienteQuery, clienteParams);

    if (clienteResult.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: "Cliente no encontrado o no pertenece a esta sucursal"
      }, { status: 404 });
    }

    const pagosResult = await db.query(`
      SELECT * FROM pagos 
      WHERE cliente_id = $1
      ORDER BY fecha DESC
    `, [cliente_id]);

    const pagos = pagosResult.rows.map(p => ({
      ...p,
      monto: parseFloat(p.monto)
    }));

    return NextResponse.json({
      success: true,
      pagos
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener pagos"
    }, { status: 500 });
  }
}

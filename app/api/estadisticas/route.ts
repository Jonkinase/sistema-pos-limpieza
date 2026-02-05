import db from "@/lib/db/database";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
    const token = cookies['auth_token'];
    if (!token) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const user = verifyAuthToken(token);
    if (!user || (user.rol !== 'admin' && user.rol !== 'encargado')) {
      return NextResponse.json({ success: false, error: "Acceso denegado" }, { status: 403 });
    }

    const isEncargado = user.rol === 'encargado';
    const sucursal_id = user.sucursal_id;

    // Total de ventas del día
    const ventasHoyResult = await db.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha) = CURRENT_DATE
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
    `, isEncargado ? [sucursal_id] : []);
    const ventasHoy = ventasHoyResult.rows[0];

    // Total de ventas del mes
    const ventasMesResult = await db.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE TO_CHAR(fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
    `, isEncargado ? [sucursal_id] : []);
    const ventasMes = ventasMesResult.rows[0];

    // Ventas por sucursal (del mes)
    let ventasPorSucursal: any[] = [];
    if (!isEncargado) {
      const vpsResult = await db.query(`
        SELECT s.nombre, COUNT(v.id) as cantidad, COALESCE(SUM(v.total), 0) as total
        FROM sucursales s
        LEFT JOIN ventas v ON s.id = v.sucursal_id 
          AND TO_CHAR(v.fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
        GROUP BY s.id, s.nombre
      `);
      ventasPorSucursal = vpsResult.rows;
    }

    // Total de deuda pendiente
    const deudaTotalResult = await db.query(`
      SELECT COALESCE(SUM(saldo_deuda), 0) as total
      FROM clientes
      WHERE saldo_deuda > 0
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
    `, isEncargado ? [sucursal_id] : []);
    const deudaTotal = deudaTotalResult.rows[0];

    // Clientes con deuda
    const clientesConDeudaResult = await db.query(`
      SELECT COUNT(*) as cantidad
      FROM clientes
      WHERE saldo_deuda > 0
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
    `, isEncargado ? [sucursal_id] : []);
    const clientesConDeuda = clientesConDeudaResult.rows[0];

    // Presupuestos pendientes
    const presupuestosPendientesResult = await db.query(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM presupuestos
      WHERE estado = 'pendiente'
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
    `, isEncargado ? [sucursal_id] : []);
    const presupuestosPendientes = presupuestosPendientesResult.rows[0];

    // Top 5 productos más vendidos (del mes)
    const topProductosResult = await db.query(`
      SELECT 
        p.nombre,
        COALESCE(SUM(dv.cantidad_litros), 0) as litros_vendidos,
        COALESCE(SUM(dv.subtotal), 0) as total_vendido
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      LEFT JOIN ventas v ON dv.venta_id = v.id
        AND TO_CHAR(v.fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      WHERE 1=1
      ${isEncargado ? 'AND v.sucursal_id = $1' : ''}
      GROUP BY p.id, p.nombre
      ORDER BY litros_vendidos DESC
      LIMIT 5
    `, isEncargado ? [sucursal_id] : []);
    const topProductos = topProductosResult.rows;

    // Ventas contado vs fiado (del mes)
    const ventasPorTipoResult = await db.query(`
      SELECT 
        tipo_venta,
        COUNT(*) as cantidad,
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE TO_CHAR(fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      ${isEncargado ? 'AND sucursal_id = $1' : ''}
      GROUP BY tipo_venta
    `, isEncargado ? [sucursal_id] : []);
    const ventasPorTipo = ventasPorTipoResult.rows;

    return NextResponse.json({
      success: true,
      estadisticas: {
        hoy: {
          cantidad: parseInt(ventasHoy.cantidad),
          total: parseFloat(ventasHoy.total)
        },
        mes: {
          cantidad: parseInt(ventasMes.cantidad),
          total: parseFloat(ventasMes.total)
        },
        sucursales: ventasPorSucursal.map(s => ({
          ...s,
          cantidad: parseInt(s.cantidad),
          total: parseFloat(s.total)
        })),
        deudas: {
          total: parseFloat(deudaTotal.total),
          clientes: parseInt(clientesConDeuda.cantidad)
        },
        presupuestos: {
          pendientes: parseInt(presupuestosPendientes.cantidad),
          total: parseFloat(presupuestosPendientes.total)
        },
        topProductos: topProductos.map(p => ({
          ...p,
          litros_vendidos: parseFloat(p.litros_vendidos),
          total_vendido: parseFloat(p.total_vendido)
        })),
        ventasPorTipo: ventasPorTipo.map(t => ({
          ...t,
          cantidad: parseInt(t.cantidad),
          total: parseFloat(t.total)
        }))
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener estadísticas"
    }, { status: 500 });
  }
}
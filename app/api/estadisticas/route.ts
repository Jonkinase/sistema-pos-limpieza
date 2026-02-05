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
    const ventasHoy: any = db.prepare(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE DATE(fecha) = DATE('now', 'localtime')
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
    `).get(isEncargado ? [sucursal_id] : []);

    // Total de ventas del mes
    const ventasMes: any = db.prepare(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
    `).get(isEncargado ? [sucursal_id] : []);

    // Ventas por sucursal (del mes)
    let ventasPorSucursal: any[] = [];
    if (!isEncargado) {
      ventasPorSucursal = db.prepare(`
        SELECT s.nombre, COUNT(v.id) as cantidad, COALESCE(SUM(v.total), 0) as total
        FROM sucursales s
        LEFT JOIN ventas v ON s.id = v.sucursal_id 
          AND strftime('%Y-%m', v.fecha) = strftime('%Y-%m', 'now', 'localtime')
        GROUP BY s.id, s.nombre
      `).all();
    }

    // Total de deuda pendiente
    const deudaTotal: any = db.prepare(`
      SELECT COALESCE(SUM(saldo_deuda), 0) as total
      FROM clientes
      WHERE saldo_deuda > 0
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
    `).get(isEncargado ? [sucursal_id] : []);

    // Clientes con deuda
    const clientesConDeuda: any = db.prepare(`
      SELECT COUNT(*) as cantidad
      FROM clientes
      WHERE saldo_deuda > 0
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
    `).get(isEncargado ? [sucursal_id] : []);

    // Presupuestos pendientes
    const presupuestosPendientes: any = db.prepare(`
      SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
      FROM presupuestos
      WHERE estado = 'pendiente'
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
    `).get(isEncargado ? [sucursal_id] : []);

    // Top 5 productos más vendidos (del mes)
    const topProductos = db.prepare(`
      SELECT 
        p.nombre,
        COALESCE(SUM(dv.cantidad_litros), 0) as litros_vendidos,
        COALESCE(SUM(dv.subtotal), 0) as total_vendido
      FROM productos p
      LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
      LEFT JOIN ventas v ON dv.venta_id = v.id
        AND strftime('%Y-%m', v.fecha) = strftime('%Y-%m', 'now', 'localtime')
      WHERE 1=1
      ${isEncargado ? 'AND v.sucursal_id = ?' : ''}
      GROUP BY p.id, p.nombre
      ORDER BY litros_vendidos DESC
      LIMIT 5
    `).all(isEncargado ? [sucursal_id] : []);

    // Ventas contado vs fiado (del mes)
    const ventasPorTipo = db.prepare(`
      SELECT 
        tipo_venta,
        COUNT(*) as cantidad,
        COALESCE(SUM(total), 0) as total
      FROM ventas
      WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now', 'localtime')
      ${isEncargado ? 'AND sucursal_id = ?' : ''}
      GROUP BY tipo_venta
    `).all(isEncargado ? [sucursal_id] : []);

    return NextResponse.json({
      success: true,
      estadisticas: {
        hoy: {
          cantidad: ventasHoy.cantidad,
          total: ventasHoy.total
        },
        mes: {
          cantidad: ventasMes.cantidad,
          total: ventasMes.total
        },
        sucursales: ventasPorSucursal,
        deudas: {
          total: deudaTotal.total,
          clientes: clientesConDeuda.cantidad
        },
        presupuestos: {
          pendientes: presupuestosPendientes.cantidad,
          total: presupuestosPendientes.total
        },
        topProductos: topProductos,
        ventasPorTipo: ventasPorTipo
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al obtener estadísticas"
    }, { status: 500 });
  }
}
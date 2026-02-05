import db from "@/lib/db/database";
import { verifyAuthToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const user = token ? verifyAuthToken(token) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";
    const formato = (searchParams.get("formato") || "excel").toLowerCase();

    // Si es encargado, forzar su sucursal_id
    const isEncargado = user.rol === "encargado";
    const sucursal_id = user.sucursal_id;

    // Rango de fechas: por defecto, mes actual
    let whereClause = "";
    const params: any[] = [];

    if (desde && hasta) {
      whereClause = "WHERE v.fecha::date BETWEEN $1::date AND $2::date";
      params.push(desde, hasta);
    } else {
      whereClause = `
        WHERE TO_CHAR(v.fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      `;
    }

    // Filtro de sucursal
    if (isEncargado) {
      whereClause += ` AND v.sucursal_id = $${params.length + 1}`;
      params.push(sucursal_id);
    }

    const result = await db.query(
      `
      SELECT 
        v.id,
        v.fecha,
        s.nombre AS sucursal,
        COALESCE(c.nombre, '') AS cliente,
        v.tipo_venta,
        v.total,
        v.pagado
      FROM ventas v
      JOIN sucursales s ON v.sucursal_id = s.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${whereClause}
      ORDER BY v.fecha DESC
    `,
      params
    );
    const rows = result.rows;

    if (formato === "excel" || formato === "csv") {
      const headers = [
        "ID",
        "Fecha",
        "Sucursal",
        "Cliente",
        "Tipo de venta",
        "Total",
        "Pagado",
      ];

      const csvRows: string[] = [];
      csvRows.push(headers.join(";"));

      for (const row of rows) {
        csvRows.push(
          [
            row.id,
            row.fecha,
            row.sucursal,
            row.cliente,
            row.tipo_venta,
            row.total,
            row.pagado,
          ]
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(";")
        );
      }

      const csvContent = csvRows.join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="reporte_ventas.csv"',
        },
      });
    }

    // Si se pide otro formato no soportado
    return new Response(
      JSON.stringify({
        success: false,
        error: "Formato no soportado. Usa ?formato=excel",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error al generar reporte de ventas", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al generar reporte de ventas",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


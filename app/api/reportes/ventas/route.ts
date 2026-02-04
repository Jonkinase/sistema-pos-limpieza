import db from "@/lib/db/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";
    const formato = (searchParams.get("formato") || "excel").toLowerCase();

    // Rango de fechas: por defecto, mes actual
    let whereClause = "";
    const params: any[] = [];

    if (desde && hasta) {
      whereClause = "WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)";
      params.push(desde, hasta);
    } else {
      whereClause = `
        WHERE strftime('%Y-%m', v.fecha) = strftime('%Y-%m', 'now', 'localtime')
      `;
    }

    const rows: any[] = db
      .prepare(
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
      `
      )
      .all(...params);

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


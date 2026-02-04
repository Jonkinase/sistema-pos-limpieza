import db from "@/lib/db/database";

export async function GET() {
  try {
    const rows: any[] = db
      .prepare(
        `
        SELECT 
          c.id,
          c.nombre,
          c.telefono,
          c.saldo_deuda
        FROM clientes c
        WHERE c.activo = 1
          AND c.saldo_deuda > 0
        ORDER BY c.saldo_deuda DESC
      `
      )
      .all();

    const headers = ["ID", "Nombre", "Teléfono", "Saldo Deuda"];

    const csvRows: string[] = [];
    csvRows.push(headers.join(";"));

    for (const row of rows) {
      csvRows.push(
        [
          row.id,
          row.nombre,
          row.telefono || "",
          row.saldo_deuda,
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
          'attachment; filename="reporte_deudas_clientes.csv"',
      },
    });
  } catch (error) {
    console.error("Error al generar reporte de deudas", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al generar reporte de deudas",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


import db from "@/lib/db/database";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

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

    const query = sucursal_id
      ? `
        SELECT 
          c.id,
          c.nombre,
          c.telefono,
          c.saldo_deuda
        FROM clientes c
        WHERE c.activo = 1
          AND c.saldo_deuda > 0
          AND c.sucursal_id = $1
        ORDER BY c.saldo_deuda DESC
      `
      : `
        SELECT 
          c.id,
          c.nombre,
          c.telefono,
          c.saldo_deuda
        FROM clientes c
        WHERE c.activo = 1
          AND c.saldo_deuda > 0
          AND c.sucursal_id IS NULL
        ORDER BY c.saldo_deuda DESC
      `;

    const result = await db.query(query, sucursal_id ? [sucursal_id] : []);
    const rows = result.rows;

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


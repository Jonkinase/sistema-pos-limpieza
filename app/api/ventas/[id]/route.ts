import db from "@/lib/db/database";
import { NextResponse } from "next/server";

type RouteParams = {
  params: {
    id: string;
  };
};

// Next.js 15+ requirement: params is a Promise
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ventaId = Number(id);

    if (Number.isNaN(ventaId)) {
      return NextResponse.json(
        { success: false, error: "ID de venta inválido" },
        { status: 400 }
      );
    }

    const ventaResult = await db.query(
      `
      SELECT 
        v.*,
        s.nombre AS sucursal_nombre,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono
      FROM ventas v
      JOIN sucursales s ON v.sucursal_id = s.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = $1
    `,
      [ventaId]
    );
    const venta = ventaResult.rows[0];

    if (!venta) {
      return NextResponse.json(
        { success: false, error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    const itemsResult = await db.query(
      `
      SELECT 
        dv.*,
        COALESCE(dv.producto_nombre, p.nombre) AS producto_nombre,
        p.tipo AS producto_tipo
      FROM detalle_ventas dv
      LEFT JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = $1
    `,
      [ventaId]
    );
    const items = itemsResult.rows;

    return NextResponse.json(
      {
        success: true,
        venta,
        items,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al obtener detalle de venta", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener detalle de venta",
      },
      { status: 500 }
    );
  }
}


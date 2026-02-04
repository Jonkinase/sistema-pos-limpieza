import db from "@/lib/db/database";
import { NextResponse } from "next/server";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ventaId = Number(params.id);
    if (Number.isNaN(ventaId)) {
      return NextResponse.json(
        { success: false, error: "ID de venta inválido" },
        { status: 400 }
      );
    }

    const venta: any = db
      .prepare(
        `
        SELECT 
          v.*,
          s.nombre AS sucursal_nombre,
          c.nombre AS cliente_nombre,
          c.telefono AS cliente_telefono
        FROM ventas v
        JOIN sucursales s ON v.sucursal_id = s.id
        LEFT JOIN clientes c ON v.cliente_id = c.id
        WHERE v.id = ?
      `
      )
      .get(ventaId);

    if (!venta) {
      return NextResponse.json(
        { success: false, error: "Venta no encontrada" },
        { status: 404 }
      );
    }

    const items: any[] = db
      .prepare(
        `
        SELECT 
          dv.*,
          p.nombre AS producto_nombre
        FROM detalle_ventas dv
        JOIN productos p ON dv.producto_id = p.id
        WHERE dv.venta_id = ?
      `
      )
      .all(ventaId);

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


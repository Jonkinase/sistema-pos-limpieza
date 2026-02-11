import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { producto_id, monto_pesos, sucursal_id } = body;

    if (!sucursal_id) {
      return NextResponse.json({ success: false, error: "Sucursal ID es requerido" }, { status: 400 });
    }

    // Obtener producto y su configuración en esta sucursal (precio y activo)
    const result = await db.query(`
      SELECT p.nombre, p.tipo, p.litros_minimo_mayorista as global_minimo,
             s.precio_minorista, s.precio_mayorista, s.activo
      FROM productos p
      JOIN stock s ON p.id = s.producto_id
      WHERE p.id = $1 AND s.sucursal_id = $2
    `, [producto_id, sucursal_id]);

    const item = result.rows[0];

    if (!item) {
      return NextResponse.json({
        success: false,
        error: "Producto no encontrado en esta sucursal"
      }, { status: 404 });
    }

    if (item.activo === 0) {
      return NextResponse.json({
        success: false,
        error: "Este producto no está disponible en esta sucursal"
      }, { status: 400 });
    }

    // Paso 1: Calcular litros con precio minorista inicial
    const precio_minorista = parseFloat(item.precio_minorista);
    const precio_mayorista = parseFloat(item.precio_mayorista);
    const litros_minimo_mayorista = parseFloat(item.global_minimo);

    let litros = monto_pesos / precio_minorista;
    let precio_final_por_litro = precio_minorista;
    let tipo_precio = 'minorista';

    // Paso 2: Verificar si alcanza para mayorista
    if (item.tipo !== 'alimento' && litros >= litros_minimo_mayorista) {
      // Recalcular con precio mayorista
      litros = monto_pesos / precio_mayorista;
      precio_final_por_litro = precio_mayorista;
      tipo_precio = 'mayorista';
    }

    // Calcular total final (por si acaso hay decimales)
    const total = litros * precio_final_por_litro;

    return NextResponse.json({
      success: true,
      producto: item.nombre,
      litros: parseFloat(litros.toFixed(2)),
      precio_por_litro: precio_final_por_litro,
      tipo_precio: tipo_precio,
      total: parseFloat(total.toFixed(2)),
      ahorro: tipo_precio === 'mayorista'
        ? parseFloat(((precio_minorista - precio_mayorista) * litros).toFixed(2))
        : 0
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error al calcular"
    }, { status: 500 });
  }
}
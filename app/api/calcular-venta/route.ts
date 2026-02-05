import db from "@/lib/db/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { producto_id, monto_pesos } = body;

    // Obtener producto
    const result = await db.query('SELECT * FROM productos WHERE id = $1', [producto_id]);
    const producto = result.rows[0];

    if (!producto) {
      return NextResponse.json({
        success: false,
        error: "Producto no encontrado"
      }, { status: 404 });
    }

    // Paso 1: Calcular litros con precio minorista inicial
    const precio_minorista = parseFloat(producto.precio_minorista);
    const precio_mayorista = parseFloat(producto.precio_mayorista);
    const litros_minimo_mayorista = parseFloat(producto.litros_minimo_mayorista);

    let litros = monto_pesos / precio_minorista;
    let precio_final_por_litro = precio_minorista;
    let tipo_precio = 'minorista';

    // Paso 2: Verificar si alcanza para mayorista
    if (litros >= litros_minimo_mayorista) {
      // Recalcular con precio mayorista
      litros = monto_pesos / precio_mayorista;
      precio_final_por_litro = precio_mayorista;
      tipo_precio = 'mayorista';
    }

    // Calcular total final (por si acaso hay decimales)
    const total = litros * precio_final_por_litro;

    return NextResponse.json({
      success: true,
      producto: producto.nombre,
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
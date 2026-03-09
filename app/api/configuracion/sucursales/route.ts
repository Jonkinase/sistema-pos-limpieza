import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db/database";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, direccion } = body;

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 });
        }

        const result = await db.query(
            'INSERT INTO sucursales (nombre, direccion, activo) VALUES ($1, $2, 1) RETURNING id',
            [nombre, direccion]
        );

        return NextResponse.json({
            success: true,
            id: result.rows[0].id,
            message: "Sucursal creada correctamente"
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al crear la sucursal" }, { status: 500 });
    }
}

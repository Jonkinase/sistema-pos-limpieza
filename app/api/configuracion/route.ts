import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db/database";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const negocioResult = await db.query('SELECT * FROM negocio LIMIT 1');
        const negocio = negocioResult.rows[0];
        
        const sucursalesResult = await db.query('SELECT * FROM sucursales ORDER BY id');
        const sucursales = sucursalesResult.rows;

        return NextResponse.json({ success: true, negocio, sucursales });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al obtener la configuración" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, direccion, telefono, cuit } = body;

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 });
        }

        await db.query(
            'UPDATE negocio SET nombre=$1, direccion=$2, telefono=$3, cuit=$4 WHERE id=1',
            [nombre, direccion, telefono, cuit]
        );

        return NextResponse.json({ success: true, message: "Configuración actualizada correctamente" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al actualizar la configuración" }, { status: 500 });
    }
}

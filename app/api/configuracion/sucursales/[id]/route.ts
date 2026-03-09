import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db/database";
import { getUserFromRequest } from "@/lib/auth";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const client = await db.connect();
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { nombre, direccion, activo } = body;

        if (!nombre) {
            return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 });
        }

        await client.query('BEGIN');

        // Si activo pasa a 0, aplicar cascada
        if (activo === 0) {
            await client.query('UPDATE productos SET activo = 0 WHERE sucursal_id = $1', [id]);
            await client.query('UPDATE usuarios SET activo = 0 WHERE sucursal_id = $1', [id]);
        }

        await client.query(
            'UPDATE sucursales SET nombre=$1, direccion=$2, activo=$3 WHERE id=$4',
            [nombre, direccion, activo, id]
        );

        await client.query('COMMIT');

        return NextResponse.json({ success: true, message: "Sucursal actualizada correctamente" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al actualizar la sucursal" }, { status: 500 });
    } finally {
        client.release();
    }
}

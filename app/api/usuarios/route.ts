import { NextResponse } from "next/server";
import db from "@/lib/db/database";
import bcrypt from "bcryptjs";
import { verifyAuthToken } from "@/lib/auth";

// Middleware auxiliar para verificar rol de administrador
function getUserFromRequest(request: Request) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
    const token = cookies['auth_token'];
    if (!token) return null;
    return verifyAuthToken(token);
}

export async function GET(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || (user.rol !== 'admin' && user.rol !== 'encargado')) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        let queryStr = `
            SELECT u.id, u.nombre, u.email, u.rol, u.sucursal_id, s.nombre as sucursal_nombre, u.creado_en
            FROM usuarios u
            LEFT JOIN sucursales s ON u.sucursal_id = s.id
        `;
        let params: any[] = [];

        if (user.rol === 'encargado') {
            queryStr += ` WHERE u.sucursal_id = $1 AND u.rol != 'admin'`;
            params.push(user.sucursal_id);
        }

        queryStr += ` ORDER BY u.creado_en DESC`;

        const result = await db.query(queryStr, params);
        const usuarios = result.rows;

        return NextResponse.json({ success: true, usuarios });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al obtener usuarios" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || (user.rol !== 'admin' && user.rol !== 'encargado')) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        let { nombre, email, password, rol, sucursal_id } = body;

        // Si es encargado, forzar su sucursal y rol vendedor
        if (user.rol === 'encargado') {
            sucursal_id = user.sucursal_id;
            rol = 'vendedor';
        }

        if (!nombre || !email || !password || !rol) {
            return NextResponse.json({ success: false, error: "Faltan datos requeridos" }, { status: 400 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, sucursal_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [nombre, email, passwordHash, rol, sucursal_id || null]);

        return NextResponse.json({
            success: true,
            id: result.rows[0].id,
            message: "Usuario creado correctamente"
        });

    } catch (error: any) {
        console.error(error);
        if (error.code === '23505') { // PostgreSQL code for unique_violation
            return NextResponse.json({ success: false, error: "El email ya está registrado" }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: "Error al crear usuario" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || (user.rol !== 'admin' && user.rol !== 'encargado')) {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
        if (Number(id) === user.id) return NextResponse.json({ success: false, error: "No puedes eliminar tu propio usuario" }, { status: 400 });

        // Verificar permisos de eliminación
        const targetResult = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        const targetUser = targetResult.rows[0];
        if (!targetUser) return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 });

        if (user.rol === 'encargado') {
            if (targetUser.sucursal_id !== user.sucursal_id || targetUser.rol !== 'vendedor') {
                return NextResponse.json({ success: false, error: "No tienes permiso para eliminar este usuario" }, { status: 403 });
            }
        } else if (user.rol === 'admin') {
            if (targetUser.rol === 'admin' && parseInt(targetUser.id) === 1) { // Proteger admin principal
                return NextResponse.json({ success: false, error: "No se puede eliminar el administrador raíz" }, { status: 400 });
            }
        }

        await db.query('DELETE FROM usuarios WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: "Usuario eliminado" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Error al eliminar usuario" }, { status: 500 });
    }
}

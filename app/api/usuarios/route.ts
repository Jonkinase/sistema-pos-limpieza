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
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const usuarios = db.prepare(`
      SELECT u.id, u.nombre, u.email, u.rol, u.sucursal_id, s.nombre as sucursal_nombre, u.creado_en
      FROM usuarios u
      LEFT JOIN sucursales s ON u.sucursal_id = s.id
      ORDER BY u.creado_en DESC
    `).all();

        return NextResponse.json({ success: true, usuarios });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Error al obtener usuarios" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, email, password, rol, sucursal_id } = body;

        if (!nombre || !email || !password || !rol) {
            return NextResponse.json({ success: false, error: "Faltan datos requeridos" }, { status: 400 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const result = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, sucursal_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre, email, passwordHash, rol, sucursal_id || null);

        return NextResponse.json({
            success: true,
            id: result.lastInsertRowid,
            message: "Usuario creado correctamente"
        });

    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return NextResponse.json({ success: false, error: "El email ya está registrado" }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: "Error al crear usuario" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const user = getUserFromRequest(request);
        if (!user || user.rol !== 'admin') {
            return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
        if (Number(id) === user.id) return NextResponse.json({ success: false, error: "No puedes eliminar tu propio usuario" }, { status: 400 });

        db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);

        return NextResponse.json({ success: true, message: "Usuario eliminado" });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Error al eliminar usuario" }, { status: 500 });
    }
}

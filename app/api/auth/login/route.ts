import { NextResponse } from 'next/server';
import db from '@/lib/db/database';
import bcrypt from 'bcryptjs';
import { AUTH_COOKIE_NAME, signAuthToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const result = await db.query(
      'SELECT id, nombre, email, password_hash, rol, sucursal_id FROM usuarios WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const token = signAuthToken({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      sucursal_id: user.sucursal_id
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          sucursal_id: user.sucursal_id
        },
      },
      { status: 200 }
    );

    const isProd = process.env.NODE_ENV === 'production';

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en login', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';
const JWT_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';

export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  sucursal_id?: number | null;
};

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      sucursal_id: user.sucursal_id
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

export function verifyAuthToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): AuthUser | null {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export { AUTH_COOKIE_NAME };


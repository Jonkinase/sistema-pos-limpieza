import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifyAuthToken, AuthUser } from './auth';

export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

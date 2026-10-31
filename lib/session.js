import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const key = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function createSession(user) {
  const token = await new SignJWT({ id: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(key());
  cookies().set('session', token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 8 * 3600,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function getSession() {
  const token = cookies().get('session')?.value;
  if (!token) return null;
  try { return (await jwtVerify(token, key())).payload; } catch { return null; }
}

export const destroySession = () => cookies().delete('session');

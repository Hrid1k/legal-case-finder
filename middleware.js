import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const token = req.cookies.get('session')?.value;
  let ok = false;
  if (token) {
    try { await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET)); ok = true; } catch {}
  }
  if (!ok) {
    if (req.nextUrl.pathname.startsWith('/api'))
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!login|api/auth|_next|favicon.ico).*)'] };

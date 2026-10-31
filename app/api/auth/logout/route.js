import { destroySession } from '@/lib/session';
export async function POST() { destroySession(); return Response.json({ ok: true }); }

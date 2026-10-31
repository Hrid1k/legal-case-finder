import { getSession } from '@/lib/session';
export async function GET() {
  const s = await getSession();
  return s ? Response.json({ id: s.id, name: s.name, role: s.role })
           : Response.json({ error: 'Not logged in' }, { status: 401 });
}

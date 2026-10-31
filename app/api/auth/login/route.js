import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/session';
import { handle } from '@/lib/api';

export const POST = handle(async (req) => {
  const { email, password } = await req.json();
  const r = await query('SELECT id, name, role, password_hash FROM users WHERE email = $1',
    [String(email || '').toLowerCase()]);
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash)))
    return Response.json({ error: 'Invalid email or password' }, { status: 401 });
  await createSession(u);
  return Response.json({ id: u.id, name: u.name, role: u.role });
});

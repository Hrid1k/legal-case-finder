import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/session';
import { handle } from '@/lib/api';

// Self-registration always creates a 'lawyer'. Admins are created via seed only.
export const POST = handle(async (req) => {
  const { name, email, password } = await req.json();
  if (!name || !email || !password || password.length < 8)
    return Response.json({ error: 'Name, email and a password of 8+ chars are required' }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  const r = await query(
    `INSERT INTO users(name, email, password_hash, role) VALUES ($1, lower($2), $3, 'lawyer')
     RETURNING id, name, role`, [name, email, hash]);
  await createSession(r.rows[0]);
  return Response.json(r.rows[0], { status: 201 });
});

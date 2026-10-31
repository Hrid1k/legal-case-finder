import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

export const PATCH = handle(async (req, { params }) => {
  const { s, res } = await guard(); if (res) return res;
  const { status } = await req.json();
  // column-level GRANT + RLS: a lawyer can only change status, only on own rows
  const r = await query('UPDATE assignments SET status = $1 WHERE id = $2', [status, Number(params.id)], s);
  if (!r.rowCount) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req, { params }) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  await query('DELETE FROM assignments WHERE id = $1', [Number(params.id)], s);
  return Response.json({ ok: true });
});

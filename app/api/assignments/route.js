import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

// Row Level Security decides rows: admin sees all, a lawyer only their own.
export const GET = handle(async () => {
  const { s, res } = await guard(); if (res) return res;
  const sql = s.role === 'admin'
    ? `SELECT a.id, a.status, a.assigned_at, c.id AS case_id, c.case_number, c.title, u.name AS lawyer
       FROM assignments a JOIN cases c ON c.id = a.case_id JOIN users u ON u.id = a.lawyer_id
       ORDER BY a.assigned_at DESC`
    : `SELECT a.id, a.status, a.assigned_at, c.id AS case_id, c.case_number, c.title
       FROM assignments a JOIN cases c ON c.id = a.case_id ORDER BY a.assigned_at DESC`;
  return Response.json((await query(sql, [], s)).rows);
});

// Admin: CALL stored procedure (trigger enforces role + workload rules)
export const POST = handle(async (req) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const { case_id, lawyer_id } = await req.json();
  await query('CALL assign_case($1, $2)', [case_id, lawyer_id], s);
  return Response.json({ ok: true }, { status: 201 });
});

import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

export const GET = handle(async () => {
  const { s, res } = await guard(); if (res) return res;
  const [courts, judges, lawyers, cases] = await Promise.all([
    query('SELECT id, name FROM courts ORDER BY name', [], s),
    query('SELECT id, name, court_id FROM judges ORDER BY name', [], s),
    s.role === 'admin' ? query(`SELECT id, name, email FROM users WHERE role='lawyer' ORDER BY name`, [], s)
                       : Promise.resolve({ rows: [] }),
    query('SELECT id, case_number, title FROM cases ORDER BY case_number', [], s),
  ]);
  return Response.json({ courts: courts.rows, judges: judges.rows, lawyers: lawyers.rows, cases: cases.rows });
});

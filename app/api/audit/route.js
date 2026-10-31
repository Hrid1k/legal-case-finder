import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

export const GET = handle(async () => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const r = await query(
    `SELECT l.id, l.table_name, l.action, l.record_id, l.changed_at, l.details, u.name AS user_name
     FROM audit_log l LEFT JOIN users u ON u.id = l.user_id
     ORDER BY l.id DESC LIMIT 50`, [], s);
  return Response.json(r.rows);
});

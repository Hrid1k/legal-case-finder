import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

// Admin only: per-lawyer workload from the v_lawyer_workload VIEW
export const GET = handle(async () => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const r = await query(
    `SELECT id, name, active_cases, completed_cases, free_slots, last_assigned
     FROM v_lawyer_workload
     ORDER BY active_cases DESC, name`, [], s);
  return Response.json(r.rows);
});

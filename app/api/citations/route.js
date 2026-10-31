import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

export const POST = handle(async (req) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const { citing, cited } = await req.json();
  await query('INSERT INTO case_citations(citing_case_id, cited_case_id) VALUES ($1,$2)', [citing, cited], s);
  return Response.json({ ok: true }, { status: 201 });
});

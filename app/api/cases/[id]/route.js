import { query, tx } from '@/lib/db';
import { guard, handle } from '@/lib/api';
import { embed } from '@/lib/embed';

export const GET = handle(async (_req, { params }) => {
  const { s, res } = await guard(); if (res) return res;
  const id = Number(params.id);
  const [c, chain, similar] = await Promise.all([
    query(`SELECT c.*, ct.name AS court, j.name AS judge, fn_citation_count(c.id) AS cited_by
           FROM cases c JOIN courts ct ON ct.id = c.court_id LEFT JOIN judges j ON j.id = c.judge_id
           WHERE c.id = $1`, [id], s),
    // RECURSIVE CTE: walk the citation graph (cycle-safe, depth-limited)
    query(`WITH RECURSIVE chain AS (
             SELECT cited_case_id AS case_id, 1 AS depth, ARRAY[$1::int, cited_case_id] AS path
             FROM case_citations WHERE citing_case_id = $1
             UNION ALL
             SELECT cc.cited_case_id, ch.depth + 1, ch.path || cc.cited_case_id
             FROM case_citations cc JOIN chain ch ON cc.citing_case_id = ch.case_id
             WHERE NOT cc.cited_case_id = ANY(ch.path) AND ch.depth < 5)
           SELECT c.id, c.case_number, c.title, MIN(ch.depth) AS depth
           FROM chain ch JOIN cases c ON c.id = ch.case_id
           GROUP BY c.id, c.case_number, c.title ORDER BY depth, c.title`, [id], s),
    // VECTOR similarity: nearest neighbours of this case's own embedding
    query(`SELECT c.id, c.case_number, c.title,
                  1 - (e.embedding <=> (SELECT embedding FROM case_embeddings WHERE case_id = $1)) AS similarity
           FROM case_embeddings e JOIN cases c ON c.id = e.case_id
           WHERE e.case_id <> $1
           ORDER BY e.embedding <=> (SELECT embedding FROM case_embeddings WHERE case_id = $1) LIMIT 5`, [id], s),
  ]);
  if (!c.rows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ case: c.rows[0], citations: chain.rows, similar: similar.rows });
});

export const PUT = handle(async (req, { params }) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const b = await req.json(), id = Number(params.id);
  const vec = await embed(`${b.title}. ${b.summary}`);
  await tx(s, async (c) => {
    await c.query(
      `UPDATE cases SET title=$1, court_id=$2, judge_id=$3, category=$4, status=$5, decided_on=$6, summary=$7
       WHERE id=$8`,
      [b.title, b.court_id, b.judge_id || null, b.category, b.status, b.decided_on || null, b.summary, id]);
    // vector UPDATE: re-embed so semantic search stays in sync with the text
    await c.query(
      `INSERT INTO case_embeddings(case_id, embedding) VALUES ($1, $2::vector)
       ON CONFLICT (case_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`, [id, vec]);
  });
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req, { params }) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const r = await query('DELETE FROM cases WHERE id = $1', [Number(params.id)], s); // cascades to embedding
  return Response.json({ deleted: r.rowCount });
});

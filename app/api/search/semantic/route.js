import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';
import { embed } from '@/lib/embed';

// Semantic search: embed the query, rank cases by cosine distance (pgvector <=>)
export const POST = handle(async (req) => {
  const { s, res } = await guard(); if (res) return res;
  const { query: text, category } = await req.json();
  if (!text || text.trim().length < 3)
    return Response.json({ error: 'Enter at least 3 characters' }, { status: 400 });
  const vec = await embed(text);
  const p = [vec]; let filter = '';
  if (category) { p.push(category); filter = `WHERE c.category = $2`; }
  const r = await query(
    `SELECT c.id, c.case_number, c.title, c.category, c.status, c.decided_on, ct.name AS court,
            fn_citation_count(c.id) AS cited_by,
            1 - (e.embedding <=> $1::vector) AS similarity
     FROM case_embeddings e
     JOIN cases c ON c.id = e.case_id JOIN courts ct ON ct.id = c.court_id
     ${filter}
     ORDER BY e.embedding <=> $1::vector LIMIT 10`, p, s);
  return Response.json(r.rows);
});

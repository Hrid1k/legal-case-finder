import { query, tx } from '@/lib/db';
import { guard, handle } from '@/lib/api';
import { embed } from '@/lib/embed';

// Keyword (full-text) search + filters
export const GET = handle(async (req) => {
  const { s, res } = await guard(); if (res) return res;
  const sp = new URL(req.url).searchParams;
  const q = sp.get('q'), court = sp.get('court'), category = sp.get('category'), status = sp.get('status');
  const where = [], p = [];
  let rank = '0::real', order = 'c.decided_on DESC NULLS LAST';
  if (q) {
    p.push(q);
    where.push(`c.search_vec @@ websearch_to_tsquery('english', $${p.length})`);
    rank = `ts_rank(c.search_vec, websearch_to_tsquery('english', $${p.length}))`;
    order = 'rank DESC';
  }
  if (court)    { p.push(court);    where.push(`c.court_id = $${p.length}`); }
  if (category) { p.push(category); where.push(`c.category = $${p.length}`); }
  if (status)   { p.push(status);   where.push(`c.status = $${p.length}`); }
  const r = await query(
    `SELECT c.id, c.case_number, c.title, c.category, c.status, c.decided_on, ct.name AS court,
            fn_citation_count(c.id) AS cited_by, ${rank} AS rank
     FROM cases c JOIN courts ct ON ct.id = c.court_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY ${order} LIMIT 50`, p, s);
  return Response.json(r.rows);
});

// Admin: create case + its embedding atomically (one transaction)
export const POST = handle(async (req) => {
  const { s, res } = await guard(['admin']); if (res) return res;
  const b = await req.json();
  const vec = await embed(`${b.title}. ${b.summary}`);
  const out = await tx(s, async (c) => {
    const r = await c.query(
      `INSERT INTO cases(case_number, title, court_id, judge_id, category, status, decided_on, summary, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [b.case_number, b.title, b.court_id, b.judge_id || null, b.category,
       b.status || 'decided', b.decided_on || null, b.summary, s.id]);
    await c.query('INSERT INTO case_embeddings(case_id, embedding) VALUES ($1, $2::vector)', [r.rows[0].id, vec]);
    return r.rows[0];
  });
  return Response.json(out, { status: 201 });
});

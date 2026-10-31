import { query } from '@/lib/db';
import { guard, handle } from '@/lib/api';

export const GET = handle(async () => {
  const { s, res } = await guard(); if (res) return res;
  const [courts, categories, notable, topCited] = await Promise.all([
    query('SELECT * FROM v_court_stats ORDER BY total_cases DESC', [], s),             // VIEW
    query(`SELECT category, COUNT(*)::int AS n, MIN(decided_on) AS earliest
           FROM cases GROUP BY category HAVING COUNT(*) >= 2 ORDER BY n DESC`, [], s),  // GROUP BY + HAVING
    query(`SELECT c.case_number, c.title, ct.name AS court, fn_citation_count(c.id) AS cited_by
           FROM cases c JOIN courts ct ON ct.id = c.court_id
           WHERE fn_citation_count(c.id) >
                 (SELECT AVG(fn_citation_count(c2.id)) FROM cases c2 WHERE c2.court_id = c.court_id)
           ORDER BY cited_by DESC`, [], s),                                              // correlated subquery
    query(`SELECT c.case_number, c.title, fn_citation_count(c.id) AS cited_by
           FROM cases c ORDER BY cited_by DESC, c.title LIMIT 5`, [], s),
  ]);
  return Response.json({ courts: courts.rows, categories: categories.rows,
                         notable: notable.rows, topCited: topCited.rows });
});

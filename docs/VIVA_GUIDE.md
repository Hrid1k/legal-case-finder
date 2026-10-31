# Viva guide – be able to explain every piece

**30-second pitch:** "Lawyers search precedent by keyword, which misses synonyms. We store judgments in PostgreSQL and a meaning-vector per case with pgvector, so you can search by describing the situation. SQL handles integrity, roles and assignments."

| Question | Answer |
|---|---|
| Why PostgreSQL + pgvector, not MongoDB? | Data is relational (FKs, M:N, transactions). Vectors in the same DB means text and embedding change in one transaction and can be joined/filtered with SQL. |
| What is an embedding? | A fixed-length list of numbers (384) from a model, so similar meanings get nearby vectors. |
| Which metric & why? | Cosine distance (`<=>`): compares direction, not length; vectors are normalised. |
| What is HNSW? | Approximate nearest-neighbour graph index; avoids scanning every vector. |
| Where is auth/authorization? | Login → bcrypt compare → JWT httpOnly cookie. Middleware blocks anonymous. Route handlers check role. DB: `SET LOCAL ROLE` + GRANTs + RLS. |
| Why RLS? | Even with an app bug, a lawyer's DB role cannot read another lawyer's assignments. |
| Show a trigger | `trg_validate_assignment`: lawyer role + max 5 active; assign a 6th live. |
| Show a transaction | `POST /api/cases`: case + embedding; failure rolls both back. |
| Show recursive CTE | Case detail → citation chain; the `path` array stops infinite loops. |
| Password storage? | bcrypt hash (10 rounds). Credentials only in `.env`. |
| Normal form? | 3NF/BCNF; explain judges/courts split and the M:N tables. |

## Modifications examiners may ask for (practise)
1. Add a column (e.g. `cases.jurisdiction`): `ALTER TABLE` + show in UI.
2. New role "clerk" (read-only + add citations): extend CHECK, add role in `03_roles.sql`, map in `lib/db.js`.
3. Workload cap 5 → 3: edit `trg_validate_assignment`.
4. Similarity threshold: `WHERE 1 - (embedding <=> q) > 0.4` in the semantic route.
5. New report (judges with most cases): JOIN + GROUP BY + HAVING.

## Demo order (~8 min)
Problem → ER diagram → `\d cases` in psql → lawyer: keyword vs semantic search → case detail (CTE + similar) → forbidden admin page → admin: add case, assign, hit the 5-case limit, audit log → show trigger/procedure SQL → Git history (both members) → test table.

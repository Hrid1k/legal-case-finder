#  Legal Case Finder

Search past court judgments by **keyword** (PostgreSQL full-text) and by **meaning** (pgvector semantic search). Built for PES University DBMS Experiential Learning – Level 3.

**Stack:** Next.js 14 (App Router + Route Handlers) · PostgreSQL 16 + pgvector · JWT cookie auth (bcrypt) · local embedding model (all-MiniLM-L6-v2, 384-d)

## Setup

Requirements: Node 20.6+, Docker (or a local PostgreSQL 15+ with the `pgvector` extension).

```bash
# 1. Database (PostgreSQL + pgvector)
docker run -d --name legaldb -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=legalcases \
  -p 5432:5432 pgvector/pgvector:pg16

# 2. App
cp .env.example .env          # edit JWT_SECRET
npm install
npm run db:setup              # runs db/01_schema.sql, 02_advanced.sql, 03_roles.sql
npm run db:seed               # sample data + embeddings (first run downloads ~25MB model)
npm run dev                   # http://localhost:3000
```

Demo logins: `admin@legal.test / Admin@123` · `lawyer1@legal.test / Lawyer@123`

## Roles
| Role | Can do |
|---|---|
| **admin** | add/edit/delete cases, citations, assign cases to lawyers, view audit log |
| **lawyer** | search (keyword + semantic), read cases, see only *own* assignments, mark them completed |

Enforced in three layers: Next.js middleware + route guards, PostgreSQL roles with GRANTs (`legal_admin`, `legal_lawyer`, applied per request via `SET LOCAL ROLE`), and Row Level Security on `assignments`.

## Layout
```
db/        01_schema.sql (DDL) · 02_advanced.sql (view, function, triggers, procedure) · 03_roles.sql (RBAC + RLS)
lib/       db.js (pool, transactions, role switching) · session.js (JWT) · embed.js · api.js
app/api/   route handlers (auth, cases, search/semantic, stats, assignments, audit, citations, meta)
app/       pages: login, dashboard, cases search, case detail, assignments, admin
scripts/   setup-db.js · seed.js
docs/      DOCUMENTATION.md (report) · VIVA_GUIDE.md
```

## Security notes
Credentials only via `.env` (git-ignored) · bcrypt hashes · httpOnly JWT cookie · parameterised queries · DB-level validation (CHECK/UNIQUE/FK) · least-privilege DB roles. All seeded case data is **fictional**.

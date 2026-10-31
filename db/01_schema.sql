-- ============================================================
-- Legal Case Finder : DDL (PostgreSQL 15+ with pgvector)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- DROP (re-runnable setup)
DROP TABLE IF EXISTS audit_log, assignments, case_citations, case_embeddings,
                     cases, judges, courts, users CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE
                CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash TEXT NOT NULL,                       -- bcrypt hash, never plain text
  role          VARCHAR(10) NOT NULL DEFAULT 'lawyer'
                CHECK (role IN ('admin','lawyer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courts (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(150) NOT NULL UNIQUE,
  level VARCHAR(10) NOT NULL CHECK (level IN ('supreme','high','district')),
  city  VARCHAR(80) NOT NULL
);

CREATE TABLE judges (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  court_id INT NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
  UNIQUE (name, court_id)
);

CREATE TABLE cases (
  id          SERIAL PRIMARY KEY,
  case_number VARCHAR(40) NOT NULL UNIQUE,
  title       VARCHAR(200) NOT NULL,
  court_id    INT NOT NULL REFERENCES courts(id) ON DELETE RESTRICT,
  judge_id    INT REFERENCES judges(id) ON DELETE SET NULL,
  category    VARCHAR(20) NOT NULL CHECK (category IN
              ('property','privacy','employment','ip','consumer','environment',
               'contract','family','criminal','medical','tax')),
  status      VARCHAR(10) NOT NULL DEFAULT 'decided'
              CHECK (status IN ('pending','decided','appealed')),
  decided_on  DATE CHECK (decided_on <= CURRENT_DATE),
  summary     TEXT NOT NULL CHECK (length(summary) >= 30),
  created_by  INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- full-text search column, maintained automatically by PostgreSQL
  search_vec  tsvector GENERATED ALWAYS AS (
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,''))
              ) STORED
);

-- Vector store: one 384-d embedding per case (all-MiniLM-L6-v2)
CREATE TABLE case_embeddings (
  case_id    INT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  embedding  vector(384) NOT NULL,
  model      VARCHAR(60) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-referencing M:N : a case cites other cases
CREATE TABLE case_citations (
  citing_case_id INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  cited_case_id  INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  PRIMARY KEY (citing_case_id, cited_case_id),
  CHECK (citing_case_id <> cited_case_id)
);

-- M:N between cases and lawyers (users)
CREATE TABLE assignments (
  id          SERIAL PRIMARY KEY,
  case_id     INT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  lawyer_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, lawyer_id)
);

CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(40) NOT NULL,
  action     VARCHAR(10) NOT NULL,
  record_id  INT,
  user_id    INT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details    JSONB
);

-- ALTER demonstration
ALTER TABLE judges ADD COLUMN appointed_year INT
  CHECK (appointed_year BETWEEN 1950 AND 2100);

-- INDEXES
CREATE INDEX idx_cases_court    ON cases(court_id);
CREATE INDEX idx_cases_category ON cases(category);
CREATE INDEX idx_cases_decided  ON cases(decided_on DESC);
CREATE INDEX idx_cases_fts      ON cases USING GIN (search_vec);
CREATE INDEX idx_embed_hnsw     ON case_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_assign_lawyer  ON assignments(lawyer_id, status);
CREATE INDEX idx_cites_cited    ON case_citations(cited_case_id);

-- ============================================================
-- Database-level RBAC : two roles + Row Level Security
-- The app does SET LOCAL ROLE legal_admin / legal_lawyer per request.
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'legal_admin')  THEN CREATE ROLE legal_admin  NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'legal_lawyer') THEN CREATE ROLE legal_lawyer NOLOGIN; END IF;
END $$;

GRANT legal_admin, legal_lawyer TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO legal_admin, legal_lawyer;

-- ADMIN : full control of legal data, read-only on users/audit (no password hash)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON cases, courts, judges, case_embeddings, case_citations, assignments TO legal_admin;
GRANT SELECT (id, name, email, role, created_at) ON users TO legal_admin;
GRANT SELECT ON audit_log, v_court_stats TO legal_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO legal_admin;

-- LAWYER : read-only research access; may only update status of own assignments
GRANT SELECT ON cases, courts, judges, case_embeddings, case_citations, v_court_stats TO legal_lawyer;
GRANT SELECT ON assignments TO legal_lawyer;
GRANT UPDATE (status) ON assignments TO legal_lawyer;

GRANT EXECUTE ON FUNCTION fn_citation_count(INT) TO legal_admin, legal_lawyer;
GRANT EXECUTE ON PROCEDURE assign_case(INT, INT) TO legal_admin;
REVOKE EXECUTE ON PROCEDURE assign_case(INT, INT) FROM PUBLIC;

-- ROW LEVEL SECURITY : a lawyer only sees / updates their own assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_admin_all ON assignments;
DROP POLICY IF EXISTS p_lawyer_own ON assignments;
CREATE POLICY p_admin_all  ON assignments TO legal_admin USING (true) WITH CHECK (true);
CREATE POLICY p_lawyer_own ON assignments TO legal_lawyer
  USING (lawyer_id = NULLIF(current_setting('app.user_id', true), '')::int);

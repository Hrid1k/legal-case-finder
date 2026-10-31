-- ============================================================
-- Advanced features: view, function, triggers, procedure
-- ============================================================

-- VIEW : per-court statistics
CREATE OR REPLACE VIEW v_court_stats AS
SELECT ct.id, ct.name, ct.level,
       COUNT(c.id)                                   AS total_cases,
       COUNT(*) FILTER (WHERE c.status = 'pending')  AS pending_cases,
       MAX(c.decided_on)                             AS latest_decision
FROM courts ct
LEFT JOIN cases c ON c.court_id = ct.id
GROUP BY ct.id, ct.name, ct.level;

-- FUNCTION : how many cases cite this case
CREATE OR REPLACE FUNCTION fn_citation_count(p_case INT) RETURNS INT
LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::int FROM case_citations WHERE cited_case_id = p_case;
$$;

-- TRIGGER 1 : keep updated_at fresh
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER touch_cases BEFORE UPDATE ON cases
FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- TRIGGER 2 : generic audit trail (SECURITY DEFINER so low-privilege roles
-- can cause an audit row without having INSERT rights on audit_log)
CREATE OR REPLACE FUNCTION trg_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec JSONB := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  INSERT INTO audit_log(table_name, action, record_id, user_id, details)
  VALUES (TG_TABLE_NAME, TG_OP, (rec->>'id')::int,
          NULLIF(current_setting('app.user_id', true), '')::int,
          CASE WHEN TG_TABLE_NAME = 'cases'
               THEN jsonb_build_object('case_number', rec->>'case_number', 'title', rec->>'title')
               ELSE rec END);
  RETURN NULL;
END $$;

CREATE TRIGGER audit_cases AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH ROW EXECUTE FUNCTION trg_audit();
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON assignments
FOR EACH ROW EXECUTE FUNCTION trg_audit();

-- TRIGGER 3 : business rules on assignment (role + workload cap of 5 active)
CREATE OR REPLACE FUNCTION trg_validate_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role VARCHAR; v_active INT;
BEGIN
  SELECT role INTO v_role FROM users WHERE id = NEW.lawyer_id;
  IF v_role IS DISTINCT FROM 'lawyer' THEN
    RAISE EXCEPTION 'User % is not a lawyer', NEW.lawyer_id;
  END IF;
  SELECT COUNT(*) INTO v_active FROM assignments
   WHERE lawyer_id = NEW.lawyer_id AND status = 'active';
  IF v_active >= 5 THEN
    RAISE EXCEPTION 'Lawyer % already has 5 active cases', NEW.lawyer_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER validate_assignment BEFORE INSERT ON assignments
FOR EACH ROW EXECUTE FUNCTION trg_validate_assignment();

-- STORED PROCEDURE : assign a case to a lawyer (validated, atomic)
CREATE OR REPLACE PROCEDURE assign_case(p_case INT, p_lawyer INT)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cases WHERE id = p_case) THEN
    RAISE EXCEPTION 'Case % does not exist', p_case;
  END IF;
  INSERT INTO assignments(case_id, lawyer_id) VALUES (p_case, p_lawyer);
END $$;

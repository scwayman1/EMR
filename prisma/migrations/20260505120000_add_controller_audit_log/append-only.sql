-- EMR-470 — Append-only enforcement for ControllerAuditLog.
--
-- Apply this AFTER `migration.sql` has run. It must be applied by a
-- privileged DB user (not the app role) so the app role loses UPDATE and
-- DELETE on the audit table while retaining INSERT and SELECT.
--
-- Replace `:app_role` with the actual app DB role used in your environment
-- (e.g. `app_user`, `leafjourney_app`, etc.). The Render staging role and
-- the prod role are NOT the same — apply once per environment.
--
-- This is intentionally NOT a Prisma-managed migration step: Prisma needs
-- UPDATE/DELETE on every table it owns to run future migrations under the
-- migrator role. The migrator role should be a different DB role from the
-- app role (the runtime connection in DATABASE_URL).

-- 1. Grant the minimum the app needs.
GRANT INSERT, SELECT ON TABLE "ControllerAuditLog" TO :"app_role";

-- 2. Revoke mutate/delete from the app role explicitly. (REVOKE is a no-op
--    if the privilege was never granted, but we list it for clarity and so
--    re-running this script is idempotent against schema drift.)
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "ControllerAuditLog" FROM :"app_role";

-- 3. Belt-and-suspenders: a row-level trigger that refuses UPDATE/DELETE
--    even if a future grant slips through. Compliance review will look for
--    this.
CREATE OR REPLACE FUNCTION controller_audit_log_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ControllerAuditLog is append-only (op=%)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS controller_audit_log_no_update ON "ControllerAuditLog";
CREATE TRIGGER controller_audit_log_no_update
  BEFORE UPDATE ON "ControllerAuditLog"
  FOR EACH ROW EXECUTE FUNCTION controller_audit_log_append_only();

DROP TRIGGER IF EXISTS controller_audit_log_no_delete ON "ControllerAuditLog";
CREATE TRIGGER controller_audit_log_no_delete
  BEFORE DELETE ON "ControllerAuditLog"
  FOR EACH ROW EXECUTE FUNCTION controller_audit_log_append_only();

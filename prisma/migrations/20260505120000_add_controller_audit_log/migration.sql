-- EMR-470 — Practice Onboarding Controller audit log (append-only).
--
-- Every controller mutation (template/config/wizard/publish/rollback) writes
-- a row here via logControllerAction() in src/lib/auth/audit-stub.ts.
--
-- Append-only enforcement is in append-only.sql (sibling file). Ops must
-- apply that grant script as a privileged DB user AFTER this migration runs;
-- Prisma cannot revoke its own UPDATE/DELETE without losing the ability to
-- run future migrations. See README.md in this directory.

CREATE TABLE "ControllerAuditLog" (
  "id"             TEXT PRIMARY KEY,
  "at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId"    TEXT NOT NULL,
  "actorEmail"     TEXT,
  "actorRoles"     "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[],
  "organizationId" TEXT,
  "action"         TEXT NOT NULL,
  "subjectType"    TEXT NOT NULL DEFAULT 'controller',
  "subjectId"      TEXT NOT NULL,
  "before"         JSONB,
  "after"          JSONB,
  "reason"         TEXT
);

CREATE INDEX "ControllerAuditLog_subjectId_at_idx"
  ON "ControllerAuditLog" ("subjectId", "at");
CREATE INDEX "ControllerAuditLog_organizationId_at_idx"
  ON "ControllerAuditLog" ("organizationId", "at");
CREATE INDEX "ControllerAuditLog_actorUserId_at_idx"
  ON "ControllerAuditLog" ("actorUserId", "at");

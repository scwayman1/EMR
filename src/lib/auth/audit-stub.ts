// EMR-470: name retained as 'audit-stub' for import-path stability across the storm. Body is now real persistence.
//
// Every mutation on the Practice Onboarding Controller surface (templates,
// configs, wizard saves, publish/rollback, etc.) MUST call
// `logControllerAction()` so we have a record of who-did-what. Rows land in
// `ControllerAuditLog` (see prisma/schema.prisma). The table is append-only
// at the DB grant + trigger level — see
// `prisma/migrations/20260505120000_add_controller_audit_log/append-only.sql`.
//
// Failure mode: a single insert. If it fails (DB down, schema drift, etc.)
// we `console.error` and resolve — a missing audit row never blocks a
// controller mutation. v1 trades durability for write availability.
//
// TODO(EMR-470 follow-up): wrap the insert in a durable queue so we can
// retry on transient failures without coupling controller latency to audit
// writes.

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { AuthedUser } from "./session";

/**
 * Snapshot of an entity for before/after diffing in the audit trail.
 * Intentionally typed as JSON-ish to avoid coupling to any specific Prisma
 * model — the controller operates over heterogeneous configs/templates.
 */
export type AuditSnapshot = Record<string, unknown> | null | undefined;

export interface ControllerAuditEntry {
  /** The user performing the mutation. Pulled from `requireImplementationAdmin()`. */
  actor: Pick<AuthedUser, "id" | "email" | "roles" | "organizationId">;
  /**
   * Dot-namespaced action. Examples:
   *   - "controller.template.create"
   *   - "controller.config.publish"
   *   - "controller.config.rollback"
   *   - "controller.wizard.step.save"
   */
  action: string;
  /** ID of the object being mutated (template id, config id, practice id, etc.). */
  targetId: string;
  /** Optional snapshot of the entity prior to the mutation. */
  before?: AuditSnapshot;
  /** Optional snapshot of the entity after the mutation. */
  after?: AuditSnapshot;
  /** Optional human-supplied reason — e.g. for rollback or manual override. */
  reason?: string;
}

/**
 * Record a controller mutation to `ControllerAuditLog`.
 *
 * Mapping (kept identical to the stub's prior payload shape so call sites
 * never had to change):
 *   - `actor.id`             → ControllerAuditLog.actorUserId
 *   - `actor.email`          → ControllerAuditLog.actorEmail
 *   - `actor.roles`          → ControllerAuditLog.actorRoles
 *   - `actor.organizationId` → ControllerAuditLog.organizationId
 *   - `action`               → ControllerAuditLog.action
 *   - `"controller"`         → ControllerAuditLog.subjectType
 *   - `targetId`             → ControllerAuditLog.subjectId
 *   - `before` / `after`     → ControllerAuditLog.before / .after (Json)
 *   - `reason`               → ControllerAuditLog.reason
 */
export async function logControllerAction(entry: ControllerAuditEntry): Promise<void> {
  // Json columns: Prisma's `JsonNull` is the in-DB JSON null; `DbNull`
  // leaves the column SQL NULL. We use SQL NULL when the caller didn't
  // supply a snapshot — keeps the column index-friendly and matches the
  // "absent" semantics callers expect.
  const before: Prisma.InputJsonValue | typeof Prisma.DbNull =
    entry.before == null ? Prisma.DbNull : (entry.before as Prisma.InputJsonValue);
  const after: Prisma.InputJsonValue | typeof Prisma.DbNull =
    entry.after == null ? Prisma.DbNull : (entry.after as Prisma.InputJsonValue);

  const data = {
    actorUserId: entry.actor.id,
    actorEmail: entry.actor.email ?? null,
    actorRoles: entry.actor.roles ?? [],
    organizationId: entry.actor.organizationId ?? null,
    action: entry.action,
    subjectType: "controller" as const,
    subjectId: entry.targetId,
    before,
    after,
    reason: entry.reason ?? null,
  };

  // Retry transient failures with exponential backoff (~50, ~100, ~200ms).
  // Total worst-case added latency ~350ms.
  const MAX_ATTEMPTS = 3;
  const BACKOFF_BASE_MS = 50;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.controllerAuditLog.create({ data });
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, BACKOFF_BASE_MS * 2 ** attempt));
      }
    }
  }

  const fallback = {
    at: new Date().toISOString(),
    attempts: MAX_ATTEMPTS,
    actorUserId: entry.actor.id,
    actorEmail: entry.actor.email ?? null,
    actorRoles: entry.actor.roles ?? [],
    organizationId: entry.actor.organizationId ?? null,
    action: entry.action,
    subjectType: "controller",
    subjectId: entry.targetId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  };

  // Best-effort Sentry capture — required so log-aggregator alerts can fire
  // when audit writes are silently failing in prod. Lazy require so this
  // module remains testable when Sentry isn't initialized.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs") as {
      captureMessage?: (
        m: string,
        c?: { level?: string; extra?: Record<string, unknown> },
      ) => void;
    };
    Sentry.captureMessage?.("audit:controller:persist_failed", {
      level: "error",
      extra: fallback,
    });
  } catch {
    // Sentry not loaded — fall through to the console fallback below.
  }

  // eslint-disable-next-line no-console -- intentional fallback path
  console.error("[audit:controller:persist_failed]", JSON.stringify(fallback));
}

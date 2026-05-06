// EMR-428 — Controller mutation audit log (stub).
//
// Every mutation on the Practice Onboarding Controller surface (templates,
// configs, wizard saves, publish/rollback, etc.) MUST call
// `logControllerAction()` so we have a record of who-did-what once the
// AuditLog persistence lands in EMR-470.
//
// Today this just emits a structured `console.log` line. The signature is
// stable: when EMR-470 lands, only the body of this function changes — call
// sites stay put.

import "server-only";

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
 * Record a controller mutation. Stub today; persisted in EMR-470.
 *
 * TODO(EMR-470): persist to AuditLog table once schema lands. The mapping is:
 *   - `actor.id`             → AuditLog.actorUserId
 *   - `actor.organizationId` → AuditLog.organizationId
 *   - `action`               → AuditLog.action
 *   - `"controller"`         → AuditLog.subjectType
 *   - `targetId`             → AuditLog.subjectId
 *   - `{ before, after, reason, actorRoles }` → AuditLog.metadata
 */
export async function logControllerAction(entry: ControllerAuditEntry): Promise<void> {
  // Keep the payload shape identical to the eventual AuditLog row so call
  // sites never have to change once EMR-470 lands.
  const payload = {
    at: new Date().toISOString(),
    actorUserId: entry.actor.id,
    actorEmail: entry.actor.email,
    actorRoles: entry.actor.roles,
    organizationId: entry.actor.organizationId,
    action: entry.action,
    subjectType: "controller",
    subjectId: entry.targetId,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  };

  // eslint-disable-next-line no-console -- intentional stub; EMR-470 swaps for prisma.auditLog.create
  console.log("[audit:controller]", JSON.stringify(payload));
}

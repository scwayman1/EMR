// ---------------------------------------------------------------------------
// Orchestration guards
// ---------------------------------------------------------------------------
// Small, pure invariant checks agents can run before writing. These encode
// security boundaries that must never be violated, regardless of caller.
// ---------------------------------------------------------------------------

/**
 * Error thrown when an agent attempts to act on an entity that belongs to a
 * different organization than the invoking scope. This is a hard security
 * boundary — callers should let it propagate and fail the job.
 */
export class OrgScopeViolationError extends Error {
  readonly entityKind: string;
  readonly entityId: string;
  readonly entityOrgId: string;
  readonly inputOrgId: string;

  constructor(
    entityKind: string,
    entityId: string,
    entityOrgId: string,
    inputOrgId: string,
  ) {
    super(
      `Org scope violation: ${entityKind} ${entityId} org=${entityOrgId} ` +
        `vs input=${inputOrgId}`,
    );
    this.name = "OrgScopeViolationError";
    this.entityKind = entityKind;
    this.entityId = entityId;
    this.entityOrgId = entityOrgId;
    this.inputOrgId = inputOrgId;
  }
}

/**
 * Throw if an entity's organization doesn't match the invoking organization.
 * No-op on exact match. Used to prevent cross-tenant writes when an agent
 * loads an entity by id before acting on it.
 *
 * Pure — no I/O, safe to unit-test.
 */
export function assertOrgMatch(
  entityOrgId: string,
  inputOrgId: string,
  entityKind: string,
  entityId: string,
): void {
  if (entityOrgId !== inputOrgId) {
    throw new OrgScopeViolationError(
      entityKind,
      entityId,
      entityOrgId,
      inputOrgId,
    );
  }
}

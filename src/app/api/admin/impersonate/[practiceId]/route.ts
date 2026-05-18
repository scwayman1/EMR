// EMR-742 — Enter "View as practice" impersonation.
//
// POST /api/admin/impersonate/[practiceId]
//
// Auth: super_admin only. MFA gate runs BEFORE the cookie is issued —
// see `requireRecentMfa()` (stub in EMR-742, real impl in EMR-725). On
// success we:
//   1. Issue the signed impersonation cookie (HttpOnly, Secure,
//      SameSite=Lax, 30-min TTL).
//   2. Emit a `super_admin.impersonation_start` row to
//      ControllerAuditLog so the entry is auditable forever.
//   3. Return a small JSON body the client can read to know where to
//      land — usually the practice's home dashboard.
//
// Why this route deliberately does NOT use `withAdminMutation`:
//
//   `withAdminMutation` forwards the Request into requireApiAuth's
//   impersonation read-only gate. That gate would refuse THIS route as
//   a mutation if an impersonation cookie were somehow already set —
//   which is exactly the wrong behaviour for an enter route. (The user
//   should be able to re-enter impersonation against a different
//   practice without exiting first; the cookie is overwritten in
//   place.) So we call requireApiAuth directly without `request` and
//   accept that we lose the rate-limit + auto-audit conveniences here.
//   This route writes its own (richer) audit row anyway.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireApiAuth } from "@/lib/auth/api-gate";
import { requireRecentMfa } from "@/lib/auth/mfa-gate";
import { logControllerAction } from "@/lib/auth/audit-stub";
import {
  IMPERSONATION_TTL_MS,
  setImpersonationCookie,
  type ImpersonationSession,
} from "@/lib/auth/impersonation";
import { logger } from "@/lib/observability/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { practiceId: string } },
) {
  const gate = await requireApiAuth({ role: "super_admin" });
  if (gate.error) return gate.error;
  const actor = gate.actor;

  const { practiceId } = params;
  if (!practiceId) {
    return NextResponse.json(
      { error: "missing_practice_id" },
      { status: 400 },
    );
  }

  // MFA gate. EMR-725 will fill in the body of requireRecentMfa; until
  // then it returns ok-true. The denial branch is wired so the swap
  // is a one-line change.
  const mfa = await requireRecentMfa(actor, { purpose: "impersonation" });
  if (!mfa.ok) {
    return NextResponse.json(
      {
        error: "mfa_required",
        reason: mfa.reason,
        message:
          "A recent MFA challenge is required before entering impersonation.",
      },
      { status: 403 },
    );
  }

  // Resolve the target practice. The drill-in page accepts both
  // PracticeConfiguration.id and Organization.id; we mirror that here
  // so the "View as practice" button can pass whichever it has.
  const org = await resolveOrgFromPracticeOrConfigId(practiceId);
  if (!org) {
    return NextResponse.json(
      { error: "practice_not_found" },
      { status: 404 },
    );
  }

  const startedAt = Date.now();
  const expiresAt = startedAt + IMPERSONATION_TTL_MS;
  const session: ImpersonationSession = {
    impersonatorUserId: actor.id,
    practiceOrgId: org.id,
    practiceName: org.name,
    startedAt,
    expiresAt,
  };

  await setImpersonationCookie(session);

  // Audit row — written AFTER the cookie is set so the audit reflects
  // a state that is actually live. If the audit insert fails, the
  // logControllerAction helper logs to Sentry + structured log and
  // resolves; the impersonation session still exists (consistent with
  // every other admin mutation surface). That trade-off is documented
  // in audit-stub.ts.
  try {
    await logControllerAction({
      actor: {
        id: actor.id,
        email: actor.email,
        roles: actor.roles,
        organizationId: actor.organizationId,
      },
      action: "super_admin.impersonation_start",
      targetId: org.id,
      after: {
        practiceOrgId: org.id,
        practiceName: org.name,
        startedAt,
        expiresAt,
      },
      reason: `Super-admin entered impersonation of ${org.name}.`,
    });
  } catch (err) {
    logger.error({
      event: "impersonation.audit_start_failed",
      actorId: actor.id,
      orgId: org.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    ok: true,
    session: {
      practiceOrgId: org.id,
      practiceName: org.name,
      startedAt,
      expiresAt,
    },
  });
}

/**
 * The drill-in page accepts either a PracticeConfiguration.id or an
 * Organization.id in its [id] segment. The "View as practice" button
 * might pass us either; resolve both and return the Organization row.
 */
async function resolveOrgFromPracticeOrConfigId(
  id: string,
): Promise<{ id: string; name: string } | null> {
  // Try Organization first — cheapest and the common case for the
  // drill-in entry point.
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (org) return org;

  // Fall back: PracticeConfiguration.id → Organization.
  const config = await prisma.practiceConfiguration.findUnique({
    where: { id },
    select: {
      organization: { select: { id: true, name: true } },
    },
  });
  return config?.organization ?? null;
}

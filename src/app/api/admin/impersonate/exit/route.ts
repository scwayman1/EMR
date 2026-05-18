// EMR-742 — Exit "View as practice" impersonation.
//
// POST /api/admin/impersonate/exit
//
// Always succeeds idempotently: clears the cookie (if present) and
// emits an `impersonation_end` audit row when there was an active
// session. Calling this with no active session is a no-op and returns
// 200 — that simplifies the client (the "Stop impersonating" button
// can fire without checking state first).
//
// Like the enter route, this route deliberately does NOT use
// `withAdminMutation` because the read-only impersonation gate would
// 403 the very call that's trying to terminate the impersonation
// session.

import { NextResponse, type NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/auth/api-gate";
import { logControllerAction } from "@/lib/auth/audit-stub";
import {
  clearImpersonationCookie,
  readImpersonationFromCookies,
} from "@/lib/auth/impersonation";
import { logger } from "@/lib/observability/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  // We require an authenticated super-admin to exit — same role gate as
  // enter. (Without this, a leaked cookie could be cleared anonymously,
  // which is arguably *good* but conflicts with the audit-row design:
  // the audit row needs an actor.)
  const gate = await requireApiAuth({ role: "super_admin" });
  if (gate.error) return gate.error;
  const actor = gate.actor;

  let priorSession = null;
  try {
    priorSession = await readImpersonationFromCookies(actor.id);
  } catch (err) {
    logger.warn({
      event: "impersonation.exit_cookie_read_failed",
      actorId: actor.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Clear the cookie unconditionally — even if there is no verified
  // session, we want to scrub any stale cookie value (mismatched user
  // id, expired, etc.) so the browser doesn't keep sending it.
  await clearImpersonationCookie();

  if (priorSession) {
    const endedAt = Date.now();
    const durationSec = Math.max(
      0,
      Math.floor((endedAt - priorSession.startedAt) / 1000),
    );
    try {
      await logControllerAction({
        actor: {
          id: actor.id,
          email: actor.email,
          roles: actor.roles,
          organizationId: actor.organizationId,
        },
        action: "super_admin.impersonation_end",
        targetId: priorSession.practiceOrgId,
        before: {
          practiceOrgId: priorSession.practiceOrgId,
          practiceName: priorSession.practiceName,
          startedAt: priorSession.startedAt,
          expiresAt: priorSession.expiresAt,
        },
        after: {
          endedAt,
          durationSec,
        },
        reason: `Super-admin exited impersonation of ${priorSession.practiceName} (duration ${durationSec}s).`,
      });
    } catch (err) {
      logger.error({
        event: "impersonation.audit_end_failed",
        actorId: actor.id,
        orgId: priorSession.practiceOrgId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    cleared: !!priorSession,
  });
}

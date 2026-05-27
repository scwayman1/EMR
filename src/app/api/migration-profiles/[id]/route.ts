// EMR-453 — Migration Profile read endpoint.
//
// GET /api/migration-profiles/[id]
//   Returns the profile if its parent PracticeConfiguration exists.
//
// Auth: gated by requireImplementationAdmin for v1. The "may a practice_admin
// view their own profile?" relaxation belongs to a follow-up ticket — for
// now any non-Implementation-Admin caller is rejected.
//
// Audited via logControllerAction (read events are tracked too — the audit
// log is the canonical record of who looked at a config's migration plan).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";
import { logControllerAction } from "@/lib/auth/audit-stub";
import {
  withAuthErrors,
  notFound,
} from "@/app/api/configs/_helpers";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  return (await withAuthErrors(async () => {
    const admin = await requireImplementationAdmin();

    const profile = await prisma.migrationProfile.findUnique({
      where: { id: params.id },
    });
    if (!profile) return notFound();

    // Verify the parent configuration still exists. A profile whose parent
    // was hard-deleted is functionally orphaned and should not leak.
    const parent = await prisma.practiceConfiguration.findUnique({
      where: { id: profile.configurationId },
      select: { id: true },
    });
    if (!parent) return notFound();

    await logControllerAction({
      actor: admin,
      action: "controller.migration_profile.read",
      targetId: profile.id,
    });

    return NextResponse.json(profile);
  })) as NextResponse;
}

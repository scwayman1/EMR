// EMR-044 / EMR-147 — Licensing posture API.
//
// Returns the current organization's modular licensing posture: active
// tier, included modules, add-ons, à-la-carte availability, and the
// stubbed external EHR connection state. Drives the operator licensing
// console and any downstream partner audits.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildLicensingPosture,
  loadEntitlement,
} from "@/lib/platform/licensing";
import { defaultEntitlement } from "@/lib/platform/modules";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const organizationId = user.organizationId ?? "demo-org";
  const entitlement = user.organizationId
    ? await loadEntitlement(organizationId)
    : defaultEntitlement(organizationId);

  return NextResponse.json(buildLicensingPosture(entitlement));
}

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/log";

// EMR-398 — compliance audit trail for the Leafmart age-gate consent
// checkbox. The storefront is anonymous, so this route is intentionally
// public; the IP + timestamp + user-agent line in server logs is the
// evidence we keep for regulators. We never store this in the database
// (no schema change in this PR), so there is no PII at rest beyond the
// existing log infrastructure.

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

type ConsentPayload = {
  confirmedAt?: string;
};

export async function POST(request: Request) {
  let body: ConsentPayload = {};
  try {
    body = (await request.json()) as ConsentPayload;
  } catch {
    // Empty body is fine — server adds receivedAt regardless.
  }

  logger.info({
    event: "leafmart.age_gate.consent",
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? "unknown",
    clientConfirmedAt: body.confirmedAt ?? null,
    receivedAt: new Date().toISOString(),
  });

  return new NextResponse(null, { status: 204 });
}

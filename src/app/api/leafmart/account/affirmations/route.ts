import { NextResponse } from "next/server";

/**
 * EMR-337 — record account-creation liability affirmations.
 *
 * Audit log entry: timestamp (server-side), IP (from request), user-agent
 * (from client body), version hash, and the list of affirmation ids the
 * user checked. Persistence is intentionally minimal here so the gate
 * works ahead of the dedicated `liability_affirmation` table migration.
 *
 * When the table ships, replace the console.info log below with a
 * Prisma create — the request shape stays the same.
 */
export const runtime = "nodejs";

interface AffirmationsBody {
  version?: unknown;
  affirmations?: unknown;
  userAgent?: unknown;
}

export async function POST(req: Request) {
  let body: AffirmationsBody;
  try {
    body = (await req.json()) as AffirmationsBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const version = typeof body.version === "string" ? body.version : null;
  const affirmations = Array.isArray(body.affirmations)
    ? body.affirmations.filter((v): v is string => typeof v === "string")
    : [];
  const userAgent = typeof body.userAgent === "string" ? body.userAgent : null;

  if (!version || affirmations.length === 0) {
    return NextResponse.json(
      { error: "Missing version or affirmations" },
      { status: 400 },
    );
  }

  // Prefer the standard reverse-proxy headers; fall back to the platform-
  // specific ones (Vercel) before giving up.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null;

  const record = {
    version,
    affirmations,
    userAgent,
    ip,
    occurredAt: new Date().toISOString(),
  };

  // Audit log — surfaced to the platform log aggregator until the
  // dedicated table ships. Keep this line stable so log-search alerts
  // can pivot off it.
  console.info("[liability_affirmation]", JSON.stringify(record));

  return NextResponse.json({ ok: true, occurredAt: record.occurredAt });
}

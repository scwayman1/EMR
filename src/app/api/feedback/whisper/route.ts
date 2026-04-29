import { NextResponse } from "next/server";
import {
  classifyWhisper,
  validateSubmission,
  type ClassifiedWhisper,
} from "@/lib/domain/whisper-feedback";

// EMR-128 — Whisper inbox.
//
// In-memory ring buffer until persistence lands. The route exists to
// validate the FAB's submission contract end-to-end and to give the
// operator inbox a real fetch target. Production swaps the buffer for
// a Prisma write + a fan-out to Dr. Patel + Scott Wayman's C-Suite inbox.
const RING_CAP = 500;
const ring: ClassifiedWhisper[] = [];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = validateSubmission(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const classified = classifyWhisper(parsed.value);
  // Newest first; cap the buffer.
  ring.unshift(classified);
  if (ring.length > RING_CAP) ring.length = RING_CAP;

  return NextResponse.json({
    ok: true,
    id: classified.id,
    sentiment: classified.sentiment,
    area: classified.area,
    cSuiteRoute: classified.cSuiteRoute,
  });
}

// GET is intentionally limited to the most recent N entries and stripped of
// the annotation data URL — the operator inbox component fetches full
// records server-side, not from this public-ish endpoint.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20"));
  const items = ring.slice(0, limit).map((w) => ({
    id: w.id,
    receivedAt: w.receivedAt,
    sentiment: w.sentiment,
    area: w.area,
    cSuiteRoute: w.cSuiteRoute,
    pageUrl: w.pageUrl,
    excerpt: w.comment.length > 240 ? `${w.comment.slice(0, 237)}…` : w.comment,
  }));
  return NextResponse.json({ items, total: ring.length });
}

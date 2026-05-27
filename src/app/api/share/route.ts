// EMR-308 — Share analytics endpoint.
// Fire-and-forget POST from ShareDialog. V1 logs to stdout; once the
// telemetry pipeline is wired, this swaps to whatever is in
// `@/lib/integrations/analytics`.

import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const eventInput = z.object({
  target: z.string().min(1).max(40),
  source: z.string().min(1).max(40),
  url: z.string().url(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = eventInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // V1: console-log. Replace with the analytics pipeline call once it lands.
  console.info("share.event", {
    at: new Date().toISOString(),
    ...parsed.data,
  });

  return NextResponse.json({ ok: true });
}

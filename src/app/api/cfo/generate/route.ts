import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { dispatch } from "@/lib/orchestration/dispatch";
import { cfoAgent } from "@/lib/agents/cfo-agent";
import { createLightContext } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// POST /api/cfo/generate — fire the CFO agent for every org (or a single one).
//
// Body: {
//   organizationId?: string  // omit to run for all orgs (cron-friendly)
//   period?: "weekly" | "monthly" | "quarterly" | "annual" | "daily"
//   inline?: boolean         // true: run synchronously, false: dispatch event
// }
//
// Authenticated by Bearer token = process.env.CRON_SECRET (matches the rest
// of the cron-style routes on this app).
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  organizationId: z.string().optional(),
  period: z.enum(["weekly", "monthly", "quarterly", "annual", "daily"]).optional(),
  inline: z.boolean().optional(),
});

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // dev: open
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const { organizationId, period = "weekly", inline = false } = parsed.data;

  let orgIds: string[] = [];
  if (organizationId) {
    orgIds = [organizationId];
  } else {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    orgIds = orgs.map((o) => o.id);
  }

  if (inline) {
    const results = await Promise.all(
      orgIds.map(async (id) => {
        try {
          const ctx = createLightContext({ organizationId: id });
          const out = await cfoAgent.run({ organizationId: id, period }, ctx);
          return { organizationId: id, ok: true, briefingId: out.reportIds.briefing };
        } catch (err) {
          return { organizationId: id, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );
    return NextResponse.json({ ok: true, mode: "inline", results });
  }

  const dispatched = await Promise.all(
    orgIds.map((id) => dispatch({ name: "cfo.report.generate", organizationId: id, period })),
  );
  return NextResponse.json({
    ok: true,
    mode: "queued",
    organizations: orgIds.length,
    jobIds: dispatched.flat(),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to trigger the CFO agent." });
}

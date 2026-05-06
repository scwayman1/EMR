// EMR-470 — Read endpoint for the controller audit log.
//
// GET /api/audit?subjectId=...&organizationId=...&since=...&until=...&limit=...
//
// Gated by `requireImplementationAdmin` (super_admin or implementation_admin).
// Returns `{ items: ControllerAuditLog[], hasNext }`. Limit is capped at 200.
// EMR-471 builds the in-app admin search UI on top of this.

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";

export const runtime = "nodejs";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const queryInput = z.object({
  subjectId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  since: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid ISO date"))
    .optional(),
  until: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid ISO date"))
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((s) => Number.parseInt(s, 10))
    .optional(),
});

function asError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireImplementationAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHORIZED") return asError(401, "unauthorized");
    if (msg === "FORBIDDEN") return asError(403, "forbidden");
    throw err;
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = queryInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { subjectId, organizationId, since, until } = parsed.data;
  const limit = Math.min(parsed.data.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const where: Prisma.ControllerAuditLogWhereInput = {};
  if (subjectId) where.subjectId = subjectId;
  if (organizationId) where.organizationId = organizationId;
  if (since || until) {
    where.at = {};
    if (since) where.at.gte = new Date(since);
    if (until) where.at.lte = new Date(until);
  }

  // Fetch limit+1 so we can report `hasNext` without a separate count query.
  const rows = await prisma.controllerAuditLog.findMany({
    where,
    orderBy: [{ at: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasNext = rows.length > limit;
  const items = hasNext ? rows.slice(0, limit) : rows;

  return NextResponse.json({ items, hasNext });
}

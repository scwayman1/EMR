// EMR-002 — Dispensary directory.
//
// GET  /api/dispensary       — list dispensaries (Vendor.vendorType=licensed_dispensary)
// POST /api/dispensary       — register a new dispensary partner (operator only)
//
// SKU ingestion lives at /api/dispensary/[dispensaryId]/skus.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const CreateDispensarySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  takeRatePct: z.number().min(0).max(0.5).optional(),
  shippableStates: z.array(z.string().length(2)).optional(),
});

function isOperator(user: { roles: string[] }): boolean {
  return user.roles.includes("operator") || user.roles.includes("practice_owner");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  const rows = await prisma.vendor.findMany({
    where: {
      organizationId: user.organizationId,
      vendorType: "licensed_dispensary",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      shippableStates: true,
      takeRatePct: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ dispensaries: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isOperator(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!user.organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateDispensarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.format() },
      { status: 400 },
    );
  }

  const created = await prisma.vendor.create({
    data: {
      organizationId: user.organizationId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      vendorType: "licensed_dispensary",
      status: "pending",
      takeRatePct: parsed.data.takeRatePct ?? 0.1,
      shippableStates: parsed.data.shippableStates ?? [],
    },
    select: { id: true, slug: true, name: true, status: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "dispensary.registered",
      subjectType: "Vendor",
      subjectId: created.id,
      metadata: { slug: created.slug, name: created.name },
    },
  });

  return NextResponse.json({ dispensary: created }, { status: 201 });
}

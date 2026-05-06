// EMR-420 — Practices API for the Practice Onboarding wizard.
//
// GET   /api/practices?q=&orgId=  — search/list practices, optionally
//                                   filtered to a single organization.
// POST  /api/practices            — create a new practice under an org.
//
// Both endpoints are gated by requireImplementationAdmin() (EMR-428).

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import {
  NotImplementationAdminError,
  requireImplementationAdmin,
} from "@/lib/auth/super-admin";

export const runtime = "nodejs";

const COMMON_US_TIME_ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

const npiSchema = z
  .string()
  .regex(/^\d{10}$/u, "NPI must be exactly 10 digits")
  .optional();

const createPracticeSchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  name: z.string().trim().min(1, "Practice name is required").max(200),
  npi: npiSchema,
  street: z.string().trim().min(1, "Street is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/u, "State must be a 2-letter code")
    .transform((s) => s.toUpperCase()),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/u, "Postal code must be 5 or 9 digits"),
  timeZone: z
    .string()
    .trim()
    .min(1, "Time zone is required")
    .refine(
      (tz) => COMMON_US_TIME_ZONES.includes(tz as (typeof COMMON_US_TIME_ZONES)[number]),
      { message: "Unsupported time zone" },
    ),
  // Free-text label only. The actual specialty is selected in Step 2 and
  // persisted on PracticeConfiguration (EMR-409). We never branch on this
  // value — it exists purely as a hint for the implementation team.
  specialtyHint: z.string().trim().max(120).optional(),
});

function adminErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof NotImplementationAdminError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

export async function GET(req: Request) {
  try {
    await requireImplementationAdmin();
  } catch (err) {
    const res = adminErrorResponse(err);
    if (res) return res;
    throw err;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const orgId = url.searchParams.get("orgId")?.trim() ?? "";
  const take = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    50,
  );

  const where: Prisma.PracticeWhereInput = {};
  if (orgId) where.organizationId = orgId;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const practices = await prisma.practice.findMany({
    where,
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: { id: true, name: true, legalName: true, brandName: true },
      },
    },
  });

  return NextResponse.json({ practices });
}

export async function POST(req: Request) {
  try {
    await requireImplementationAdmin();
  } catch (err) {
    const res = adminErrorResponse(err);
    if (res) return res;
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createPracticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json(
      { error: "organization_not_found" },
      { status: 404 },
    );
  }

  const practice = await prisma.practice.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      npi: input.npi,
      street: input.street,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      timeZone: input.timeZone,
      specialtyHint: input.specialtyHint,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
    },
  });

  return NextResponse.json({ practice }, { status: 201 });
}

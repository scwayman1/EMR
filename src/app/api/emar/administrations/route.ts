// EMR-077 — EMAR administration record.
//
// POST /api/emar/administrations
//   Records that a dose was given (or refused / held / missed). The
//   record is append-only — to correct a prior entry, post a new
//   administration with `correctsAdministrationId` set.
//
// Until the Prisma EmarAdministration table exists this scaffold
// validates the payload, writes an AuditLog row, and returns the
// would-be administration body so UIs can be wired in parallel.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getFormulation } from "@/lib/emar/search";
import type { EmarAdministration } from "@/lib/emar/types";

export const runtime = "nodejs";

const RouteEnum = z.enum([
  "oral",
  "sublingual",
  "buccal",
  "topical",
  "intramuscular",
  "subcutaneous",
  "intravenous",
  "intranasal",
  "rectal",
  "ophthalmic",
  "otic",
  "inhalation",
]);

const SiteEnum = z.enum([
  "clinic",
  "home_self",
  "home_caregiver",
  "pharmacy",
  "facility",
]);

const StatusEnum = z.enum(["given", "refused", "held", "missed", "wasted"]);

const AdminSchema = z.object({
  patientId: z.string().min(1),
  formulationId: z.string().min(1),
  doseAmount: z.number().positive(),
  doseUnit: z.string().min(1).max(20),
  route: RouteEnum,
  site: SiteEnum,
  administeredAt: z.string().datetime().optional(),
  status: StatusEnum.default("given"),
  reasonCode: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
  regimenId: z.string().optional(),
  correctsAdministrationId: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.format() },
      { status: 400 },
    );
  }

  const formulation = getFormulation(parsed.data.formulationId);
  if (!formulation) {
    return NextResponse.json(
      { error: "unknown_formulation", formulationId: parsed.data.formulationId },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.findFirst({
    where: {
      id: parsed.data.patientId,
      organizationId: user.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  const record: EmarAdministration = {
    id: `emar_${Math.random().toString(36).slice(2, 12)}`,
    patientId: patient.id,
    formulationId: parsed.data.formulationId,
    doseAmount: parsed.data.doseAmount,
    doseUnit: parsed.data.doseUnit,
    route: parsed.data.route,
    site: parsed.data.site,
    administeredAt: parsed.data.administeredAt ?? new Date().toISOString(),
    administeredBy: user.id,
    status: parsed.data.status,
    reasonCode: parsed.data.reasonCode,
    notes: parsed.data.notes,
    regimenId: parsed.data.regimenId,
    correctsAdministrationId: parsed.data.correctsAdministrationId,
  };

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action:
        record.status === "given" ? "emar.administered" : `emar.${record.status}`,
      subjectType: "Patient",
      subjectId: patient.id,
      metadata: {
        emarId: record.id,
        formulationId: record.formulationId,
        drugName: formulation.drug.name,
        doseAmount: record.doseAmount,
        doseUnit: record.doseUnit,
        route: record.route,
        site: record.site,
        administeredAt: record.administeredAt,
        correctsAdministrationId: record.correctsAdministrationId ?? null,
      },
    },
  });

  return NextResponse.json({ administration: record }, { status: 201 });
}

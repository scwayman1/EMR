// EMR-013 — FHIR Encounter search.
//
// GET /api/fhir/Encounter?patient=PatientId
//   Returns a Bundle of all encounters for the named patient.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { encounterToFhir } from "@/lib/fhir/adapter";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const patientRef = url.searchParams.get("patient");
  if (!patientRef) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "required", diagnostics: "patient" }],
      },
      { status: 400 },
    );
  }
  const patientId = patientRef.replace(/^Patient\//, "");

  const encounters = await prisma.encounter.findMany({
    where: { patientId, organizationId: user.organizationId! },
    orderBy: { scheduledFor: "desc" },
    take: 100,
  });

  return NextResponse.json(
    {
      resourceType: "Bundle",
      type: "searchset",
      total: encounters.length,
      entry: encounters.map((e) => ({
        resource: encounterToFhir({
          id: e.id,
          patientId: e.patientId,
          startedAt: e.startedAt ?? e.scheduledFor ?? e.createdAt,
          endedAt: e.completedAt,
          status: e.status,
          reason: e.reason,
        }),
      })),
    },
    { headers: { "Content-Type": "application/fhir+json" } },
  );
}

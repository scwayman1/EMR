// EMR-013 — FHIR Patient/$everything operation.
//
// Returns a Bundle with the patient + all clinically-relevant
// resources (encounters, conditions, medications, observations).
// This is the canonical way other EMRs pull a chart in one shot.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  patientToFhir,
  encounterToFhir,
  buildPatientEverythingBundle,
} from "@/lib/fhir/adapter";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const patient = await prisma.patient.findFirst({
    where: { id, organizationId: user.organizationId!, deletedAt: null },
    include: { encounters: true },
  });
  if (!patient) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "not-found" }],
      },
      { status: 404 },
    );
  }

  const fhirPatient = patientToFhir({
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    dob: patient.dateOfBirth,
    sex: null,
    email: patient.email,
    phone: patient.phone,
    addressLine1: patient.addressLine1,
    addressLine2: patient.addressLine2,
    city: patient.city,
    state: patient.state,
    postalCode: patient.postalCode,
  });

  const fhirEncounters = patient.encounters.map((e) =>
    encounterToFhir({
      id: e.id,
      patientId: e.patientId,
      startedAt: e.startedAt ?? e.scheduledFor ?? e.createdAt,
      endedAt: e.completedAt,
      status: e.status,
      reason: e.reason,
    }),
  );

  // Conditions / medications / observations require their own Prisma
  // models; the scaffold returns empty arrays for those slots until
  // those translators are wired up.
  const bundle = buildPatientEverythingBundle({
    patient: fhirPatient,
    encounters: fhirEncounters,
    conditions: [],
    medications: [],
    observations: [],
  });

  return NextResponse.json(bundle, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}

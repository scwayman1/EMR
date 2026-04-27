// EMR-013 — FHIR Patient/[id] read.
//
// Reads a single patient from our DB and renders it as FHIR R4 JSON.
// Auth: same EMR session — partner SMART-on-FHIR auth comes later.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { patientToFhir } from "@/lib/fhir/adapter";

export const runtime = "nodejs";

function notFound(id: string) {
  return NextResponse.json(
    {
      resourceType: "OperationOutcome",
      issue: [
        { severity: "error", code: "not-found", diagnostics: `Patient/${id}` },
      ],
    },
    { status: 404 },
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const patient = await prisma.patient.findFirst({
    where: { id, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return notFound(id);

  const resource = patientToFhir({
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

  return NextResponse.json(resource, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}

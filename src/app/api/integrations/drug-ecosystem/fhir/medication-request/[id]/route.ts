// FHIR R4 MedicationRequest endpoint.
//
// GET /api/integrations/drug-ecosystem/fhir/medication-request/{id}
//   → returns a FHIR R4 MedicationRequest resource for the given
//     CannabisRx id, suitable for consumption by downstream EMRs,
//     patient apps, and payers.
//
// Auth: requires an EMR session. Cross-org access is blocked by
// scoping the lookup to the caller's organizationId.

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { translateToFhir } from "@/lib/integrations/drug-ecosystem/fhir";
import { logger } from "@/lib/observability/log";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!user.organizationId) {
    return new NextResponse("Organization required", { status: 403 });
  }

  const { id } = await context.params;
  const rx = await prisma.cannabisRx.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!rx) {
    return NextResponse.json(
      {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: "not-found",
            diagnostics: `MedicationRequest/${id} not found`,
          },
        ],
      },
      { status: 404 },
    );
  }

  const resource = translateToFhir({
    prescription: {
      id: rx.id,
      patientId: rx.patientId,
      providerId: rx.providerId,
      organizationId: rx.organizationId,
      status: mapStatus(rx.status),
      productName: rx.productName,
      productType: rx.productFormat,
      route: "oral",
      thcMg: rx.thcMgPerUnit ?? undefined,
      cbdMg: rx.cbdMgPerUnit ?? undefined,
      doseAmount: 1,
      doseUnit: rx.unit,
      frequency: "QD",
      frequencyPerDay: 1,
      timingInstructions: rx.doseInstructions,
      daysSupply: rx.daysSupply ?? 30,
      quantity: rx.quantity,
      quantityUnit: rx.unit,
      refills: rx.refills,
      diagnosisCodes: rx.diagnosisCodes.map((c) => ({ code: c, label: c })),
      noteToPharmacy: rx.notes ?? undefined,
      interactionsReviewed: true,
      contraindicationsReviewed: true,
      signedAt: rx.signedAt?.toISOString(),
      sentAt: rx.sentAt?.toISOString(),
      createdAt: rx.createdAt.toISOString(),
      updatedAt: rx.updatedAt.toISOString(),
    },
    ctx: {
      patientId: rx.patientId,
      practitionerId: rx.providerId,
      pharmacyOrganizationId: rx.dispensaryId,
    },
  });

  logger.info({
    event: "fhir.medication_request.served",
    rxId: rx.id,
    organizationId: user.organizationId,
  });

  return NextResponse.json(resource, {
    headers: { "Content-Type": "application/fhir+json" },
  });
}

type RxStatus =
  | "draft"
  | "pending_review"
  | "signed"
  | "sent"
  | "dispensed"
  | "cancelled"
  | "expired";

function mapStatus(status: string): RxStatus {
  switch (status) {
    case "approved":
      return "signed";
    case "sent":
      return "sent";
    case "dispensed":
      return "dispensed";
    case "rejected":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "draft";
  }
}

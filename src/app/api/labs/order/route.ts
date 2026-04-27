// EMR-067 — Lab order submission (Quest / LabCorp).
//
// Scaffold endpoint: validates the payload, generates a fake order ID,
// records an AuditLog row, and queues an AgentJob for the eventual
// HL7 ORM (or partner-specific JSON) outbound message. Real wire-format
// will plug into `enqueueLabOrderTransmission` once the Quest and LabCorp
// partner agreements land.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { LAB_VENDOR_CATALOG } from "@/lib/domain/lab-vendors";

export const runtime = "nodejs";

const OrderSchema = z.object({
  patientId: z.string().min(1),
  vendor: z.enum(["quest", "labcorp"]),
  testCodes: z.array(z.string()).min(1).max(50),
  icd10Codes: z.array(z.string()).min(1).max(20),
  priority: z.enum(["routine", "stat", "asap"]).default("routine"),
  reason: z.string().max(2000).optional(),
  fastingConfirmed: z.boolean().optional(),
  collectionInstructions: z.string().max(500).optional(),
});

function fakeOrderId(vendor: "quest" | "labcorp"): string {
  const prefix = vendor === "quest" ? "QST" : "LAB";
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.format() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Validate test codes against our catalog so we don't transmit garbage.
  const knownCodes = new Set(LAB_VENDOR_CATALOG.map((t) => t.code));
  const unknown = data.testCodes.filter((c) => !knownCodes.has(c));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: "unknown_test_codes", codes: unknown },
      { status: 400 },
    );
  }

  const patient = await prisma.patient.findFirst({
    where: { id: data.patientId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  const orderId = fakeOrderId(data.vendor);
  const tests = data.testCodes.map((code) => {
    const meta = LAB_VENDOR_CATALOG.find((t) => t.code === code)!;
    return {
      code,
      name: meta.name,
      vendorCode: meta.vendorCodes[data.vendor] ?? meta.code,
      fasting: meta.fasting ?? false,
    };
  });

  const job = await prisma.agentJob.create({
    data: {
      organizationId: user.organizationId,
      workflowName: "labs.outbound",
      agentName: data.vendor === "quest" ? "quest-orm" : "labcorp-orm",
      eventName: "lab.order.created",
      input: {
        patientId: patient.id,
        vendor: data.vendor,
        orderId,
        priority: data.priority,
        icd10Codes: data.icd10Codes,
        tests,
        reason: data.reason ?? null,
        collectionInstructions: data.collectionInstructions ?? null,
        fastingConfirmed: data.fastingConfirmed ?? false,
      },
      status: "pending",
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "lab.order.submitted",
      subjectType: "Patient",
      subjectId: patient.id,
      metadata: {
        orderId,
        jobId: job.id,
        vendor: data.vendor,
        testCount: tests.length,
        priority: data.priority,
      },
    },
  });

  return NextResponse.json({
    orderId,
    jobId: job.id,
    vendor: data.vendor,
    transmittedAt: new Date().toISOString(),
    status: "queued",
    tests,
  });
}

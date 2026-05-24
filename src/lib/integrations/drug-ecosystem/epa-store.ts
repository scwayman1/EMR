// Persistence helpers for the EpaRequest model.
//
// Wraps the prisma client with shapes that match the EpaClient
// request/response payloads, so route handlers can move data in
// and out of the database without re-deriving identifiers.

import "server-only";

import { prisma } from "@/lib/db/prisma";

import type {
  EpaAnswer,
  EpaClinicalContext,
  EpaDetectResponse,
  EpaSubmitResponse,
} from "./epa";

export interface CreateEpaRequestInput {
  organizationId: string;
  prescriptionId: string;
  patientId: string;
  providerId: string;
  rxcui?: string;
  drugDescription: string;
  payerId: string;
  payerName: string;
  memberId: string;
  clinical: EpaClinicalContext;
}

export async function createEpaRequest(input: CreateEpaRequestInput) {
  return prisma.epaRequest.create({
    data: {
      organizationId: input.organizationId,
      prescriptionId: input.prescriptionId,
      patientId: input.patientId,
      providerId: input.providerId,
      rxcui: input.rxcui,
      drugDescription: input.drugDescription,
      payerId: input.payerId,
      payerName: input.payerName,
      memberId: input.memberId,
      status: "draft",
      initialContext: input.clinical as unknown as object,
    },
  });
}

export async function recordDetectResponse(
  epaRequestId: string,
  detect: EpaDetectResponse,
) {
  return prisma.epaRequest.update({
    where: { id: epaRequestId },
    data: {
      status: detect.paRequired ? "questions_pending" : "approved",
      payerAuthNumber: detect.payerResponse?.payerAuthNumber,
      submittedAt: new Date(),
      questionsAnswered: [
        {
          phase: "detect",
          payerResponse: detect.payerResponse ?? null,
        },
      ] as unknown as object,
    },
  });
}

export async function recordSubmitResponse(
  epaRequestId: string,
  answers: EpaAnswer[],
  submit: EpaSubmitResponse,
) {
  const existing = await prisma.epaRequest.findUnique({
    where: { id: epaRequestId },
    select: { questionsAnswered: true },
  });

  const previousRounds = Array.isArray(existing?.questionsAnswered)
    ? (existing!.questionsAnswered as unknown[])
    : [];

  const status = mapSubmitStatus(submit.status);

  return prisma.epaRequest.update({
    where: { id: epaRequestId },
    data: {
      status,
      payerAuthNumber: submit.payerAuthNumber,
      approvedQuantity: submit.approvedQuantity,
      approvedDays: submit.approvedDays,
      effectiveFrom: submit.effectiveFrom ? new Date(submit.effectiveFrom) : null,
      effectiveUntil: submit.effectiveUntil ? new Date(submit.effectiveUntil) : null,
      denialReason: submit.denialReason,
      resolvedAt:
        status === "approved" || status === "denied" ? new Date() : null,
      questionsAnswered: [
        ...previousRounds,
        {
          phase: "submit",
          answers,
          response: submit,
          recordedAt: new Date().toISOString(),
        },
      ] as unknown as object,
    },
  });
}

function mapSubmitStatus(s: EpaSubmitResponse["status"]) {
  switch (s) {
    case "approved":
      return "approved";
    case "denied":
      return "denied";
    case "questions_pending":
      return "questions_pending";
    case "awaiting_response":
      return "awaiting_response";
  }
}

export async function listOpenEpaRequests(organizationId: string, limit = 20) {
  return prisma.epaRequest.findMany({
    where: {
      organizationId,
      status: {
        in: [
          "draft",
          "submitted",
          "awaiting_response",
          "questions_pending",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countEpaByStatus(organizationId: string) {
  const rows = await prisma.epaRequest.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

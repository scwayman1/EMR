// Transaction logging for the drug ecosystem integration.
//
// Every NCPDP SCRIPT message — outbound NewRx, inbound RefillRequest,
// CancelRx, ack, etc. — gets persisted to `SurescriptsTransaction` so
// the integrations dashboard can render connection health, recent
// activity, and a per-prescription chain of custody.
//
// Two policies enforced here:
//   1. PHI minimization. We persist the SCRIPT envelope minus the
//      patient address/phone (callers can opt out with `redactPhi:
//      false` for cert-tester smoke tests). The patient identifier
//      is kept because it's required for the dashboard's
//      per-patient view.
//   2. Single source of truth. The transaction row is the canonical
//      record for what we sent; the dashboard, audit log, and replay
//      tooling all read from here.

import "server-only";

import type {
  ScriptMessage,
  ScriptMessageType,
  SureScriptsAck,
  TransmitResult,
} from "../pharmacy/surescripts-client";
import { prisma } from "@/lib/db/prisma";
import type { DrugEcosystemEnvironment } from "./config";

export interface RecordTransactionInput {
  organizationId: string;
  environment: DrugEcosystemEnvironment;
  direction: "outbound" | "inbound";
  message: ScriptMessage;
  ack?: SureScriptsAck;
  result?: Pick<
    TransmitResult,
    "ok" | "confirmationNumber" | "status" | "error" | "latencyMs"
  >;
  prescriptionId?: string;
  patientId?: string;
  providerId?: string;
  /** Default true. Strips patient address/phone from the persisted payload. */
  redactPhi?: boolean;
}

function redactMessage(message: ScriptMessage): ScriptMessage {
  return {
    ...message,
    patient: {
      ...message.patient,
      address: undefined,
      phone: undefined,
    },
  };
}

function statusToEnum(
  result: RecordTransactionInput["result"],
): "pending" | "accepted" | "queued" | "delivered" | "rejected" | "error" {
  if (!result) return "pending";
  if (result.error) return "rejected";
  switch (result.status) {
    case "accepted":
      return "accepted";
    case "queued":
      return "queued";
    case "delivered":
      return "delivered";
    case "rejected":
      return "rejected";
    default:
      return "pending";
  }
}

export async function recordTransaction(input: RecordTransactionInput) {
  const payload = (input.redactPhi ?? true)
    ? redactMessage(input.message)
    : input.message;

  return prisma.surescriptsTransaction.create({
    data: {
      organizationId: input.organizationId,
      prescriptionId: input.prescriptionId,
      patientId: input.patientId ?? input.message.patient.identifier,
      providerId: input.providerId,
      messageType: input.message.messageType,
      direction: input.direction,
      environment: input.environment,
      surescriptsMessageId: input.message.header.messageId,
      relatesToMessageId: input.message.originalOrderNumber,
      confirmationNumber: input.result?.confirmationNumber,
      status: statusToEnum(input.result),
      errorCode: input.result?.error?.code,
      errorDescription: input.result?.error?.description,
      latencyMs: input.result?.latencyMs,
      payload: payload as unknown as object,
      ack: input.ack as unknown as object,
    },
  });
}

export interface DashboardTransaction {
  id: string;
  createdAt: Date;
  messageType: string;
  direction: "outbound" | "inbound";
  environment: string;
  status: string;
  confirmationNumber: string | null;
  errorDescription: string | null;
  latencyMs: number | null;
  patientId: string | null;
  prescriptionId: string | null;
  surescriptsMessageId: string;
}

export async function listRecentTransactions(
  organizationId: string,
  limit = 25,
): Promise<DashboardTransaction[]> {
  const rows = await prisma.surescriptsTransaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      messageType: true,
      direction: true,
      environment: true,
      status: true,
      confirmationNumber: true,
      errorDescription: true,
      latencyMs: true,
      patientId: true,
      prescriptionId: true,
      surescriptsMessageId: true,
    },
  });
  return rows as DashboardTransaction[];
}

export interface ConnectionHealth {
  totalTransactions: number;
  rejectedCount: number;
  pendingCount: number;
  acceptedCount: number;
  averageLatencyMs: number | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  /** Rolling 24h rejection rate (0..1). Null if no recent transactions. */
  recentRejectionRate: number | null;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function getConnectionHealth(
  organizationId: string,
): Promise<ConnectionHealth> {
  const recentCutoff = new Date(Date.now() - ONE_DAY_MS);
  const [aggregate, lastSuccess, lastFailure, recent] = await Promise.all([
    prisma.surescriptsTransaction.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
      _avg: { latencyMs: true },
    }),
    prisma.surescriptsTransaction.findFirst({
      where: {
        organizationId,
        status: { in: ["accepted", "queued", "delivered"] },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.surescriptsTransaction.findFirst({
      where: { organizationId, status: { in: ["rejected", "error"] } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.surescriptsTransaction.groupBy({
      by: ["status"],
      where: { organizationId, createdAt: { gte: recentCutoff } },
      _count: { _all: true },
    }),
  ]);

  let total = 0;
  let rejected = 0;
  let pending = 0;
  let accepted = 0;
  let latencyAcc = 0;
  let latencyCount = 0;
  for (const row of aggregate) {
    total += row._count._all;
    if (row.status === "rejected" || row.status === "error") rejected += row._count._all;
    if (row.status === "pending") pending += row._count._all;
    if (
      row.status === "accepted" ||
      row.status === "queued" ||
      row.status === "delivered"
    ) {
      accepted += row._count._all;
    }
    if (row._avg.latencyMs !== null) {
      latencyAcc += row._avg.latencyMs * row._count._all;
      latencyCount += row._count._all;
    }
  }

  let recentTotal = 0;
  let recentFailures = 0;
  for (const row of recent) {
    recentTotal += row._count._all;
    if (row.status === "rejected" || row.status === "error") {
      recentFailures += row._count._all;
    }
  }

  return {
    totalTransactions: total,
    rejectedCount: rejected,
    pendingCount: pending,
    acceptedCount: accepted,
    averageLatencyMs: latencyCount > 0 ? Math.round(latencyAcc / latencyCount) : null,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    lastFailureAt: lastFailure?.createdAt ?? null,
    recentRejectionRate: recentTotal > 0 ? recentFailures / recentTotal : null,
  };
}

/** Helper to render a message-type counter table on the dashboard. */
export async function countByMessageType(
  organizationId: string,
): Promise<Record<ScriptMessageType | string, number>> {
  const rows = await prisma.surescriptsTransaction.groupBy({
    by: ["messageType"],
    where: { organizationId },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const row of rows) out[row.messageType] = row._count._all;
  return out;
}

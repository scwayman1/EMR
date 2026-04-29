/**
 * Prior-auth workflow — persistence + portal dispatch  (EMR-229)
 * --------------------------------------------------------------
 * Persistence layer over the pure module in `prior-auth.ts`. Handles
 * draft → submit → approve / deny / expire transitions, dispatches
 * via portal adapters, and exposes the PA gate the claim-construction
 * agent calls before submitting an 837P.
 */
import { prisma } from "@/lib/db/prisma";
import type { PriorAuthorization } from "@prisma/client";
import {
  assemblePriorAuthPacket,
  validateForSubmission,
  requiresPriorAuth,
  expirationStatus,
  canTransition,
  type PriorAuthPacket,
  type PriorAuthPacketInput,
} from "./prior-auth";
import { getPortalAdapter, listPortalAdapters } from "./prior-auth-adapters";

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

export interface CreateDraftInput {
  organizationId: string;
  patientId: string;
  payerName: string;
  payerId?: string | null;
  cptCodes: string[];
  icd10Codes: string[];
  unitsRequested?: number;
  notes?: string;
}

export async function createDraft(input: CreateDraftInput): Promise<PriorAuthorization> {
  const packetInput = await loadPacketInput(input);
  const packet = assemblePriorAuthPacket(packetInput);
  return prisma.priorAuthorization.create({
    data: {
      organizationId: input.organizationId,
      patientId: input.patientId,
      payerName: input.payerName,
      payerId: input.payerId ?? null,
      cptCodes: input.cptCodes,
      icd10Codes: input.icd10Codes,
      unitsRequested: input.unitsRequested ?? 1,
      status: "draft",
      packetPayload: packet as unknown as object,
      notes: input.notes ?? null,
    },
  });
}

async function loadPacketInput(input: CreateDraftInput): Promise<PriorAuthPacketInput> {
  // Pull the minimum patient + clinical context the packet needs. The
  // operator UI fills in severity scores / prior treatments / provider
  // attestation before submission; until then they ride as empty
  // placeholders so the draft can be saved without forcing every
  // field up front.
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: input.patientId },
    select: {
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      presentingConcerns: true,
      treatmentGoals: true,
      contraindications: true,
    },
  });
  return {
    patient: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth ?? new Date(0),
      presentingConcerns: patient.presentingConcerns ?? null,
      treatmentGoals: patient.treatmentGoals ?? null,
      contraindications: patient.contraindications ?? [],
    },
    payerName: input.payerName,
    payerId: input.payerId ?? null,
    cptCodes: input.cptCodes,
    icd10Codes: input.icd10Codes,
    unitsRequested: input.unitsRequested ?? 1,
    severityScores: [],
    priorTreatments: [],
    providerAttestation: { providerName: "", npi: null, signedAt: new Date() },
    supportingDocIds: [],
    notes: input.notes,
  };
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export type SubmitResult =
  | { ok: true; externalRef: string; submittedAt: Date }
  | { ok: false; reason: "validation_failed" | "no_adapter" | "adapter_error" | "bad_state"; detail: string };

export async function submitDraft(args: {
  priorAuthId: string;
  /** Optional explicit adapter override; defaults to the payer-name match. */
  adapterId?: string;
}): Promise<SubmitResult> {
  const pa = await prisma.priorAuthorization.findUniqueOrThrow({ where: { id: args.priorAuthId } });
  if (!canTransition(pa.status, "submitted")) {
    return { ok: false, reason: "bad_state", detail: `cannot submit from status=${pa.status}` };
  }
  const packet = pa.packetPayload as unknown as PriorAuthPacket;
  const validation = validateForSubmission(packet);
  if (!validation.ok) {
    return { ok: false, reason: "validation_failed", detail: validation.errors.join("; ") };
  }
  const adapter = args.adapterId ? getPortalAdapter(args.adapterId) : pickAdapterForPayer(pa.payerName);
  if (!adapter) {
    return { ok: false, reason: "no_adapter", detail: `no adapter for payer ${pa.payerName}` };
  }
  try {
    const submission = await adapter.submit({
      payerName: pa.payerName,
      payerId: pa.payerId,
      patientId: pa.patientId,
      cptCodes: pa.cptCodes,
      icd10Codes: pa.icd10Codes,
      packetPayload: packet,
    });
    const submittedAt = new Date();
    await prisma.priorAuthorization.update({
      where: { id: pa.id },
      data: {
        status: "submitted",
        submittedAt,
        portalAdapter: adapter.id,
        externalRef: submission.externalRef,
      },
    });
    return { ok: true, externalRef: submission.externalRef, submittedAt };
  } catch (err) {
    return {
      ok: false,
      reason: "adapter_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function pickAdapterForPayer(payerName: string): ReturnType<typeof getPortalAdapter> {
  const adapters = listPortalAdapters();
  const lower = payerName.toLowerCase();
  for (const a of adapters) {
    if (a.supportedPayers.some((p) => lower.includes(p))) return a;
  }
  return adapters.find((a) => a.id === "manual_fax") ?? null;
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------

export async function recordApproval(args: {
  priorAuthId: string;
  approvalNumber: string;
  approvedUnits?: number;
  expiresAt: Date;
}): Promise<PriorAuthorization> {
  const pa = await prisma.priorAuthorization.findUniqueOrThrow({ where: { id: args.priorAuthId } });
  if (!canTransition(pa.status, "approved")) {
    throw new Error(`cannot approve PA from status=${pa.status}`);
  }
  return prisma.priorAuthorization.update({
    where: { id: args.priorAuthId },
    data: {
      status: "approved",
      approvalNumber: args.approvalNumber,
      approvedUnits: args.approvedUnits ?? null,
      expiresAt: args.expiresAt,
    },
  });
}

export async function recordDenial(args: {
  priorAuthId: string;
  reason: string;
}): Promise<PriorAuthorization> {
  const pa = await prisma.priorAuthorization.findUniqueOrThrow({ where: { id: args.priorAuthId } });
  if (!canTransition(pa.status, "denied")) {
    throw new Error(`cannot deny PA from status=${pa.status}`);
  }
  return prisma.priorAuthorization.update({
    where: { id: args.priorAuthId },
    data: { status: "denied", notes: args.reason },
  });
}

// ---------------------------------------------------------------------------
// Claim-construction PA gate
// ---------------------------------------------------------------------------

export interface PaGateResult {
  /** True when the claim can proceed to submission. */
  ok: boolean;
  approvalNumber: string | null;
  reason: string | null;
  pendingPriorAuthId: string | null;
}

/** The function the claim-construction agent calls before submitting
 *  an 837P. Returns ok=true when no PA is required, OR when an
 *  approved + unexpired PA covers the planned CPT(s). */
export async function claimNeedsPA(args: {
  organizationId: string;
  patientId: string;
  payerName: string;
  cptCodes: string[];
  serviceDate: Date;
}): Promise<PaGateResult> {
  if (!requiresPriorAuth({ payerId: null, payerName: args.payerName, cptCodes: args.cptCodes })) {
    return { ok: true, approvalNumber: null, reason: null, pendingPriorAuthId: null };
  }
  const approved = await prisma.priorAuthorization.findFirst({
    where: {
      organizationId: args.organizationId,
      patientId: args.patientId,
      payerName: args.payerName,
      status: "approved",
      cptCodes: { hasSome: args.cptCodes },
      OR: [{ expiresAt: null }, { expiresAt: { gte: args.serviceDate } }],
    },
    orderBy: { submittedAt: "desc" },
  });
  if (approved) {
    return {
      ok: true,
      approvalNumber: approved.approvalNumber,
      reason: null,
      pendingPriorAuthId: null,
    };
  }
  const pending = await prisma.priorAuthorization.findFirst({
    where: {
      organizationId: args.organizationId,
      patientId: args.patientId,
      payerName: args.payerName,
      status: { in: ["draft", "submitted"] },
      cptCodes: { hasSome: args.cptCodes },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    ok: false,
    approvalNumber: null,
    reason: pending
      ? `PA ${pending.id} ${pending.status} — wait for payer response`
      : `payer ${args.payerName} requires PA for ${args.cptCodes.join(", ")} but none on file`,
    pendingPriorAuthId: pending?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Expiration alerts
// ---------------------------------------------------------------------------

export interface ExpirationAlertRow {
  priorAuthId: string;
  patientId: string;
  payerName: string;
  approvalNumber: string | null;
  expiresAt: Date;
  alert: "expires_in_14d" | "expires_in_7d" | "expires_in_1d" | "expired";
}

/** Emit alerts for approved PAs nearing expiration. The 14/7/1 windows
 *  fire at most once each — we record an `ALERT_FIRED:<window>` line
 *  in `notes` as a low-tech idempotency token. (A dedicated
 *  expiration_notified JSON column is a follow-up; this keeps the
 *  schema additions minimal for the foundation PR.) */
export async function expirationAlerts(
  organizationId: string,
  today: Date = new Date(),
): Promise<ExpirationAlertRow[]> {
  const day = 24 * 60 * 60 * 1000;
  const horizon = new Date(today.getTime() + 14 * day);
  const candidates = await prisma.priorAuthorization.findMany({
    where: {
      organizationId,
      status: "approved",
      expiresAt: { not: null, lte: horizon },
    },
  });
  const out: ExpirationAlertRow[] = [];
  for (const pa of candidates) {
    if (!pa.expiresAt) continue;
    const status = expirationStatus(pa.expiresAt, today);
    if (status === "ok") continue;
    const sentinel = `ALERT_FIRED:${status}`;
    const notes = pa.notes ?? "";
    if (notes.includes(sentinel)) continue;
    out.push({
      priorAuthId: pa.id,
      patientId: pa.patientId,
      payerName: pa.payerName,
      approvalNumber: pa.approvalNumber,
      expiresAt: pa.expiresAt,
      alert: status as ExpirationAlertRow["alert"],
    });
    await prisma.priorAuthorization.update({
      where: { id: pa.id },
      data: {
        notes: notes ? `${notes}\n${sentinel}@${today.toISOString()}` : `${sentinel}@${today.toISOString()}`,
        status: status === "expired" ? "expired" : pa.status,
      },
    });
  }
  return out;
}

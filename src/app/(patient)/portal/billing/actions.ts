"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { patientExplanationAgent } from "@/lib/agents/billing/patient-explanation-agent";
import { createLightContext } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Patient Billing Portal — AI server actions (EMR-068)
// ---------------------------------------------------------------------------
// Powers the "Explain this bill like I'm in 3rd grade" button on the patient
// billing portal. Calls the existing patientExplanation agent which generates
// a 3-4 sentence plain-language summary and persists it to the statement's
// plainLanguageSummary column so subsequent loads come back instantly.
// ---------------------------------------------------------------------------

export interface ExplainBillResult {
  ok: boolean;
  error?: string;
  summary?: string;
  cached?: boolean;
}

export async function explainBillForPatient(
  statementId: string,
): Promise<ExplainBillResult> {
  const user = await requireRole("patient");

  // ── Auth: confirm this statement belongs to this patient ────────────
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: "Patient profile not found" };
  }

  const statement = await prisma.statement.findUnique({
    where: { id: statementId },
    select: { id: true, patientId: true, plainLanguageSummary: true },
  });
  if (!statement || statement.patientId !== patient.id) {
    return { ok: false, error: "Statement not found" };
  }

  // ── Cache hit ────────────────────────────────────────────────────────
  if (statement.plainLanguageSummary && statement.plainLanguageSummary.length > 20) {
    return { ok: true, summary: statement.plainLanguageSummary, cached: true };
  }

  // ── Run the agent ────────────────────────────────────────────────────
  const ctx = createLightContext({
    jobId: `explain-bill-${statementId}-${Date.now()}`,
    organizationId: user.organizationId,
  });

  try {
    const result = await patientExplanationAgent.run({ statementId }, ctx);
    return { ok: true, summary: result.summary, cached: false };
  } catch (err) {
    console.error("[explainBillForPatient] failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to explain bill right now",
    };
  }
}

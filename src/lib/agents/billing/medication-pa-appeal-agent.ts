import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Medication Prior Auth Appeal Agent (EMR-076)
// ---------------------------------------------------------------------------
// Triggered when a clinician hits the "AI Appeal" button on a denied
// MedicationPriorAuth row. Drafts a payer-appropriate appeal letter using
// patient context (active medications, diagnoses, prior treatments, recent
// labs) and the denial reason / CARC code from the payer.
//
// The agent runs in the AgentJob queue (background). On completion it
// writes the markdown letter back to MedicationPriorAuth.appealLetterMd
// and flips appealStatus to "drafted" so the clinician can review and sign.
// ---------------------------------------------------------------------------

const input = z.object({
  priorAuthId: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  priorAuthId: z.string(),
  letterMd: z.string(),
  recommendedAction: z.enum(["appeal", "rewrite_pa", "abandon"]),
  rationale: z.string(),
  usedLLM: z.boolean(),
});

export const medicationPaAppealAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "medicationPaAppeal",
  version: "1.0.0",
  description:
    "Drafts an AI appeal letter for a denied medication prior authorization. " +
    "Reads patient diagnoses, active meds, recent labs, and the denial " +
    "reason — produces a payer-appropriate appeal letter for clinician " +
    "review and signature.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.note", "write.task"],
  requiresApproval: false,

  async run({ priorAuthId, organizationId }, ctx) {
    const trace = startReasoning("medicationPaAppeal", "1.0.0", ctx.jobId);
    trace.step("begin medication PA appeal", { priorAuthId });

    ctx.assertCan("read.patient");

    const pa = await prisma.medicationPriorAuth.findUnique({
      where: { id: priorAuthId },
      include: {
        medication: true,
        patient: {
          include: {
            medications: { where: { active: true } },
          },
        },
      },
    });
    if (!pa) throw new Error(`MedicationPriorAuth ${priorAuthId} not found`);
    if (pa.status !== "denied") {
      throw new Error(
        `MedicationPriorAuth ${priorAuthId} is not denied (status=${pa.status}); cannot draft appeal`,
      );
    }

    trace.step("loaded PA + patient", {
      payer: pa.payerName,
      drug: pa.medication.name,
      activeMedCount: pa.patient.medications.length,
    });

    // Mark queued so the UI shows "drafting…" while we work.
    await prisma.medicationPriorAuth.update({
      where: { id: priorAuthId },
      data: { appealStatus: "queued", appealJobId: ctx.jobId },
    });

    const otherMeds = pa.patient.medications
      .filter((m) => m.id !== pa.medicationId)
      .map((m) => `- ${m.name}${m.dosage ? ` (${m.dosage})` : ""}`)
      .join("\n");

    const prompt = `You are a clinical documentation specialist drafting an insurance prior-authorization APPEAL letter on behalf of a prescribing physician. Be factual, calm, and policy-driven. Cite medical necessity in the language the payer's medical director will recognize.

PAYER: ${pa.payerName}${pa.payerPolicyId ? ` (policy ${pa.payerPolicyId})` : ""}
DENIAL REASON: ${pa.denialReason ?? "(not specified)"}
${pa.denialCarc ? `CARC: ${pa.denialCarc}` : ""}

PATIENT: ${pa.patient.firstName} ${pa.patient.lastName}
DRUG REQUESTED: ${pa.medication.name}${pa.medication.dosage ? ` ${pa.medication.dosage}` : ""}${pa.rxcui ? ` (RxNorm ${pa.rxcui})` : ""}
DIAGNOSIS CODES: ${pa.diagnosisCodes.join(", ") || "(none on PA)"}
OTHER ACTIVE MEDICATIONS:
${otherMeds || "(none)"}

PATIENT NOTES: ${pa.patient.presentingConcerns ?? "(not documented)"}

Draft a 3-section appeal letter in MARKDOWN:

# Re: Appeal of Prior Authorization Denial — [DRUG]

**Patient:** [name, DOB redacted to year]
**Member ID:** [redacted]
**Date of Service:** [date]

## 1. Clinical Basis for the Request
- Diagnosis with ICD-10 code
- Pertinent clinical history (1-2 sentences)
- Why this drug is medically necessary

## 2. Response to the Denial
- Address the specific denial reason directly
- Cite payer policy (if known) or established clinical guidelines
- Note any prior treatment failures with this patient

## 3. Requested Action
- Explicitly request approval at the requested dose / quantity
- State filing of state-mandated external review if denied again
- Provide contact info: [Provider Name], [NPI], [practice phone]

After the letter, on a NEW LINE, output a single JSON object:
{ "recommendedAction": "appeal" | "rewrite_pa" | "abandon", "rationale": "..." }

- "appeal" = the denial is fightable on documentation
- "rewrite_pa" = denial reason indicates the original PA was missing info; resubmit with full packet rather than appeal (saves timely-filing window)
- "abandon" = payer policy explicitly excludes this drug for this dx; recommend alternative or self-pay

Be concise. Cite real policies when possible. Do not fabricate sources or guideline numbers.`;

    let letterMd = "";
    let usedLLM = false;
    let recommendedAction: "appeal" | "rewrite_pa" | "abandon" = "appeal";
    let rationale = "Drafted appeal based on documented denial reason.";

    try {
      const raw = await ctx.model.complete(prompt, {
        maxTokens: 1500,
        temperature: 0.35,
      });
      usedLLM = raw.length > 100 && !raw.startsWith("[stub");
      trace.step("llm returned", { rawLen: raw.length, usedLLM });

      if (usedLLM) {
        // Pull the trailing JSON envelope, if present.
        const jsonMatch = raw.match(/\{\s*"recommendedAction"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (["appeal", "rewrite_pa", "abandon"].includes(parsed.recommendedAction)) {
              recommendedAction = parsed.recommendedAction;
            }
            if (typeof parsed.rationale === "string") {
              rationale = parsed.rationale;
            }
            letterMd = raw.slice(0, jsonMatch.index ?? raw.length).trim();
          } catch {
            letterMd = raw.trim();
          }
        } else {
          letterMd = raw.trim();
        }
      }
    } catch (err) {
      ctx.log("warn", "Medication PA appeal LLM call failed — using template fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!letterMd) {
      letterMd =
        `# Re: Appeal of Prior Authorization Denial — ${pa.medication.name}\n\n` +
        `**Patient:** ${pa.patient.firstName} ${pa.patient.lastName}\n` +
        `**Payer:** ${pa.payerName}\n` +
        `**Denial Reason:** ${pa.denialReason ?? "(not specified)"}\n\n` +
        `## 1. Clinical Basis for the Request\n` +
        `${pa.medication.name} is medically necessary for the documented diagnosis. ` +
        `(Clinician: please attach the relevant clinical history.)\n\n` +
        `## 2. Response to the Denial\n` +
        `(Clinician: please address the specific denial reason and cite payer policy or established clinical guidelines.)\n\n` +
        `## 3. Requested Action\n` +
        `We respectfully request approval at the originally requested dose and quantity. ` +
        `If denied again, we will pursue external review per state regulations.\n`;
      rationale = "LLM unavailable — template draft generated. Clinician must review and complete sections.";
    }

    // Persist the draft on the PA.
    await prisma.medicationPriorAuth.update({
      where: { id: priorAuthId },
      data: {
        appealLetterMd: letterMd,
        appealStatus: "drafted",
        appealDraftedAt: new Date(),
        appealJobId: ctx.jobId,
        status: "appealed",
      },
    });

    await writeAgentAudit(
      "medicationPaAppeal",
      "1.0.0",
      organizationId,
      "medication.pa.appeal.drafted",
      { type: "MedicationPriorAuth", id: priorAuthId },
      { recommendedAction, payerName: pa.payerName, drug: pa.medication.name },
    );

    trace.conclude({
      confidence: usedLLM ? 0.8 : 0.4,
      summary: `Drafted ${recommendedAction} letter for ${pa.medication.name} (${pa.payerName}). ${rationale}`,
    });
    await trace.persist();

    return {
      priorAuthId,
      letterMd,
      recommendedAction,
      rationale,
      usedLLM,
    };
  },
};

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Note Compliance Audit Agent (EMR-065 + EMR-045 pipeline agent 2 of 2)
// ---------------------------------------------------------------------------
// Cross-references a finalized clinical note (and the coding packet produced
// by note-coding-agent) against the documentation standards required by:
//
//   • CMS E/M MDM Guidelines (2023 ambulatory revisions)
//   • Joint Commission (JACHO) ambulatory clinic record requirements
//   • CMS Documentation Guidelines for Evaluation & Management Services
//   • State Cannabis Practice Standards (where the note is for cannabis care)
//
// This agent does NOT block submission. It produces a structured findings
// list (severity: pass | warning | block), persists the result on the
// CodingSuggestion record, and routes any "block" findings to human review
// via the standard human.review.required event.
// ---------------------------------------------------------------------------

function tryParseJSON(text: string): any | null {
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

const input = z.object({
  noteId: z.string(),
  organizationId: z.string(),
  // The output of noteCodingAgent is passed through the workflow.
  coding: z
    .object({
      cpt: z.object({ code: z.string(), label: z.string(), confidence: z.number() }),
      modifiers: z.array(z.string()),
      icd10: z.array(
        z.object({ code: z.string(), label: z.string(), confidence: z.number() }),
      ),
      emLevel: z.string().nullable(),
      overallConfidence: z.number(),
    })
    .optional(),
});

const finding = z.object({
  standard: z.string(), // e.g. "CMS E/M 2023", "JACHO PC.01.02.03"
  rule: z.string(),
  severity: z.enum(["pass", "warning", "block"]),
  detail: z.string(),
  remediation: z.string().optional(),
});

const output = z.object({
  noteId: z.string(),
  passes: z.boolean(),
  blockingCount: z.number(),
  warningCount: z.number(),
  findings: z.array(finding),
  usedLLM: z.boolean(),
});

type Finding = z.infer<typeof finding>;

// ---------------------------------------------------------------------------
// Deterministic CMS / JACHO checks — run before LLM.
// ---------------------------------------------------------------------------

interface NoteShape {
  blocks: Array<{ type?: string; heading?: string; body?: string }>;
  finalizedAt: Date | null;
  authorUserId: string | null;
  encounter: {
    serviceDate?: Date | null;
    patient: { firstName: string; lastName: string; dateOfBirth: Date | null };
    providerId: string | null;
  };
}

function deterministicChecks(note: NoteShape, coding?: z.infer<typeof input>["coding"]): Finding[] {
  const findings: Finding[] = [];
  const blocks = note.blocks ?? [];
  const fullText = blocks.map((b) => `${b.heading ?? ""} ${b.body ?? ""}`).join(" ").toLowerCase();

  const hasBlock = (type: string) =>
    blocks.some((b) => (b.type ?? "").toLowerCase() === type && (b.body ?? "").trim().length >= 10);

  // ── JACHO PC.01.02.03 — every encounter must document an Assessment ──
  if (!hasBlock("assessment")) {
    findings.push({
      standard: "JACHO PC.01.02.03",
      rule: "Encounter must document Assessment",
      severity: "block",
      detail:
        "JACHO ambulatory clinic standards require an Assessment section in every clinical note. " +
        "This note has no Assessment block (or the Assessment is fewer than 10 characters).",
      remediation:
        "Add an Assessment block summarizing the clinical impression and how each problem was evaluated.",
    });
  }

  // ── JACHO PC.04.01.05 — Plan of Care must be documented ──
  if (!hasBlock("plan")) {
    findings.push({
      standard: "JACHO PC.04.01.05",
      rule: "Plan of Care must be documented",
      severity: "block",
      detail:
        "Joint Commission requires a documented Plan of Care for every encounter. " +
        "This note has no Plan block.",
      remediation:
        "Document the treatment plan, follow-up interval, and patient instructions.",
    });
  }

  // ── CMS Signature & timeliness ──
  if (!note.finalizedAt) {
    findings.push({
      standard: "CMS Documentation Guidelines",
      rule: "Note must be authenticated (signed)",
      severity: "block",
      detail: "Notes submitted for billing must be authenticated. This note has no finalizedAt timestamp.",
      remediation: "Have the rendering provider sign and finalize the note before submission.",
    });
  }
  if (!note.authorUserId) {
    findings.push({
      standard: "CMS Documentation Guidelines",
      rule: "Author must be identified",
      severity: "block",
      detail: "CMS requires the rendering provider to be identifiable on the note.",
      remediation: "Attach the authoring clinician before submitting.",
    });
  }
  if (note.finalizedAt && note.encounter.serviceDate) {
    const ageDays = (note.finalizedAt.getTime() - note.encounter.serviceDate.getTime()) / 86_400_000;
    if (ageDays > 30) {
      findings.push({
        standard: "CMS Timely Documentation",
        rule: "Notes should be authenticated within 24-48 hours; never beyond payer chart-audit windows",
        severity: "warning",
        detail: `Note was finalized ${Math.round(ageDays)} days after the service date. Payer audits flag late documentation.`,
        remediation: "Authenticate notes within 48 hours of service whenever possible.",
      });
    }
  }

  // ── CMS rendering provider requirement ──
  if (!note.encounter.providerId) {
    findings.push({
      standard: "CMS Claim Submission Requirements",
      rule: "Rendering provider must be identified",
      severity: "block",
      detail: "The encounter has no rendering provider attached. CMS requires the rendering provider on every billable encounter.",
      remediation: "Attach a rendering provider to the encounter before submitting claims.",
    });
  }

  // ── CMS E/M MDM Guidelines (2023) — 99214 / 99215 require moderate or high MDM ──
  if (coding?.cpt?.code === "99214") {
    const hasMdm = /mdm|moderate complexity|prescription|2 chronic|two chronic|risk of morbidity/.test(fullText);
    if (!hasMdm) {
      findings.push({
        standard: "CMS E/M 2023 MDM",
        rule: "99214 requires documentation of Moderate MDM",
        severity: "warning",
        detail:
          "CPT 99214 requires Moderate MDM (≥2 stable chronic conditions OR prescription drug management OR moderate risk). " +
          "The note text does not explicitly document MDM-supporting elements.",
        remediation: "Document the MDM elements that justify 99214, or downgrade to 99213.",
      });
    }
  }
  if (coding?.cpt?.code === "99215") {
    const hasHighMdm = /high complexity|high mdm|severe exacerbation|drug requiring intensive monitoring|emergency surgery/.test(fullText);
    if (!hasHighMdm) {
      findings.push({
        standard: "CMS E/M 2023 MDM",
        rule: "99215 requires documentation of High MDM",
        severity: "block",
        detail:
          "CPT 99215 requires High MDM (severe exacerbation, drug therapy requiring intensive monitoring, etc). " +
          "Documentation does not support High MDM.",
        remediation: "Either document the high-complexity element or downgrade to 99214.",
      });
    }
  }

  // ── CMS NCCI — Modifier 25 must have separately identifiable E/M ──
  if (coding?.modifiers?.includes("25")) {
    const hasSeparateEM = /separate.{0,20}e\/m|separately identifiable|distinct service/.test(fullText);
    if (!hasSeparateEM) {
      findings.push({
        standard: "CMS NCCI Modifier 25",
        rule: "Modifier 25 requires documentation of a separately identifiable E/M",
        severity: "warning",
        detail:
          "Modifier 25 was applied but the note does not explicitly document a separately identifiable E/M from the same-day procedure. " +
          "This is a top-3 audit target for commercial payers.",
        remediation:
          "Add a sentence to the note that explicitly distinguishes the E/M work from the procedural work.",
      });
    }
  }

  // ── ICD-10 specificity ──
  if (coding?.icd10?.some((c) => /unspecified/i.test(c.label))) {
    findings.push({
      standard: "CMS ICD-10 Specificity",
      rule: "Use the highest specificity ICD-10 the documentation supports",
      severity: "warning",
      detail: "One or more ICD-10 codes are 'unspecified'. CMS prefers the most specific code supported by documentation.",
      remediation: "Re-code to a more specific ICD-10 if the note supports it; otherwise document the limitation.",
    });
  }

  // ── Cannabis cessation mis-code (HCPCS 99406/99407 are tobacco-only) ──
  if (coding?.cpt?.code && ["99406", "99407"].includes(coding.cpt.code)) {
    const isCannabis = coding.icd10?.some((c) => /^F12|^Z71\.89/.test(c.code));
    if (isCannabis) {
      findings.push({
        standard: "CMS HCPCS Coding Rules",
        rule: "99406 / 99407 are tobacco cessation — not for cannabis counseling",
        severity: "block",
        detail: "Cannabis counseling cannot be billed with 99406 or 99407 (tobacco-cessation HCPCS).",
        remediation: "Use Z71.89 with the time-based E/M (99212-99215) instead.",
      });
    }
  }

  return findings;
}

export const noteComplianceAuditAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "noteComplianceAudit",
  version: "1.0.0",
  description:
    "Cross-references a finalized clinical note (and its coding packet) " +
    "against CMS E/M, CMS Documentation Guidelines, JACHO ambulatory " +
    "standards, and NCCI modifier rules. Produces a findings list with " +
    "pass/warning/block severities. Routes blocking findings to human review.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.note", "read.encounter", "read.patient"],
  requiresApproval: false,

  async run({ noteId, organizationId, coding }, ctx) {
    const trace = startReasoning("noteComplianceAudit", "1.0.0", ctx.jobId);
    trace.step("begin compliance audit", { noteId, hasCoding: !!coding });

    ctx.assertCan("read.note");

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        encounter: {
          include: {
            patient: { select: { firstName: true, lastName: true, dateOfBirth: true } },
          },
        },
      },
    });
    if (!note) throw new Error(`Note ${noteId} not found`);

    // Hydrate coding from CodingSuggestion if not provided by the workflow.
    let codingPacket = coding;
    if (!codingPacket) {
      const suggestion = await prisma.codingSuggestion.findUnique({ where: { noteId } });
      if (suggestion) {
        const icd = Array.isArray(suggestion.icd10) ? (suggestion.icd10 as any[]) : [];
        codingPacket = {
          cpt: { code: suggestion.emLevel ?? "99213", label: "E/M visit", confidence: 0.6 },
          modifiers: [],
          icd10: icd.map((c) => ({
            code: String(c.code ?? ""),
            label: String(c.label ?? ""),
            confidence: Number(c.confidence ?? 0.5),
          })),
          emLevel: suggestion.emLevel ?? null,
          overallConfidence: 0.6,
        };
      }
    }

    const noteShape: NoteShape = {
      blocks: Array.isArray(note.blocks) ? (note.blocks as any[]) : [],
      finalizedAt: note.finalizedAt,
      authorUserId: note.authorUserId,
      encounter: {
        serviceDate: note.encounter.startedAt ?? note.encounter.completedAt ?? null,
        patient: note.encounter.patient,
        providerId: note.encounter.providerId,
      },
    };

    const findings: Finding[] = deterministicChecks(noteShape, codingPacket);
    trace.step("deterministic checks complete", {
      blockingCount: findings.filter((f) => f.severity === "block").length,
      warningCount: findings.filter((f) => f.severity === "warning").length,
    });

    // ── LLM second pass: nuanced documentation gap detection ────────────
    const noteText = noteShape.blocks
      .map((b) => `### ${b.heading ?? b.type ?? ""}\n${b.body ?? ""}`)
      .join("\n\n");

    const prompt = `You are a CMS / Joint Commission compliance auditor. Review this clinical note and the proposed coding packet. Identify documentation gaps that would fail a payer audit. Return ONLY valid JSON.

CLINICAL NOTE:
${noteText.slice(0, 4000)}

PROPOSED CODING:
- CPT: ${codingPacket?.cpt?.code ?? "?"} (${codingPacket?.cpt?.label ?? ""})
- Modifiers: ${codingPacket?.modifiers?.join(", ") || "none"}
- ICD-10: ${codingPacket?.icd10?.map((c) => `${c.code} ${c.label}`).join("; ") || "none"}

Standards to check against:
- CMS Documentation Guidelines for E/M Services (2023)
- CMS Medical Necessity Documentation Requirements
- Joint Commission ambulatory clinic standards (PC.01.02.03 Assessment, PC.04.01.05 Plan of Care, RC.02.01.01 Record Completeness)
- NCCI / Mod-25 / Mod-59 documentation rules

Return JSON of the form:
{
  "findings": [
    {
      "standard": "CMS Documentation Guidelines",
      "rule": "Medical necessity for the service must be documented",
      "severity": "warning",
      "detail": "...",
      "remediation": "..."
    }
  ]
}

Only return findings that the deterministic checker would miss. Be precise — do not invent gaps. If the note looks complete, return {"findings": []}.`;

    let usedLLM = false;
    try {
      const raw = await ctx.model.complete(prompt, { maxTokens: 768, temperature: 0.15 });
      usedLLM = raw.length > 20 && !raw.startsWith("[stub");
      if (usedLLM) {
        const parsed = tryParseJSON(raw);
        if (Array.isArray(parsed?.findings)) {
          for (const f of parsed.findings) {
            if (!f?.standard || !f?.rule || !f?.severity || !f?.detail) continue;
            const sev = ["pass", "warning", "block"].includes(f.severity) ? f.severity : "warning";
            findings.push({
              standard: String(f.standard),
              rule: String(f.rule),
              severity: sev,
              detail: String(f.detail),
              remediation: f.remediation ? String(f.remediation) : undefined,
            });
          }
          trace.step("llm appended findings", { added: parsed.findings.length });
        }
      }
    } catch (err) {
      ctx.log("warn", "Compliance auditor LLM failed — relying on deterministic checks", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const blockingCount = findings.filter((f) => f.severity === "block").length;
    const warningCount = findings.filter((f) => f.severity === "warning").length;
    const passes = blockingCount === 0;

    // Persist findings on the CodingSuggestion record (rationale field)
    if (findings.length > 0) {
      const summaryLine = findings
        .map((f) => `[${f.severity.toUpperCase()}] ${f.standard}: ${f.rule}`)
        .slice(0, 5)
        .join(" | ");
      try {
        await prisma.codingSuggestion.update({
          where: { noteId },
          data: {
            rationale: `Compliance audit — ${summaryLine}${findings.length > 5 ? ` (+${findings.length - 5} more)` : ""}`,
          },
        });
      } catch {
        // CodingSuggestion may not exist yet (audit ran without coding) — fine.
      }
    }

    // ── Route blocking findings to human review ────────────────────────
    if (blockingCount > 0) {
      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "noteComplianceAudit",
        category: "documentation_gap",
        patientId: note.encounter.patientId,
        summary: `${blockingCount} blocking compliance finding(s) on note ${noteId}: ${findings
          .filter((f) => f.severity === "block")
          .map((f) => f.standard)
          .join(", ")}`,
        suggestedAction:
          "Address blocking compliance findings before this encounter can be billed.",
        tier: 2,
        organizationId,
      });
      trace.step("escalated blocking findings", { blockingCount });
    }

    await writeAgentAudit(
      "noteComplianceAudit",
      "1.0.0",
      organizationId,
      "note.compliance.audited",
      { type: "Note", id: noteId },
      { passes, blockingCount, warningCount, findingCount: findings.length },
    );

    trace.conclude({
      confidence: 0.9,
      summary: passes
        ? `Note ${noteId} passed compliance audit (${warningCount} warning(s)).`
        : `Note ${noteId} has ${blockingCount} blocking finding(s) — escalated to compliance reviewer.`,
    });
    await trace.persist();

    return {
      noteId,
      passes,
      blockingCount,
      warningCount,
      findings,
      usedLLM,
    };
  },
};

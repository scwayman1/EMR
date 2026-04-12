import type { DomainEvent, EventName } from "./events";

export interface WorkflowStep {
  agent: string;
  input: (event: DomainEvent) => Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  on: EventName[];
  steps: WorkflowStep[];
}

/**
 * The event → agent job routing table. Adding a workflow is a matter of
 * appending an object here. The dispatcher reads this table at runtime.
 */
export const workflows: WorkflowDefinition[] = [
  {
    name: "intake-completion",
    on: ["patient.intake.updated", "patient.intake.submitted", "patient.created"],
    steps: [
      {
        agent: "intake",
        input: (e) => ({ patientId: (e as any).patientId }),
      },
    ],
  },
  {
    name: "document-classify",
    on: ["document.uploaded"],
    steps: [
      {
        agent: "documentOrganizer",
        input: (e) => ({ documentId: (e as any).documentId }),
      },
    ],
  },
  {
    name: "visit-followup",
    on: ["encounter.completed"],
    steps: [
      {
        agent: "outcomeTracker",
        input: (e) => ({
          patientId: (e as any).patientId,
          lastCheckInAt: (e as any).completedAt,
        }),
      },
    ],
  },
  {
    name: "scribe-draft",
    on: ["encounter.note.draft.requested"],
    steps: [
      {
        agent: "scribe",
        input: (e) => ({ encounterId: (e as any).encounterId }),
        requiresApproval: true,
      },
    ],
  },
  {
    name: "coding-readiness",
    on: ["note.finalized"],
    steps: [
      {
        agent: "codingReadiness",
        input: (e) => ({ noteId: (e as any).noteId }),
      },
    ],
  },
  {
    name: "research-synth",
    on: ["research.query.submitted"],
    steps: [
      {
        agent: "researchSynthesizer",
        input: (e) => ({
          queryId: (e as any).queryId,
          query: (e as any).query,
          patientId: (e as any).patientId,
        }),
      },
    ],
  },
  {
    name: "message-draft",
    on: ["message.draft.requested"],
    steps: [
      {
        agent: "messagingAssistant",
        input: (e) => ({
          patientId: (e as any).patientId,
          intent: (e as any).intent ?? "follow_up",
        }),
        requiresApproval: true,
      },
    ],
  },
  // Correspondence Nurse — triages every inbound patient message and
  // drafts a clinically appropriate response. Approval-gated.
  {
    name: "correspondence-triage",
    on: ["message.received"],
    steps: [
      {
        agent: "correspondenceNurse",
        input: (e) => ({ threadId: (e as any).threadId }),
        requiresApproval: true,
      },
    ],
  },
  {
    name: "practice-launch",
    on: ["practice.onboarding.started"],
    steps: [
      {
        agent: "practiceLaunch",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  {
    name: "registry-refresh",
    on: ["patient.diagnosis.updated"],
    steps: [
      {
        agent: "registry",
        input: (e) => ({ patientId: (e as any).patientId }),
      },
    ],
  },
  {
    name: "physician-nudge",
    on: ["note.finalized"],
    steps: [
      {
        agent: "physicianNudge",
        input: (e) => ({
          noteId: (e as any).noteId,
          encounterId: (e as any).encounterId,
        }),
      },
    ],
  },
  {
    name: "patient-outreach",
    on: ["encounter.completed"],
    steps: [
      {
        agent: "patientOutreach",
        input: (e) => ({
          patientId: (e as any).patientId,
          encounterId: (e as any).encounterId,
        }),
        requiresApproval: true,
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────
  // Billing workflows — Phase 3 of the Revenue Cycle PRD
  // ─────────────────────────────────────────────────────────────────
  {
    name: "claim-scrub",
    on: ["claim.created"],
    steps: [
      {
        agent: "chargeIntegrity",
        input: (e) => ({ claimId: (e as any).claimId }),
      },
    ],
  },
  {
    name: "denial-triage",
    on: ["claim.denied"],
    steps: [
      {
        agent: "denialTriage",
        input: (e) => ({ claimId: (e as any).claimId }),
      },
    ],
  },
  {
    name: "statement-explanation",
    on: ["statement.generated"],
    steps: [
      {
        agent: "patientExplanation",
        input: (e) => ({ statementId: (e as any).statementId }),
      },
    ],
  },
  {
    name: "aging-sweep",
    on: ["billing.aging.sweep"],
    steps: [
      {
        agent: "aging",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  {
    name: "reconciliation-run",
    on: ["billing.reconciliation.run", "payment.received"],
    steps: [
      {
        agent: "reconciliation",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  {
    name: "underpayment-scan",
    on: ["billing.underpayment.scan", "claim.paid"],
    steps: [
      {
        agent: "underpaymentDetection",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  {
    name: "credit-scan",
    on: ["billing.credit.scan", "payment.received"],
    steps: [
      {
        agent: "refundCredit",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  {
    name: "revenue-command-brief",
    on: ["billing.command.brief"],
    steps: [
      {
        agent: "revenueCommand",
        input: (e) => ({ organizationId: (e as any).organizationId }),
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────
  // RCM Fleet — Phase 5 pre-submission pipeline (Layer 8, Flow 1)
  // ─────────────────────────────────────────────────────────────────
  // encounter.completed → Encounter Intelligence → charge.created
  {
    name: "encounter-charge-extraction",
    on: ["encounter.completed"],
    steps: [
      {
        agent: "encounterIntelligence",
        input: (e) => ({
          encounterId: (e as any).encounterId,
          patientId: (e as any).patientId,
        }),
      },
    ],
  },
  // coding.recommended → Claim Construction → claim.created
  // (Claim Construction also listens for coding.approved for human-reviewed cases)
  {
    name: "claim-construction",
    on: ["coding.recommended", "coding.approved"],
    steps: [
      {
        agent: "claimConstruction",
        input: (e) => ({
          encounterId: (e as any).encounterId,
          patientId: (e as any).patientId,
          organizationId: (e as any).organizationId,
        }),
      },
    ],
  },
];

/** Find every workflow step that should fire for a given event. */
export function matchWorkflows(event: DomainEvent): Array<{ workflow: WorkflowDefinition; step: WorkflowStep }> {
  const matches: Array<{ workflow: WorkflowDefinition; step: WorkflowStep }> = [];
  for (const wf of workflows) {
    if (!wf.on.includes(event.name)) continue;
    for (const step of wf.steps) matches.push({ workflow: wf, step });
  }
  return matches;
}

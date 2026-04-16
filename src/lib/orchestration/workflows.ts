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
    on: ["message.draft.requested", "patient.intake.stalled"],
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
    name: "pm-decompose",
    on: ["founder.prompt.received"],
    steps: [
      {
        agent: "mallik",
        input: (e) => ({ promptId: (e as any).promptId }),
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

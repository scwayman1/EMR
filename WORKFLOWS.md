# Workflows & Event Map

The orchestration layer is event-driven. Domain code emits events; the workflow engine turns events into `AgentJob` rows; the worker executes jobs against the agent registry.

## Event taxonomy

Events are dot-namespaced and always past tense. They are strongly typed (`src/lib/orchestration/events.ts`).

```
patient.created
patient.intake.updated
patient.intake.submitted
patient.intake.stalled         (emitted by scheduler after N hours of no activity)
patient.diagnosis.updated

document.uploaded
document.classified

assessment.assigned
assessment.submitted

encounter.scheduled
encounter.started
encounter.completed
encounter.note.draft.requested
note.finalized

message.draft.requested
message.sent

appointment.created
appointment.cancelled

research.query.submitted

practice.onboarding.started
```

## Workflow definitions

Workflows map `event → [agent jobs to enqueue]`. They live in `src/lib/orchestration/workflows.ts`.

```ts
export const workflows: WorkflowDefinition[] = [
  {
    name: "intake-completion",
    on: ["patient.intake.updated", "patient.intake.submitted"],
    steps: [{ agent: "intake", input: (e) => ({ patientId: e.patientId }) }],
  },
  {
    name: "document-classify",
    on: ["document.uploaded"],
    steps: [{ agent: "documentOrganizer", input: (e) => ({ documentId: e.documentId }) }],
  },
  {
    name: "visit-followup",
    on: ["encounter.completed"],
    steps: [
      { agent: "outcomeTracker", input: (e) => ({ patientId: e.patientId, lastCheckInAt: e.completedAt }) },
      { agent: "scheduling",     input: (e) => ({ patientId: e.patientId }) },
    ],
  },
  {
    name: "scribe-draft",
    on: ["encounter.note.draft.requested"],
    steps: [{ agent: "scribe", input: (e) => ({ encounterId: e.encounterId }), requiresApproval: true }],
  },
  {
    name: "coding-readiness",
    on: ["note.finalized"],
    steps: [{ agent: "codingReadiness", input: (e) => ({ noteId: e.noteId }) }],
  },
  {
    name: "research-synth",
    on: ["research.query.submitted"],
    steps: [{ agent: "researchSynthesizer", input: (e) => ({ query: e.query, patientId: e.patientId }) }],
  },
  {
    name: "message-draft",
    on: ["message.draft.requested", "patient.intake.stalled"],
    steps: [{ agent: "messagingAssistant", input: (e) => ({ patientId: e.patientId, intent: e.intent }), requiresApproval: true }],
  },
  {
    name: "practice-launch",
    on: ["practice.onboarding.started"],
    steps: [{ agent: "practiceLaunch", input: (e) => ({ organizationId: e.organizationId }) }],
  },
  {
    name: "registry-refresh",
    on: ["patient.diagnosis.updated"],
    steps: [{ agent: "registry", input: (e) => ({ patientId: e.patientId }) }],
  },
];
```

## Execution lifecycle

```
┌───────────┐   dispatch()   ┌────────────┐   enqueue    ┌────────────┐
│  Domain   │───────────────►│  Workflow  │─────────────►│ AgentJob   │
│  action   │   typed event  │  engine    │  one per step│ (pending)  │
└───────────┘                └────────────┘              └─────┬──────┘
                                                                │
                                       agent-worker poll       │
                                       (FOR UPDATE SKIP LOCKED)│
                                                                ▼
                                                        ┌───────────────┐
                                                        │  claimed      │
                                                        │  → running    │
                                                        └─────┬─────────┘
                                                              │
                        ┌─────────────────┬───────────────────┼───────────────┐
                        ▼                 ▼                   ▼               ▼
                  succeeded          needs_approval         failed         cancelled
                                          │
                                  operator approves
                                          │
                                          ▼
                                       running → succeeded
```

### Status model

| Status            | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| `pending`         | Enqueued, not yet claimed                       |
| `claimed`         | A worker has locked the row                     |
| `running`         | Agent is executing                              |
| `needs_approval`  | Agent returned a draft that needs a human      |
| `succeeded`       | Terminal success                                |
| `failed`          | Terminal failure (after all retries)            |
| `cancelled`       | Explicitly cancelled by an operator             |

### Retry policy

- Transient errors (DB timeout, model rate-limit) → exponential backoff, up to 5 attempts.
- Deterministic errors (validation, missing entity) → fail immediately, no retry.
- Every attempt appends to `AgentJob.logs`.

## Approval gates

Workflows can declare `requiresApproval: true` on a step. The worker will execute the agent, store its output as a draft in the relevant domain table, and transition the job to `needs_approval`. Mission Control surfaces these; an operator (or clinician for clinical drafts) reviews and either approves or rejects. Approval writes `approvedBy`, `approvedAt`, and emits a follow-up event (e.g. `note.approved`, `message.sent`).

## Observability

All workflow activity is visible through three surfaces:

1. **Mission Control UI** (`/ops/mission-control`) — job table, filters, approval queue, per-job timeline.
2. **AuditLog table** — every sensitive read/write, including agent actions.
3. **Structured logs** — `pino`-style JSON logs, field-redacted for PHI in production.

## Local development

A single `npm run dev` starts the web app. A separate `npm run worker` runs the agent worker in a second terminal. The worker polls every 2s in dev, 10s in production. All events are dispatched in-process **and** through the Postgres queue, so you can test both inline and async execution paths.

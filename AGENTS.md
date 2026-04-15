# Agent Fleet

Every agent in this system is a **typed workflow worker** — not a magical abstraction. Each has a clear mission, scoped inputs/outputs, explicit allowed actions, and a failure mode. Agents run inside the orchestration harness (`src/lib/orchestration`) and are invoked through `AgentJob` rows.

## Agent contract

```ts
interface Agent<I, O> {
  name: string;                    // unique identifier
  version: string;                 // semver, bumped on contract changes
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  allowedActions: AllowedAction[]; // explicit capabilities (read, write, draft, notify)
  requiresApproval: boolean;       // does the output need human sign-off?
  run(input: I, ctx: AgentContext): Promise<O>;
}
```

`AgentContext` gives the agent: a scoped DB client, the acting user/org, a logger that writes into `AgentJob.logs`, and a typed `emit()` for downstream events. Nothing else. An agent cannot reach out to the filesystem, shell, or arbitrary HTTP.

## Design rules

1. **Specialized over generic.** One agent per job-to-be-done.
2. **Explicit boundaries.** `allowedActions` is enforced by the context, not by convention.
3. **Observable.** Every decision the agent makes goes into `AgentJob.logs` with a timestamp.
4. **Auditable.** Every write produces an `AuditLog` row with `actor = "agent:<name>@<version>"`.
5. **Recoverable.** Deterministic retries for transient failures; `needs_approval` for ambiguous ones.
6. **Supportive.** Agents assist humans. They never finalize a clinical artifact on their own.

---

## Initial fleet (V1)

### 1. Intake Agent
- **Mission:** Monitor patient onboarding. Flag missing fields. Build the visit-ready chart summary.
- **Triggers:** `patient.intake.updated`, `patient.intake.submitted`
- **Inputs:** `{ patientId }`
- **Outputs:** `{ completenessScore, missingFields[], chartSummaryMd }`
- **Allowed actions:** read patient, write `ChartSummary`, enqueue reminder
- **Approval:** none (draft only; clinician reads the summary in the chart)
- **Failure modes:** missing patient → fail; partial data → succeed with warnings

### 2. Document Organizer Agent
- **Mission:** Classify uploaded documents into `note | lab | image | diagnosis | letter | other`. Suggest tags. Link to the relevant encounter if obvious.
- **Triggers:** `document.uploaded`
- **Inputs:** `{ documentId }`
- **Outputs:** `{ classification, tags[], suggestedEncounterId? }`
- **Allowed actions:** read document, update document metadata
- **Approval:** none (low risk — always reversible)
- **Failure modes:** unreadable file → mark `needs_review`, no guesswork

### 3. Outcome Tracker Agent
- **Mission:** Watch follow-up cadence per patient. Enqueue symptom/efficacy check-ins at the right intervals.
- **Triggers:** cron (daily), `encounter.completed`
- **Inputs:** `{ patientId, lastCheckInAt }`
- **Outputs:** `{ scheduled: [{ assessmentSlug, dueAt }] }`
- **Allowed actions:** read patient, create Task, create Assessment reminders
- **Approval:** none
- **Failure modes:** patient opted out → skip silently

### 4. Messaging Assistant Agent
- **Mission:** Draft routine administrative and follow-up messages (appointment confirmations, record requests, intake nudges). **Never sends on its own.**
- **Triggers:** `message.draft.requested`, `patient.intake.stalled`
- **Inputs:** `{ patientId, intent }`
- **Outputs:** `{ draftBody, tone, suggestedRecipients[] }`
- **Allowed actions:** read patient + thread, write draft message (status = `draft`)
- **Approval:** required — operator or clinician must click Send
- **Failure modes:** low-confidence intent → return draft flagged `needs_review`

### 5. Research Synthesizer Agent
- **Mission:** Retrieve + summarize evidence from the research corpus for a symptom, condition, or patient context.
- **Triggers:** `research.query.submitted`
- **Inputs:** `{ query, patientId? }`
- **Outputs:** `{ summary, citations[], quantitativeFindings[] }`
- **Allowed actions:** read research index, read patient (optional, for context framing only)
- **Approval:** none (read-only output)
- **Failure modes:** no results → return explicit empty result with suggestion to broaden query

### 6. Scribe Agent
- **Mission:** Draft a structured visit note from the visit workspace context (chart summary, recent messages, intake, outcome trends).
- **Triggers:** `encounter.note.draft.requested`
- **Inputs:** `{ encounterId }`
- **Outputs:** `{ noteBlocks: NoteBlock[], confidence }`
- **Allowed actions:** read encounter + patient + prior notes, write Note with `status = draft`
- **Approval:** **required** — clinician must review, edit, and sign. No exceptions.
- **Failure modes:** insufficient context → return a short summary block + explicit gaps list

### 7. Coding Readiness Agent
- **Mission:** Attach ICD-10 / E&M coding metadata suggestions to a finalized note, for future reimbursement workflows.
- **Triggers:** `note.finalized`
- **Inputs:** `{ noteId }`
- **Outputs:** `{ icd10Suggestions[], emLevelSuggestion, rationale }`
- **Allowed actions:** read note, write CodingSuggestion
- **Approval:** required if suggestions would be submitted; V1 is metadata-only
- **Failure modes:** no codes matched → write empty suggestion with rationale

### 8. Scheduling Agent
- **Mission:** Send reminders, handle reschedule prompts, and coordinate visit prep tasks.
- **Triggers:** cron, `appointment.created`, `appointment.cancelled`
- **Inputs:** `{ appointmentId }`
- **Outputs:** `{ actions: [{ type, scheduledFor }] }`
- **Allowed actions:** create Task, write Notification (draft), update Appointment
- **Approval:** required for outbound SMS/email in V1 (delivery integration deferred)

### 9. Practice Launch Agent
- **Mission:** Walk a new provider/practice through the go-live checklist. Track missing items. Flag blockers.
- **Triggers:** `practice.onboarding.started`, cron (daily nudge)
- **Inputs:** `{ organizationId }`
- **Outputs:** `{ readinessScore, blockers[], nextSteps[] }`
- **Allowed actions:** read Organization + Membership, write Task
- **Approval:** none

### 10. Registry / Qualification Agent
- **Mission:** Evaluate rules-based eligibility for diagnosis-linked discounts, registry states, or program membership.
- **Triggers:** `patient.diagnosis.updated`, cron
- **Inputs:** `{ patientId }`
- **Outputs:** `{ qualificationStatus, rulesMatched[], expiresAt? }`
- **Allowed actions:** read patient, write QualificationRecord
- **Approval:** required on status upgrade; none on refresh

---

## Agent registry (code)

Agents are registered in `src/lib/agents/index.ts`:

```ts
export const agentRegistry = {
  intake: intakeAgent,
  documentOrganizer: documentOrganizerAgent,
  outcomeTracker: outcomeTrackerAgent,
  messagingAssistant: messagingAssistantAgent,
  researchSynthesizer: researchSynthesizerAgent,
  scribe: scribeAgent,
  codingReadiness: codingReadinessAgent,
  scheduling: schedulingAgent,
  practiceLaunch: practiceLaunchAgent,
  registry: registryAgent,
} satisfies Record<string, Agent<any, any>>;
```

Adding an agent = new file + one line in the registry + a workflow definition in `src/lib/orchestration/workflows.ts`. Nothing else.

## Model strategy

The agent base class delegates model calls to a `ModelClient` interface. V1 ships with:

- `StubModelClient` — deterministic templated responses for CI + local dev. No network, no keys, always works.
- `OpenRouterModelClient` — real calls via [OpenRouter](https://openrouter.ai), which exposes an OpenAI-compatible endpoint that can route to Claude, GPT, Llama, and dozens of other providers.

Selection is env-driven (`AGENT_MODEL_CLIENT=openrouter`), so swapping providers — or swapping the underlying model (`OPENROUTER_MODEL=anthropic/claude-sonnet-4.5`, or any other slug) — never touches workflow code. A single `OPENROUTER_API_KEY` unlocks the whole fleet.

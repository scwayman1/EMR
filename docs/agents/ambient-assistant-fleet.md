# Ambient Physician Assistant Fleet

Per Dr. Patel's directive — agents that do cold-temperature work while the
physician sees patients. They look over the clinician's shoulder, run quiet
checks in the background, and post findings as `ClinicalObservation`
records. Those observations surface automatically on the Command Center's
Clinical Discovery tile (top signal) and Patient Impact tile (ranked
follow-ups).

No physician action required to invoke them. No approval dialogs. They
just write notes into the chart when they see something worth a second
look.

---

## The four patterns

The fleet demonstrates four different triggering patterns. Pick the
pattern that matches your new skill when extending the fleet.

| # | Agent | Pattern | Trigger | LLM? |
|---|-------|---------|---------|------|
| 1 | `prescriptionSafety` | Event-driven safety check | `dosing.regimen.created` | no |
| 2 | `adherenceDriftDetector` | Scheduled daily sweep | `adherence.checkup.requested` (09:00 UTC cron) | no |
| 3 | `messageUrgencyObserver` | Parallel event observer | `message.received` | no |
| 4 | `visitDiscoveryWhisperer` | LLM-powered synthesis | `note.finalized` | yes |

---

## 1. `prescriptionSafety` — interaction + contraindication scan

**File:** `src/lib/agents/prescription-safety-agent.ts`
**Version:** `1.0.0`
**Shipped:** commit `5d6b595`, ticket [#37](https://github.com/scwayman1/EMR/issues/37)

### Trigger

Event `dosing.regimen.created` is dispatched from
`src/app/(clinician)/clinic/patients/[id]/prescribe/actions.ts` after the
`DosingRegimen.create` call succeeds. Payload:

```
{ regimenId, patientId, productId, organizationId, prescribedById }
```

### Behavior

1. Loads the regimen + product + patient (allergies, history,
   contraindications, active meds).
2. Derives cannabinoids present in the prescribed product from concentration
   fields (THC / CBD / CBN / CBG).
3. Runs `checkInteractions(meds, cannabinoids)` and filters to
   red / yellow severities.
4. Matches `CANNABIS_CONTRAINDICATIONS.matchKeywords` against
   `patient.presentingConcerns + patient.contraindications`.
5. Skips any contraindications the clinician already overrode via
   `regimen.contraindicationOverride` — the override reason is the
   documented record of decision and re-flagging is just noise.
6. Writes one `ClinicalObservation` per finding.

### Severity mapping

| Finding | Severity | Category |
|---|---|---|
| Red interaction | `urgent` | `medication_response` |
| Yellow interaction | `concern` | `medication_response` |
| Absolute contraindication | `urgent` | `red_flag` |
| Relative contraindication | `concern` | `red_flag` |
| Caution contraindication | `notable` | `red_flag` |

### Tile surface

Every observation flows into the Command Center's Clinical Discovery
tile. When a physician prescribes, the Discovery tile fills in real
time with anything the agent caught.

---

## 2. `adherenceDriftDetector` — daily drift sweep

**File:** `src/lib/agents/adherence-drift-detector-agent.ts`
**Version:** `1.0.0`
**Shipped:** commit `6ac74cb`, ticket [#38](https://github.com/scwayman1/EMR/issues/38)

### Trigger

`src/workers/scheduler.ts` runs every 15 minutes on Render. The adherence
sweep fires only on the tick where `utcHour === 9 && utcMinute < 15` — one
execution per day, fleet-wide. The scheduler queries every patient with at
least one active regimen and dispatches `adherence.checkup.requested` per
patient. Payload: `{ patientId, organizationId }`.

### Behavior

For each active `DosingRegimen` on the patient, the pure helper
`classifyAdherence(regimen, logs, now)` compares the last 7 days of dose
log activity against the preceding 14-day baseline and returns a
`DriftFinding | null`. Findings are written as
category-`adherence` observations.

### Flag conditions (most urgent wins)

| Condition | Severity | checkKind |
|---|---|---|
| ≥72h since last dose on regimen that's been live ≥72h | `urgent` | `stalled` |
| 7-day adherence <30% OR dropped ≥25pp vs baseline | `concern` | `drift` / `low_pace` |
| 7-day adherence 30–60% with no baseline drop | `notable` | `chronic_low` |
| Otherwise | (no observation) | — |

### Key design call

The **baseline-drop check** is the heart of this one. A patient who's
always been at 45% isn't "drifting" — they have a baseline issue that
belongs in a different conversation. Only flagging real deltas keeps
the Discovery tile signal, not noise.

Fresh regimens (<72h old) skip the stalled check so a just-filled
prescription doesn't false-alarm on the first sweep.

### Tile surface

Clinical Discovery tile's care-gaps bucket; top-severity urgent /
concern findings also bubble up into Patient Impact's ranked list.

---

## 3. `messageUrgencyObserver` — triage persistence

**File:** `src/lib/agents/message-urgency-observer-agent.ts`
**Version:** `1.0.0`
**Shipped:** commit `5a11c15`, ticket [#39](https://github.com/scwayman1/EMR/issues/39)

### Trigger

Event `message.received` is dispatched from
`src/app/(patient)/portal/messages/actions.ts` every time a patient sends a
message. This agent listens in parallel with `correspondenceNurseAgent`
(response drafter, approval-gated). Zero conflict — different workflows,
same event.

Payload: `{ messageId, threadId, patientId, organizationId }`.

### Behavior

1. Loads the thread + up to 10 most recent messages.
2. Runs the existing `triageThread()` keyword heuristic from
   `src/lib/domain/smart-inbox.ts`.
3. Writes a durable `ClinicalObservation` only for:
   - Urgent keyword (triage priority `urgent`) → `severity: urgent`, `category: red_flag`
   - Adverse reaction (`high` + `adverse_reaction` category) → `severity: concern`, `category: side_effect`
4. Every other priority class is a no-op — the inbox preview + nurse
   drafter already handle those.

### Why durable

Threads fade. The moment a patient replies "thanks, feeling better," the
red dot clears from the MessagesTile inbox preview — the original urgent
signal is gone. An observation is durable: shows up on Clinical Discovery
and Patient Impact until the physician explicitly resolves it. **A 2am
urgent message lands on the 9am dashboard regardless of whether the patient
has replied since.**

---

## 4. `visitDiscoveryWhisperer` — LLM-powered synthesis

**File:** `src/lib/agents/visit-discovery-whisperer-agent.ts`
**Version:** `1.0.0`
**Shipped:** commit `546f987`

### Trigger

Event `note.finalized`, dispatched when a `Note.status` transitions to
`finalized`. Runs in parallel with `physicianNudge` and `codingReadiness`
— same event, different downstream consumers.

Payload: `{ noteId, encounterId, finalizedBy }`.

### Behavior

1. Loads the finalized note's blocks + narrative.
2. Renders them into a prompt asking the configured model client
   (`ctx.model`) for the SINGLE most important clinical discovery from the
   visit. The prompt gives the model an explicit escape hatch
   (`{"discovery":"none"}`) for routine follow-ups with no standout
   finding.
3. Parses the JSON response with a strict parser that strips markdown
   fences and leading prose.
4. Coerces `category` and `severity` against the observation enums.
5. Writes the observation at category / severity the model chose.

### Design principles

1. **Model picks category + severity**, constrained to enum values.
   Responses with any value outside the allowlist are rejected silently.
2. **"None" is a valid answer.** Routine follow-ups with no standout
   finding return an explicit no-observation signal.
3. **Model failures are silent.** Credit-limit 402s, network blips,
   malformed JSON — all fall through to "no observation written."
   Never write garbage into a patient chart.
4. **The stub client never produces false positives** because its
   output doesn't parse as JSON.

### Tile surface

Renders as the **Top signal** row on the Clinical Discovery tile.

---

## Shared plumbing

All four agents share the same foundations:

- **Tool permissions** via `ctx.assertCan("read.patient")` and
  `ctx.assertCan("write.outcome.reminder")`. Gated by each agent's
  `allowedActions` array (see agent definitions).
- **Observations** are written via
  `src/lib/agents/memory/clinical-observation.ts`'s `recordObservation()`.
  Consistent shape: `observedBy`, `observedByKind: "agent"`, `category`,
  `severity`, `summary`, optional `actionSuggested`, evidence, metadata.
- **Model client** is resolved via
  `src/lib/orchestration/model-client.ts::resolveModelClient()` — uses
  `StubModelClient` in dev/CI, `OpenRouterModelClient` in production with
  automatic free-tier fallback on credit-limit failures.
- **Registration** happens in `src/lib/agents/index.ts::agentRegistry`
  and workflows in `src/lib/orchestration/workflows.ts`.
- **Event dispatch** via `src/lib/orchestration/dispatch.ts::dispatch()`.

---

## Testing

The agents have pure-helper unit tests in each `*-agent.test.ts` file.
Coverage focuses on the classification / parsing logic rather than the
full agent runtime (which would require Prisma mocking and is a follow-up
ticket). Run with:

```
npm test            # one-shot, CI mode
npm run test:watch  # dev feedback loop
```

Current test count: 35 passing across 4 agents.

---

## Adding a fifth agent

Adding a new ambient agent is a five-file change:

1. `src/lib/agents/my-new-agent.ts` — the agent itself (follow the
   existing pattern: `export const Agent<I, O>` with `inputSchema`,
   `outputSchema`, `allowedActions`, `requiresApproval`, `run()`).
2. `src/lib/agents/index.ts` — import + add to `agentRegistry`.
3. `src/lib/orchestration/events.ts` — add a new event type if you
   need a new trigger; skip if reusing an existing event.
4. `src/lib/orchestration/workflows.ts` — append a new
   `WorkflowDefinition` mapping your event to your agent.
5. `src/lib/agents/my-new-agent.test.ts` — pure-helper tests.

Optional: if your agent runs on a schedule, add the dispatch logic to
`src/workers/scheduler.ts`.

### When to use which pattern

- **Event-driven safety check** — something happened (prescription
  created, diagnosis added, lab ingested) and the new state needs
  checking against some ruleset. Deterministic is fine. Example:
  `prescriptionSafety`.
- **Scheduled sweep** — no natural trigger event; you're scanning
  for drift or silent decay. Runs per patient or fleet-wide on a
  cron. Example: `adherenceDriftDetector`.
- **Parallel event observer** — another workflow already listens to
  the event and does one thing; you want to listen in parallel and
  enrich durable state. Example: `messageUrgencyObserver`.
- **LLM-powered synthesis** — the signal isn't in structured data;
  it's buried in free-text and needs language understanding.
  Always ship with a silent no-op fallback on model failure.
  Example: `visitDiscoveryWhisperer`.

---

## Data gaps the fleet can't fill yet

Current observation-based Patient Impact and Clinical Flow tiles
render `—` for some metrics. The fleet can't fill these without schema
changes first:

- **`Encounter.chartingCompletedAt`** — needed for Clinical Flow's
  "Charting carryover" metric. Fill by wiring `note.finalized` handler
  to set the timestamp. A follow-up ticket.
- **`PatientRiskScore` table** — needed for proper Patient Impact
  "Care advanced" and risk-scoring. Current tile proxies from
  observations; real metric needs a dedicated model + daily batch job.

These gaps are tracked in issue [#36](https://github.com/scwayman1/EMR/issues/36)
as follow-ups.

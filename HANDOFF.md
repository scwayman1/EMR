# Agentic Harness v2 — Memory, Expertise, Presence

> Handoff note from the "run an agentic swarm on the harness" session.
> Branch: `claude/cannabis-care-platform-prd-rrZyX`
> Starting commit: `9096af3`
> Ending commit: see `git log --oneline | head -10`

## The brief you gave me

> "Run an agentic swarm on building out and solidifying the agentic
> harness. I want this harness to focus on **memory** and really
> **building clinical expertise**. So really understanding the patient
> that we're speaking to, really becoming a clinical expert that learns
> alongside the physician. Understanding everything about the patient
> population, and being a **warm and reliable presence** for all
> patients and also being a reliable and sturdy **clinical decision
> support ecosystem** for the physician. This harness must be next
> level. If you have to go out and build out the architecture, do it.
> I do have an approach for a harness that I can share with you but I
> don't want you to become religious about it or beholden to it."

I took that as permission to pick an architecture and move, with a firm
understanding that you'll share your approach when you return and I
should be ready to reconcile. This doc exists so reconciliation is
cheap.

## The core insight that drove everything

The existing harness was **stateless**. Every agent run loaded the
chart from scratch, wrote an output, and forgot. There was no
persistent understanding of a patient that deepened over time. Nora
didn't remember that last month Maya said she prefers fewer pills. The
scribe didn't know what pre-visit intelligence noticed. No agent ever
said "I've been watching this trend for three weeks."

Everything in this pass flows from fixing that. The four Prisma models
I added are the spine. The helpers are the interface. The UI tab is
the surface. The persona layer is the voice. The cohort helper is the
population-level lens. They fit together like this:

```
            ┌─────────────────────────────────────────────┐
            │         Physician-facing surfaces            │
            │  · Memory tab on patient chart              │
            │  · Approvals inbox (existing, unchanged)    │
            │  · Pre-visit briefing (now memory-aware)    │
            └───────────────┬─────────────────────────────┘
                            │ reads
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agentic memory harness                    │
│                                                             │
│  PatientMemory       ClinicalObservation                    │
│  (narrative, evolving (structured insights,                 │
│   understanding)     evidence-backed)                       │
│                                                             │
│  AgentReasoning      AgentFeedback                          │
│  (per-output trace)  (approve/edit/reject signal)          │
│                                                             │
│  Helpers: recordMemory, recallMemories, recordObservation,  │
│           startReasoning, recordFeedback, findSimilarPatients│
└───────────────┬─────────────────────────────────────────────┘
                │ read + write
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent fleet                              │
│                                                             │
│  Nurse Nora          preVisitIntelligence                   │
│  (memory + persona   (memory + cohort + reasoning)         │
│   + reasoning)                                              │
│                                                             │
│  ...16 others ready for the same integration               │
└─────────────────────────────────────────────────────────────┘
                │ governed by
                ▼
            ┌─────────────────────────────────────────────┐
            │   persona.ts (shared voice registry)        │
            │   · Nurse Nora — warm-clinical              │
            │   · Scribe — crisp-professional             │
            │   · Outreach — gentle-proactive             │
            │   · 2 more, plus DEFAULT_PERSONA fallback   │
            └─────────────────────────────────────────────┘
```

## Phase-by-phase map

### Phase A — Foundation (commit `fc50b02`)

New Prisma models:

| Model | Purpose |
|---|---|
| **PatientMemory** | The soft, narrative, evolving understanding of a person. Versioned (supersededById), tagged, confidence-weighted, time-scoped (validFrom / validUntil). Nine kinds: preference, observation, trajectory, relationship, context, milestone, working, not_working, concern. |
| **ClinicalObservation** | Structured insights an agent notices. Evidence-backed (references to messageIds, noteIds, outcomeLogIds). Severity-ranked (info / notable / concern / urgent). Acknowledgeable by the physician. Has category enum (symptom_trend, medication_response, adherence, emotional_state, red_flag, positive_signal, side_effect, lifestyle_shift, engagement, other). |
| **AgentReasoning** | Per-job reasoning trace. Steps array (each with input/output/durationMs), sources map, alternatives considered, final confidence + summary. The "explain why" surface. |
| **AgentFeedback** | Captures approve / edit_approve / reject / dismiss signals. editDelta for the edit case. Aggregated into per-agent approval rates. |

All four exist in `prisma/schema.prisma`. Render's `prisma db push` on
deploy will materialize them.

New helpers (all under `src/lib/agents/memory/`):

- `patient-memory.ts` — `recordMemory`, `recallMemories`, `invalidateMemory`, `formatMemoriesForPrompt`
- `clinical-observation.ts` — `recordObservation`, `recallObservations`, `acknowledgeObservation`, `resolveObservation`, `formatObservationsForPrompt`
- `agent-reasoning.ts` — `startReasoning` returns a trace builder with `.step()` / `.source()` / `.alternative()` / `.conclude()` / `.persist()`. Persist is **best-effort and non-blocking** — a failure never takes down an agent run.
- `agent-feedback.ts` — `recordFeedback`, `getAgentFeedbackStats`, `computeEditDelta`. Also best-effort.
- `cohort.ts` (added in Phase B by a swarm agent) — `findSimilarPatients`, `summarizeCohortOutcomes`, `formatCohortInsightForPrompt`. Deterministic SQL-based similarity. 2 queries total, no N+1.

### Phase B — Integration (commits `3f221c0`, `75ebff3`)

- **correspondenceNurse** (flagship) now:
  1. Starts a reasoning trace at the top of `run()`
  2. Recalls up to 24 memories and 8 open observations before drafting
  3. Inlines both into the LLM prompt under "WHAT WE ALREADY KNOW ABOUT THIS PERSON" and "WHAT THE CARE TEAM HAS BEEN NOTICING RECENTLY"
  4. Uses `formatPersonaForPrompt(resolvePersona("correspondenceNurse"))` to pull Nora's voice from the shared registry (not inline strings)
  5. Asks the LLM to return a `newMemory` field when a message reveals something worth remembering — agent-inferred memories land at 0.65 confidence so physicians see them as hypotheses not facts
  6. Records ClinicalObservations based on urgency (emergency → red_flag urgent, high → concern, gratitude → positive_signal info). Routine/low messages don't create observation noise.
  7. Persists the reasoning trace at the end (best-effort)

- **preVisitIntelligence** now:
  1. Starts a reasoning trace
  2. Recalls memories + open observations
  3. Calls `findSimilarPatients()` + `summarizeCohortOutcomes()` and inlines a COHORT CONTEXT block when ≥2 similar patients exist in the org
  4. Briefing prompt explicitly asks the LLM to reference memory and cohort context in talking points
  5. Persists the trace at both exit paths (LLM success + deterministic fallback)

- **Feedback loop wired into approvals** (delivered by swarm agent):
  `src/app/(clinician)/clinic/approvals/actions.ts` now calls `recordFeedback()` after every approve / edit-approve / reject. Edit path computes the edit delta before committing. All three calls try/catch so feedback failure never blocks the approval. `parseSenderAgent()` helper handles "name:version" split and gracefully skips legacy drafts.

- **Persona layer** (delivered by swarm agent):
  `src/lib/agents/persona.ts` — 5 voice profiles + DEFAULT_PERSONA fallback. All under 250 tokens when rendered. Bakes the Constitution lines "This isn't MyChart — it's MyStory" and "no AI filler, no liability-cover clichés" directly into every rendered output. `neverSay` lists refuse chatbot filler like "As an AI", "I understand your concern", boilerplate "please consult your doctor".

### Phase C — Surface (commit `5e97a26`)

- **New Memory tab on every patient chart.** Positioned right after Demographics. Count pill shows (live memories + open observations).
- **`MemoryTab` component** renders four sections:
  1. **Hero strip** — "We remember N things about {firstName}" + most recent memory quoted + urgency-ranked badges
  2. **Open observations feed** — severity-colored cards with agent avatar, category badge, suggested action callout
  3. **Grouped memories** — nine groups in priority order (concerns → working → not working → preferences → trajectory → observation → relationships → context → milestones). Each group is a color-bordered card with attribution, timestamp, confidence indicator (when <0.7), and tags.
  4. **Acknowledged observations** — compact fade-out list at the bottom

No agent naming on the patient side. The Memory tab is clinician-only; patients never see it.

### Phase D — Seed + handoff (this commit)

- **Realistic demo memories seeded** for Maya Reyes (8 memories, rich longitudinal story), James Chen (4 memories, cardiac hold event), Sarah Thompson (2 memories, brand new). Plus 5 demo clinical observations spanning the severity spectrum. Seed is idempotent (deleteMany first).
- **This HANDOFF.md** — what you're reading.

## What I deliberately did NOT do (and why)

1. **Vector store / embeddings for memory.** V1 memory is a few Postgres rows per patient. When you actually need retrieval over huge corpora (thousands of patients, millions of messages), layer pgvector on top of the existing schema — the write path won't change. Shipping a vector store now would be premature optimization.

2. **Structured memory fields.** I chose narrative prose over `{ sleepHours: 7, pain: 4 }` for memories because OutcomeLog and DosingRegimen already hold the numbers. Memory holds the *interpretation* — "sleep improved from ~5h to ~7h since starting CBN nightly" — which is what actually informs future drafting. Structured fields can be added later as metadata without changing the contract.

3. **Memory mutation.** Memories are append-only. When something changes, we write a new memory and mark the prior one `supersededById`. The history is a feature, not waste — it's how you see how our understanding evolved.

4. **Scribe integration.** The scribe already drafts from full encounter context; adding memory/reasoning to it is polish, not foundation. I prioritized the Memory tab UI over wiring one more agent. Easy follow-up.

5. **Physician override of memories.** Read-mostly for V1. The next iteration should let physicians edit memory content, correct the kind, or mark as "not quite right" — and those corrections should flow back into the feedback loop.

6. **Cohort retrieval via embeddings.** Current implementation is deterministic structured overlap (presenting concerns, regimen product types, qualification, geography, age, memory tags). Weighted sum, sorted, top N. Fine for hundreds of patients per org. For a practice with thousands of patients we'll need a materialized feature table — but the interface will be unchanged.

## Architectural decisions that matter

### Best-effort writes, never in the clinical hot path

Every memory / observation / reasoning / feedback write is wrapped in try/catch inside a warn-log-and-continue pattern. Rationale: **Art. VI §1 of the Constitution says clinical features must fail gracefully**. A broken memory write should never delay a physician approving a message or a patient getting their draft. The memory layer is a nice-to-have that adds compounding value over time; the clinical work is the must-have.

### The voice is governed by one file

All chatbot-filler refusal ("As an AI", "I understand your concern", liability-cover cliché "please consult your doctor") lives in `persona.ts`. Agents import from there. Changing the voice of the entire fleet is now a one-file edit. This matches the Art. IV §4 pledge ("This isn't MyChart — it's MyStory") — the voice is the literal enactment of the Constitution, so it deserves its own module.

### No memory bleeds through the patient/clinician boundary

Patients never see the Memory tab. They never see "Nurse Nora drafted a reply" (fixed in earlier commit `9096af3`). From the patient's perspective the care team is their care team — the AI assist happens behind the curtain, exactly as Art. III and Art. V require. The Memory tab is a clinician-private surface.

### Source attribution is first-class

Every memory and observation carries `source` + `sourceKind` ("agent" | "user"). Every display of them resolves the source through `resolveAgentMeta()` from `ui-registry.ts` so you see the agent avatar and display name ("Nurse Nora") — not the raw `correspondenceNurse:1.0.0` string. A physician can always answer "why do we think this?" by looking at the attribution.

### Reasoning traces exist but the UI for them is deferred

The AgentReasoning model is populated. The persist path works. But I didn't build the "click to see the reasoning chain" surface — it's a natural follow-up and the data is ready for it. When you want it, hang an `<ExplainWhy />` component off any AgentSignalCard and query `AgentReasoning` by `agentJobId`.

## What's on the branch when you return

```
fc50b02  Phase A: agentic memory harness foundation (schema + helpers)
3f221c0  Phase B.1: wire memory + reasoning + feedback + cohort into the harness
75ebff3  Phase B.2: persona layer + preVisitIntelligence memory/cohort/reasoning
5e97a26  Phase C: Memory tab on patient chart
(this)   Phase D: seed demo memories + HANDOFF.md
```

Every commit is compiling. Every commit has a detailed message. The
full path is reviewable as a sequence — you don't have to read one
giant diff.

## What I'd do next if given another 3 hours

1. **Click-through reasoning traces in the UI.** The data is there; an `<ExplainWhy jobId={...} />` component dropped into the AgentSignalCard would surface every step, source, and alternative. 1-hour job.

2. **Wire scribe + messagingAssistant + patientOutreach into memory.** Same pattern as correspondenceNurse — recall before prompting, record after drafting. The persona layer is already ready for them. ~30 min per agent.

3. **Physician override of memory.** Let a clinician click a memory, edit its content, adjust its confidence, or invalidate it. The write ends up as an AgentFeedback row with the correction, feeding the learning loop. 1-hour job.

4. **Per-agent feedback dashboard.** `getAgentFeedbackStats()` is already implemented. Build a small operator-facing view that shows "Nurse Nora: 87% clean approval rate over last 30 days, 12% edit rate, 1% reject" so we can actually measure and tune. 1-hour job.

5. **The physician-facing bridge / command center you asked about earlier.** All the pieces are now in place: memory, observations, feedback stats, reasoning. The "agentic fleet" view can finally show something real. 2-hour job.

## Reconciling with your approach

When you share your harness design, the most likely places for friction:

- **Memory shape.** If your approach uses structured fields (e.g. "working meds: [...], not working meds: [...]") instead of narrative prose, the `PatientMemory.content` field can carry JSON strings instead and `formatMemoriesForPrompt` can be rewritten. The read/write API stays the same.

- **Vector retrieval.** If your approach uses embeddings, add a pgvector column to `PatientMemory` and an optional `vectorSearchMemories()` helper. The existing `recallMemories()` stays for callers who want deterministic queries.

- **Reasoning format.** If your approach has a different reasoning trace shape (e.g. a specific ReAct format), rewrite `startReasoning()` to emit that shape. The persist path is opaque to the agents — they just call `.step()` and `.conclude()`.

- **Persona split.** If your approach has separate voice profiles per patient population or per clinic, extend `resolvePersona(agentKey, context)` to take a second argument. The callers are one-liners.

Nothing in this pass is load-bearing on an opinion that can't be swapped later. The shapes are narrow and the integration points are narrow. Rewrite the internals; keep the call sites.

—

**Status when you return**: every commit green, every phase on the branch, every decision documented. I prioritized compounding value (memory + voice + surface) over breadth (16 agent integrations). If anything here doesn't match your mental model, this doc should be enough to negotiate the delta.

Welcome back. Hope dinner was good.

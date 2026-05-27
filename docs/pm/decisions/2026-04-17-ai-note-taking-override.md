# Decision — AI-assisted note-taking is IN scope (overrides Dr. Patel's stated preference)

- **Date:** 2026-04-17
- **Decided by:** Product owner (Scott)
- **Mallik role:** record the decision, propagate through PRD + tickets
- **Affects:** MALLIK-005 (Mission Control Epic), Phase 2 encounter workflow tickets, `src/lib/agents/scribe-agent.ts` roadmap

## Context

In `research/dr-patel-interview-2.md` Dr. Patel says:

> In terms of writing the note, it would be nice that I just see a patient, and I'm not really big on AI recording, but maybe at least I see the patient, I can dictate what I want to write and it automatically just populates.

Dr. Patel has stated he is not personally enthusiastic about AI note-taking / ambient recording, and prefers dictation with autopopulation.

## Decision

**AI-assisted note-taking — ambient scribe, dictation, and post-visit AI draft refinement — is a core capability of the Leafjourney platform and remains in scope for Phase 2.**

Dr. Patel's individual preference does not override the product roadmap. He is one user research subject, not the product owner. Other clinicians on the platform will want AI note authoring, and the existing `scribe` agent (see `AGENTS.md` and `src/lib/agents/scribe-agent.ts`) is already the spine of the note-authoring flow.

## How this shows up in the product

- **Dictation capture** is supported (Dr. Patel's preferred mode) — but it's one of several input modes, not the only one.
- **Ambient scribe** (recording the visit, AI-structures the note) is supported and opt-in **per clinician**. Dr. Patel can leave it off on his personal profile; other clinicians can enable it.
- **AI draft refinement** of notes (rewrite, expand, clinical-voice, dosing detail) is **always on** — this is table-stakes modern EMR behavior and saves every clinician time regardless of input mode.
- **Billing superbill generation from the AI-structured note** is in scope (Phase 3) — the AI note is an upstream dependency for billing, so AI note-taking is not optional for the full value chain.

## Operational rule going forward

When Dr. Patel's preferences diverge from the product roadmap:

1. **Record the preference** in `research/` (never edit his interview transcripts).
2. **Record the decision** here with rationale.
3. **Surface it in the relevant ticket** so eng sees the context.
4. **Do not argue with Dr. Patel** — his role is to describe his current workflow, pain, and wishes. The product owner decides what ships.
5. Future clinician interviews (non-Patel) should be gathered to validate that AI note-taking demand exists among the broader user population.

## Related

- `research/dr-patel-interview-2.md`
- `prds/mission-control.md` (Phase 2 section)
- `AGENTS.md` (scribe agent exists in the fleet)

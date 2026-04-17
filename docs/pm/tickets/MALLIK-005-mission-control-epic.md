# MALLIK-005 — EPIC: Physician Mission Control

- **Type:** Epic
- **Reporter:** Dr. Patel (interview + hand-drawn wireframe, 2026-04-17)
- **Owner:** Mallik
- **Status:** approved-to-plan (Phase 1 scoped; awaiting sequencing sign-off)
- **Priority:** P0 (core physician experience)

## Problem

Dr. Patel's current EMR workflow is a clicks-per-task disaster. Document review is copy-paste from a Word doc. Refills are one-at-a-time. Charting happens on paper, then Word, then copy-pasted into the EMR. Billing is handwritten superbills on fax. Messages arrive all day, un-triaged. There is no unified physician home screen — every task lives on a different tab on a different screen.

## Goal

Evolve the existing `/clinic` Command page into a **Mission Control** dashboard composed of task-oriented modules that let the physician knock out routine work at scale — with safety rails, auditability, and AI copilots behind each module.

## Success definition

Phase 1 complete when Dr. Patel can:

1. Open `/clinic` and see a single-glance dashboard with Schedule, Refills, Labs, Documents, Messages.
2. Click a single lab → see current vs prior values inline → click "looks good" → auto-draft patient message → batch-sign with three others in one password entry.
3. Click a single refill → see patient + drug + dose + qty + pharmacy + last relevant lab → check → batch-sign & send.
4. Reduce clicks per lab review from ~10 to ≤3 and time per refill from ~60s to ≤10s.

## Source materials (read these before designing)

- `docs/pm/prds/mission-control.md` — full PRD
- `docs/pm/research/dr-patel-interview-1.md` — verbatim interview
- `docs/pm/wireframes/dr-patel-mission-control-v1.md` — hand-drawn wireframe
- `AGENTS.md` — existing agent fleet (we reuse `scribe`, `messagingAssistant`, `codingReadiness`; we add `labSummarizer`, `refillCopilot`)

## Child tickets

### Phase 1 — quick wins

- **MALLIK-006** — Lab Review Queue with auto-compare overlay + outreach drafting (recommended first build)
- **MALLIK-007** — Refill Queue with batch sign & send
- **MALLIK-008** — Document Review Queue (imaging, sleep, PT, prior auths) — reuses 006 pattern
- **MALLIK-009** — Message Triage upgrade on `/clinic/messages` (AI-labeled actions, quick-reply)
- **MALLIK-010** — Mission Control dashboard assembly on `/clinic` (static grid composing 006–009 modules)

Ship sequence: 006 → 007 → 010 (makes the first two visible as a unified surface) → 008 → 009. Phase 1 lands in ~2–3 weeks of focused work.

### Phase 2 — encounter & charting

- Ticket IDs reserved — will be filed after Phase 1 is in user testing
- Work items: encounter-native note authoring, vitals auto-ingestion, imaging/document AI summaries inside overlays

### Phase 3 — billing, OCR, outreach

- Ticket IDs reserved — will be filed after Phase 2
- Work items: digital superbill + coding, handwritten-note OCR pipeline, AI voice/text outreach, population-level trends panel

## Safety rails (enforced across all child tickets)

1. Physician is always the final signatory on clinical decisions.
2. Batch actions require explicit review state + re-authentication.
3. AI-generated outbound comms are previewable before send — no silent outreach.
4. Abnormal labs / high-risk imaging auto-escalate out of the batch lane.
5. Every action produces an `AuditLog` row (actor, target, action, payload).
6. Refill safety checks (opioid MME, benzo+opioid combos, renal dosing) are mandatory.
7. OCR content requires physician validation before clinical use.

## Open questions (blocking Phase 1 kickoff)

See PRD open questions list. Critical ones for sequencing:

1. **Lab data source:** fixture-only in Phase 1, or wire to real lab feed?
2. **Pharmacy roundtrip:** Surescripts integration in Phase 1, or fax PDF generation?
3. **Grid layout:** static grid in Phase 1, drag-resize in Phase 1.5?
4. **Route:** evolve `/clinic` or add `/clinic/mission-control`?
5. **Mobile:** in or out of Phase 1 scope?

## Non-goals (for this epic)

- Rebuilding the patient portal (separate epic if Dr. Patel asks)
- Designing the operator (`/ops`) mission control — that's a different role
- Voice-in-physician-voice outreach cloning — deferred to Phase 3 safety-review
- Full EHR integrations (Surescripts, HL7, FHIR) — likely Phase 2+ depending on answer to Q2

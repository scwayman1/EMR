## Night Shift Phase 6 — 30 Ticket Batch Workflow

> Sequential block of 30 untouched tickets from the backlog (EMR-081 through EMR-110)
> organized into 6 parallel tracks for Phase 6 execution.
> Date: 2026-04-27
> Status: All 30 tickets confirmed `Status: in_progress` in [TICKETS.md](TICKETS.md).

## How to use this document

Each track below is independent and can be claimed by a single agent or sub-fleet. Agents
should:

1. Read the ticket's full description in [TICKETS.md](TICKETS.md) before starting.
2. Honor the [CLAUDE.md](CLAUDE.md) Data Collection Philosophy: emoji-first, Apple-iOS
   aesthetic, fun > friction, structured-for-research.
3. Surface clinical work through the agent fleet — see [AGENTS.md](AGENTS.md) and
   [WORKFLOWS.md](WORKFLOWS.md) for the contract and event taxonomy.
4. Update ticket `Status:` to `done` only after build passes and the feature is exercisable.
5. Append a short summary entry to [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md).

## Track 1 — RCM & Revenue Cycle

Coding, superbills, analytics, and expected reimbursement pipelines. Builds on the existing
billing foundation (Phases 1-4 already shipped).

| Ticket | Title | Priority |
|---|---|---|
| [EMR-101](TICKETS.md) | Complete CPT/ICD-10 Code Book + Superbills | 1 — Urgent |
| [EMR-102](TICKETS.md) | Novel Cannabis ICD-10 / CPT Code Proposal | 2 — High |
| [EMR-107](TICKETS.md) | Expected Reimbursement Rate Prediction | 2 — High |
| [EMR-108](TICKETS.md) | Modular Full Revenue Cycle System | 2 — High |
| [EMR-103](TICKETS.md) | Practice Analytics Deep Dive | 2 — High |

Suggested ordering: 101 → 102 (codes first), 108 → 107 (rev-cycle skeleton, then prediction
overlay), 103 last (analytics dashboard reads from the others).

## Track 2 — Interop & Operational Efficiency

Heavy systemic integrations, OCR intakes, and UX click-tracking. HL7/FHIR backbone work
lands here.

| Ticket | Title | Priority |
|---|---|---|
| [EMR-081](TICKETS.md) | OCR Scan & Auto-Populate | 2 — High |
| [EMR-085](TICKETS.md) | iCal / Google Calendar Export | 3 — Normal |
| [EMR-104](TICKETS.md) | Click Counter / Workflow Efficiency Tracking | 3 — Normal |
| [EMR-106](TICKETS.md) | Hospital System Integration (Closed Loop) | 2 — High |
| [EMR-090](TICKETS.md) | ER/Hospital Admission Notification + Inpatient EMR | 1 — Urgent |

Suggested ordering: 106 establishes the FHIR backbone that 090 plugs into. 081 and 085 are
self-contained. 104 instruments existing flows.

## Track 3 — External Portals & Content

Advocacy, philanthropy, and interactive learning nodes. Mostly patient-facing surfaces.

| Ticket | Title | Priority |
|---|---|---|
| [EMR-086](TICKETS.md) | Community Resource Connector | 2 — High |
| [EMR-087](TICKETS.md) | Legislative Advocacy Portal | 3 — Normal |
| [EMR-089](TICKETS.md) | Cannabis-Infused Recipe Library | 3 — Normal |
| [EMR-100](TICKETS.md) | AI Tutorial Videos (30-second reels) | 3 — Normal |
| [EMR-105](TICKETS.md) | Philanthropy / Donations Module | 4 — Low |

Suggested ordering: 086 and 087 share a geo-lookup pattern — build once, reuse. 089 is a
pure CRUD library. 100 needs a screen-recording pipeline. 105 feeds the Spiritual pillar.

## Track 4 — Deep Clinical Features & Research

Dispensary linkage, ECS lab frameworks, and research modules. Research-corpus heavy.

| Ticket | Title | Priority |
|---|---|---|
| [EMR-088](TICKETS.md) | Cannabis Contraindication Override Warning | 1 — Urgent |
| [EMR-091](TICKETS.md) | Medical Cannabis Dispensary Module | 1 — Urgent |
| [EMR-096](TICKETS.md) | Double-Blind Study Module | 3 — Normal |
| [EMR-097](TICKETS.md) | Data Research & Reports Module | 2 — High |
| [EMR-099](TICKETS.md) | Endocannabinoid System Labwork Framework | 2 — High |

Suggested ordering: 088 is a guardrail on the existing prescribe flow — quick win. 091 is
the big lift (dispensary side + provider side + patient side + CURES). 097 unlocks 096.
099 sits on top of the existing lab framework.

## Track 5 — Patient Journey & Holistic Medicine

AI coaching, educational delivery, and spiritual/lifestyle integration. Voice-of-the-patient.

| Ticket | Title | Priority |
|---|---|---|
| [EMR-092](TICKETS.md) | Dual Treatment Protocols — Western + Eastern (Holistic) | 2 — High |
| [EMR-093](TICKETS.md) | Four Pillars of Health Bar Graph | 2 — High |
| [EMR-095](TICKETS.md) | Spiritual Wellness Lifestyle Category | 3 — Normal |
| [EMR-098](TICKETS.md) | AI Coach with Personalized Style | 2 — High |
| [EMR-110](TICKETS.md) | AI Patient Education Sheets by ICD-10 | 2 — High |

Suggested ordering: 095 first (data source for the Spiritual pillar), then 093 (visualization).
092 starts with the listed common cannabis conditions only. 098 needs the patient resilience
intake question. 110 reuses the existing ICD-10 set from EMR-101.

## Track 6 — Special Populations & Security

Pediatrics, age-gated overlays, and intense HIPAA security modules. Compliance-heavy.

| Ticket | Title | Priority |
|---|---|---|
| [EMR-082](TICKETS.md) | Electronic Medical Record Release Between Doctors | 2 — High |
| [EMR-083](TICKETS.md) | Pediatric Module | 2 — High |
| [EMR-084](TICKETS.md) | Military-Grade Encryption + Legal Licensing Framework | 1 — Urgent |
| [EMR-094](TICKETS.md) | Mental Health Chart Security Overlay | 1 — Urgent |
| [EMR-109](TICKETS.md) | Age-Based Chart Overlays | 2 — High |

Suggested ordering: 084 sets the encryption baseline everything else inherits. 094 layers
sensitivity tags on Note/Document — establishes the pattern. 109 generalizes 094's overlay
mechanism. 083 is one specific overlay (pediatric). 082 is the cross-provider record release
flow.

## Cross-track dependencies

- **Track 1 EMR-101** (full ICD-10 set) blocks **Track 5 EMR-110** (education sheets keyed
  to ICD-10) — but 110 can stub against the existing partial ICD-10 set.
- **Track 6 EMR-094** (sensitivity overlay) and **Track 6 EMR-109** (age overlay) share a
  Note/Document tagging mechanism — coordinate the schema change.
- **Track 4 EMR-091** (dispensary) and **Track 5 EMR-098** (AI coach SMS) both want Twilio
  — provision once.
- **Track 2 EMR-106** (FHIR closed loop) and **Track 2 EMR-090** (ADT feed) share the HL7
  ingest pipeline — sequence them.
- **Track 3 EMR-105** (philanthropy) feeds **Track 5 EMR-093** (Four Pillars → Spiritual).

## Acceptance gates

Before any ticket flips to `done`:

1. Build passes (`npm run build`).
2. Type check passes (`npm run typecheck` / `tsc --noEmit`).
3. New code is exercisable through a UI surface or an AgentJob — not just a library
   addition.
4. Audit trail in place for any sensitive read/write (per [AGENTS.md](AGENTS.md) rule 4).
5. Ticket entry in [TICKETS.md](TICKETS.md) updated: `Status: done`.

## Verification log

- 2026-04-27 — All 30 ticket statuses confirmed `in_progress` in [TICKETS.md](TICKETS.md)
  via `python3` parse of the file.

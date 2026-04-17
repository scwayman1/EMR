# PM Tickets — Mallik

This folder contains product tickets owned by Mallik, the PM for the Leafjourney / EMR platform. Tickets here are pre-Linear drafts — once they're reviewed and accepted, they get promoted into Linear with the same IDs.

## Ticket format

Each ticket is a single Markdown file under `tickets/` named `{id}-{slug}.md`:

- `id` is a short sequential ID (MALLIK-001, MALLIK-002…)
- `slug` is a kebab-case summary

Every ticket includes:

- **Title** — what + where
- **Reporter** — who flagged it (e.g., Dr. Patel, Mallik, Ops)
- **Status** — `draft` → `ready` → `shipped` (or `blocked` / `needs-info`)
- **User story** — "As a X, I want Y so that Z"
- **Scope** — explicit in/out
- **Acceptance criteria** — checklist that has to be true to call it done
- **Open questions** — anything blocking handoff to engineering

## Index

| ID          | Title                                                                | Reporter   | Status                  |
| ----------- | -------------------------------------------------------------------- | ---------- | ----------------------- |
| MALLIK-001  | Homepage — remove PLNT PWRD card, move POTENCY 710 to Partner Brands | Dr. Patel  | ready                   |
| MALLIK-002  | Clinician Portal — Schedule tab with full-page calendar              | Dr. Patel  | needs-info              |
| MALLIK-003  | Render deploy — remove Clerk from hot boot path                      | Mallik     | shipped                 |
| MALLIK-004  | Leaflet (After Visit Summary) print view truncates content           | User (QA)  | ready                   |
| **MALLIK-005**  | **EPIC: Physician Mission Control**                              | Dr. Patel  | **approved-to-plan**    |
| MALLIK-006  | Lab Review Queue with auto-compare + outreach drafting (Phase 1)     | Dr. Patel  | ready-to-build          |
| MALLIK-007  | Refill Queue with batch sign & send (Phase 1)                        | Dr. Patel  | ready-to-build          |
| MALLIK-008  | Document Review Queue — imaging, sleep, PT, prior auths (Phase 1)    | Dr. Patel  | ready-to-build          |
| MALLIK-009  | Message Triage upgrade on /clinic/messages (Phase 1)                 | Dr. Patel  | ready-to-build          |
| MALLIK-010  | Mission Control dashboard assembly on /clinic (Phase 1)              | Dr. Patel  | ready-to-build          |
| MALLIK-011  | Real lab feed integration (HL7 / FHIR / Quest / LabCorp)             | Dr. Patel  | backlog                 |
| MALLIK-012  | Surescripts e-prescribing integration (Phase 2)                      | Dr. Patel  | backlog                 |
| MALLIK-013  | Dashboard drag / resize / reorder modules (Phase 1.5 polish)         | Dr. Patel  | reserved                |

## Supporting documents

- `prds/mission-control.md` — full PRD for MALLIK-005
- `research/dr-patel-interview-1.md` — verbatim Dr. Patel interview (2026-04-17)
- `wireframes/dr-patel-mission-control-v1.md` — hand-drawn wireframe transcription

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

| ID          | Title                                                                | Reporter   | Status       |
| ----------- | -------------------------------------------------------------------- | ---------- | ------------ |
| MALLIK-001  | Homepage — remove PLNT PWRD card, move POTENCY 710 to Partner Brands | Dr. Patel  | ready        |
| MALLIK-002  | Clinician Portal — Schedule tab with full-page calendar              | Dr. Patel  | needs-info   |
| MALLIK-003  | Render deploy — remove Clerk from hot boot path                      | Mallik     | shipped      |
| MALLIK-004  | Leaflet (After Visit Summary) print view truncates content           | User (QA)  | ready        |

# Roadmap

Build is organized into thin vertical slices. Each slice is shippable — even the first one should run, authenticate, and render a coherent product.

## Phase 0 — Foundation (✅ this commit)

Goal: the system **exists** as a runnable codebase with a coherent architecture.

- [x] Foundation docs (PRD, ARCHITECTURE, AGENTS, WORKFLOWS, DESIGN_SYSTEM, ROADMAP)
- [x] Next.js 14 + TypeScript + Tailwind project scaffold
- [x] Prisma schema with the canonical data model
- [x] Auth + session + RBAC primitives
- [x] Design system primitives (Button, Card, Input, Badge, etc.)
- [x] App shell (SideNav + TopBar, role-aware)
- [x] Marketing / acquisition home
- [x] Patient portal dashboard + intake foundation
- [x] Clinician workspace scaffold (dashboard + patient chart shell)
- [x] Orchestration skeleton (AgentJob queue, workflow engine, agent registry)
- [x] Operator Mission Control scaffold
- [x] Render deployment config
- [x] README with local dev + deployment guide

## Phase 1 — Patient vertical

Goal: a patient can go from acquisition site → account → complete intake → upload documents → see outcomes.

- Signup / login polish + password reset stub
- Full intake flow (demographics, cannabis history, symptoms, goals, consents)
- Document upload + classification (Document Organizer Agent wired up)
- Baseline assessments (PHQ-9, GAD-7, pain scale)
- Outcome log UI + trend charts
- Secure messaging (patient ↔ care team)
- Care plan visibility

## Phase 2 — Clinician vertical

Goal: a clinician can open a chart, understand the patient in seconds, conduct a visit, draft a note with scribe assistance, and sign.

- Patient list + filters + search
- Chart summary (driven by Intake Agent output)
- Longitudinal timeline (documents, encounters, messages, outcomes)
- Visit workspace with pre-visit summary
- Note blocks editor + Scribe Agent draft flow (approval-gated)
- Treatment plan area
- Research side panel (Research Agent)

## Phase 3 — Orchestration & operations

Goal: the nervous system is fully operational and Mission Control gives real-time visibility.

- Agent worker service running on Render background worker
- Scheduler cron for outcome check-ins + follow-up reminders
- Mission Control job table with filters, approval queue, per-job timeline
- Practice launch flow (Practice Launch Agent)
- Operator dashboard metrics (intake funnel, message volume, overdue follow-ups)
- Full AuditLog surface

## Phase 4 — Research & coding

- Research corpus ingestion pipeline
- Semantic search backing the Research Agent
- Coding Readiness Agent producing ICD-10 / E&M metadata on finalized notes
- Registry / Qualification Agent with rule editor

## Phase 5 — Polish & hardening

- Full keyboard shortcut set in clinician workspace
- Mobile-native refinements for patient portal
- End-to-end tests for every critical flow
- HIPAA-readiness review + BAA'd vendors
- Performance pass: chart open < 200ms, dashboard < 150ms

## Post-V1

- Native iOS + Android apps
- Real telehealth video integration
- Real billing/coding submissions
- Outcomes data product (de-identified)
- Additional specialized agents

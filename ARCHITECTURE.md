# Architecture

**Project:** AI-Native Cannabis Care Platform
**Status:** V1 foundation — first vertical slice in place.

---

## 1. Architecture Summary

One unified Next.js 14 (App Router) application, rendered via React Server Components, with role-based route groups for Patient, Clinician, Operator, and Mission Control experiences. A typed Node/TypeScript backend lives alongside the frontend as server actions and API routes. Postgres (via Prisma) holds the canonical data model. A Postgres-backed job/workflow queue powers the orchestration layer, and a small fleet of specialized AI agents runs as typed workflow workers against that queue.

The guiding principle: **one platform, one data plane, many role-scoped surfaces**. No separate "portal" and "EMR" codebases — the same domain model, the same auth layer, the same orchestration harness, rendered behind different navigations.

### High-level diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         Next.js App (Render Web Service)          │
│                                                                    │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  (marketing) │  │  (patient)  │  │ (clinician) │  │(operator)│ │
│  │  acquisition │  │  portal     │  │ workspace   │  │ ops +    │ │
│  │              │  │             │  │             │  │ mission  │ │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘  └─────┬────┘ │
│         │                 │                │               │      │
│         └─────────────────┴────────────────┴───────────────┘      │
│                               │                                   │
│                    Server Actions / API Routes                    │
│                               │                                   │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Auth      │  │  RBAC      │  │  Domain      │  │ Orchest.  │ │
│  │  session   │  │  policies  │  │  services    │  │ harness   │ │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  └─────┬─────┘ │
│        └────────────────┴─────────────────┴──────────────┘       │
│                               │                                   │
│                         Prisma Client                            │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐        ┌──────────────┐
                     │   Postgres (Render) │◄──────►│ Agent Worker │
                     │                     │        │ (Render BG)  │
                     │ - domain tables     │        │              │
                     │ - audit_log         │        │  polls jobs, │
                     │ - agent_jobs queue  │        │  executes    │
                     │ - outbox events     │        │  workflows   │
                     └─────────────────────┘        └──────────────┘
```

### Runtime surfaces

| Surface          | Purpose                                                  | Hosted as                        |
| ---------------- | -------------------------------------------------------- | -------------------------------- |
| Web app          | All role-based UIs + server actions + API routes         | Render Web Service               |
| Agent worker     | Polls `agent_jobs`, runs workflows, writes results       | Render Background Worker         |
| Scheduled jobs   | Cron-style follow-up, reminders, assessment prompts      | Render Cron Job                  |
| Postgres         | Canonical store, queue, audit trail                      | Render Postgres                  |
| Object storage   | Patient document uploads (S3-compatible)                 | External (e.g. R2 / S3)          |

---

## 2. Tech Stack

| Concern              | Choice                                                  | Why                                                                 |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| Framework            | Next.js 14 (App Router, RSC)                            | One app, role-scoped route groups, streaming, great DX              |
| Language             | TypeScript (strict)                                     | Structured data is strategic — types enforce it                     |
| Styling              | Tailwind CSS + custom design tokens                     | Fast, calm, consistent; no drift                                    |
| UI primitives        | Hand-rolled primitives in `src/components/ui`           | Full control over the premium aesthetic; no vendor look             |
| Database             | Postgres 15                                             | Relational fits clinical data; JSONB where we need flex             |
| ORM                  | Prisma                                                  | Typed queries, migrations, clean model DX                           |
| Auth                 | Iron-session cookies + bcrypt                           | Simple, secure, no external dep; easy to evolve                     |
| Validation           | Zod                                                     | Single source of truth between forms and server                     |
| Orchestration        | Custom Postgres-backed queue + workflow registry        | No extra infra, observable, trivially portable                      |
| AI harness           | Model-agnostic agent interfaces in `src/lib/agents`     | Swap providers without touching workflow code                       |
| Deploy               | Render (web + worker + cron + postgres)                 | PRD-mandated; clean service separation                              |

Intentionally **not** chosen in V1: tRPC (server actions cover it), Redis (Postgres LISTEN/NOTIFY + `FOR UPDATE SKIP LOCKED` is enough), a component library (we want our own look), a workflow SaaS (lock-in risk, overkill).

---

## 3. Repository Layout

```
/
├── PRD.md                    # Full product requirements (source of truth)
├── ARCHITECTURE.md           # This file
├── AGENTS.md                 # Agent fleet spec
├── WORKFLOWS.md              # Orchestration workflows + event map
├── DESIGN_SYSTEM.md          # Tokens, patterns, components
├── ROADMAP.md                # Build phases + milestones
├── README.md                 # Local dev + deployment
├── render.yaml               # Render service definitions
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── prisma/
│   ├── schema.prisma         # Canonical data model
│   └── seed.ts               # Demo org + users + sample patient
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout + fonts
│   │   ├── globals.css       # Tokens + base styles
│   │   ├── page.tsx          # Marketing / acquisition home
│   │   ├── (auth)/           # login + signup
│   │   ├── (patient)/portal/ # Patient portal routes
│   │   ├── (clinician)/clinic/
│   │   ├── (operator)/ops/
│   │   └── api/              # Auth + job endpoints
│   ├── components/
│   │   ├── ui/               # Design system primitives
│   │   ├── shell/            # AppShell, SideNav, TopBar
│   │   ├── patient/          # Patient-specific composites
│   │   ├── clinician/        # Clinician composites
│   │   └── ops/              # Mission control composites
│   ├── lib/
│   │   ├── auth/             # session, password, getCurrentUser
│   │   ├── db/               # Prisma client singleton
│   │   ├── rbac/             # Roles + permission checks
│   │   ├── orchestration/    # Queue, workflow engine, registry
│   │   ├── agents/           # Agent implementations
│   │   ├── domain/           # Business logic (intake, notes, outcomes)
│   │   └── utils/            # cn(), dates, formatters
│   ├── server/
│   │   └── actions/          # Server actions per domain
│   └── workers/
│       └── agent-worker.ts   # Background worker entry point
```

---

## 4. Data Plane

Canonical entities (see `prisma/schema.prisma` for the full schema):

- **Organization** — a practice or clinic
- **User** — identity + credentials + role memberships
- **Membership** — `(user, organization, role)` join
- **Patient** — demographics + cannabis history + registry status
- **Provider** — clinician profile attached to a user
- **Encounter** — a visit (scheduled, in-progress, complete)
- **Note** — structured blocks + narrative + finalization state
- **Document** — uploaded file metadata + classification
- **Assessment** — form template (PHQ-9, GAD-7, custom)
- **AssessmentResponse** — per-patient submission with score
- **OutcomeLog** — time-series symptom/efficacy entries
- **MessageThread / Message** — secure messaging
- **Task** — human or agent-owned work item
- **AgentJob** — workflow queue row (status, payload, attempts, logs)
- **AuditLog** — immutable append-only trail
- **ResearchQuery / ResearchResult** — saved searches + cached summaries

Design rules:

1. Favor structured columns; fall back to typed JSONB only when the shape is genuinely open (e.g. note blocks, intake answers).
2. Every sensitive action writes an `AuditLog` row — no exceptions.
3. Every async operation goes through `AgentJob`, so there is one queue to observe, retry, and approve.
4. Soft-delete by default for patient-owned data; hard-delete only via admin tooling with approval.

---

## 5. Auth & RBAC

- **Session**: iron-session encrypted cookie, `httpOnly` + `secure` + `sameSite=lax`. Cookie payload = `{ userId, sessionId, iat }`. No PII in the cookie.
- **Password**: bcrypt (cost 12).
- **getCurrentUser()**: server-only helper — reads the cookie, loads the user + memberships, caches per-request with React `cache()`.
- **Roles (V1)**: `patient`, `clinician`, `operator`, `practice_owner`, `system`.
- **Policies**: plain TS functions in `src/lib/rbac/policies.ts` — `canViewPatient(user, patient)`, `canFinalizeNote(user, note)`, etc. Route group layouts gate access; server actions re-check.

Least-privilege is enforced in two places: the layout (redirects unauthorized roles) **and** every server action (throws). Never rely on UI-only gating.

---

## 6. Orchestration & Agent Harness

The orchestration layer is the nervous system. It is:

- **Event-driven**: domain code emits events (`patient.intake.submitted`, `encounter.completed`, `document.uploaded`). An event dispatcher enqueues one or more `AgentJob` rows based on workflow definitions.
- **Queue-backed**: `AgentJob` is the queue. Workers claim rows with `SELECT ... FOR UPDATE SKIP LOCKED`, run the agent, and write the result + logs back to the same row.
- **Observable**: every job has `status`, `attempts`, `lastError`, `logs[]`, `approvalRequiredAt`, `approvedBy`. Mission Control reads directly from these tables.
- **Approval-gated**: workflows can declare `requiresApproval: true` — the worker pauses the job at a `needs_approval` status until a human clicks through in Mission Control.
- **Pluggable agents**: each agent is a typed function `(input, ctx) => output`. Registering an agent is a one-liner in `src/lib/agents/index.ts`. Workflows reference agents by name.

See `WORKFLOWS.md` for the event map and `AGENTS.md` for the fleet.

### Job lifecycle

```
pending → claimed → running → (succeeded | failed | needs_approval)
                                            │
                                            └─ approved → running → succeeded
```

### Interaction modes

| Mode            | Example                              | Human in the loop?            |
| --------------- | ------------------------------------ | ----------------------------- |
| Assistive       | Scribe drafts a note                 | Yes — clinician edits + signs |
| Autonomous low  | Document classification, reminders   | Audit-only                    |
| Approval-gated  | Outbound patient message draft       | Explicit click-through        |

No agent writes a finalized clinical artifact without a human signature.

---

## 7. Deployment Topology (Render)

`render.yaml` defines four services:

1. **web** — Next.js app. Handles all UI + API routes + server actions.
2. **agent-worker** — Long-running Node process. Runs `src/workers/agent-worker.ts` to poll and execute `AgentJob` rows.
3. **scheduler** — Cron job that enqueues recurring work (outcome check-ins, follow-up reminders, assessment prompts).
4. **postgres** — Managed Postgres instance.

Environments: `development` (local Docker), `staging` (Render preview env), `production` (Render prod env). Secrets in Render env groups; never in the repo.

---

## 8. Security Posture (V1 baseline)

- TLS everywhere (Render default).
- Secrets in env vars only; `.env.example` lists required keys.
- RBAC checked in every server action + layout.
- `AuditLog` row for every read/write of sensitive data.
- PHI never logged to stdout in production; structured logger with field redaction.
- Object storage URLs are short-lived signed URLs, never public.
- This is **HIPAA-ready scaffolding**, not a HIPAA certification. Production launch requires a BAA with hosting + storage providers and a formal security review.

---

## 9. What's Deliberately Deferred

- Native mobile apps (web is mobile-first).
- Real video telehealth (scheduling + launch-to-external for V1).
- Real billing/coding submissions (coding-ready metadata scaffolded, no clearinghouse integration).
- Full-text/semantic research index (abstraction in place, backed by a stub for V1).
- Real payment/registry logic (data model present, workflows stubbed).

Each of these has an interface in place so it can be filled in without refactoring the core.

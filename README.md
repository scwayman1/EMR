# Cannabis Care Platform

An AI-native care platform for modern cannabis medicine. One unified Next.js 14 app with role-based experiences for patients, clinicians, and operators, a Postgres-backed data plane, and an event-driven agent orchestration layer.

> **Status:** V1 foundation. First vertical slice in place — auth, app shell, patient portal, clinician workspace, orchestration skeleton, initial agent fleet, mission control.

## What's here

- **PRD.md** — canonical product scope
- **ARCHITECTURE.md** — system architecture, tech stack, data plane, security posture
- **AGENTS.md** — agent fleet spec with contracts and boundaries
- **WORKFLOWS.md** — event map + workflow definitions + lifecycle
- **DESIGN_SYSTEM.md** — tokens, patterns, primitives, content voice
- **ROADMAP.md** — build phases and milestones

Read these before making major changes. They are the source of truth.

## Tech stack

- Next.js 14 (App Router, RSC, server actions)
- TypeScript (strict)
- Tailwind CSS + hand-rolled design system
- Prisma ORM + PostgreSQL
- Iron-session cookies + bcrypt auth
- Zod validation
- Postgres-backed job queue for orchestration
- Hosted on Render (web + worker + cron + postgres)

## Repository layout

```
src/
├── app/                # Next.js routes
│   ├── (auth)/         # login + signup
│   ├── (patient)/      # patient portal
│   ├── (clinician)/    # clinician workspace
│   ├── (operator)/     # ops + mission control
│   └── api/            # API routes (health, etc.)
├── components/
│   ├── ui/             # design system primitives
│   └── shell/          # app shell (SideNav, PageHeader)
├── lib/
│   ├── auth/           # session + password + server actions
│   ├── db/             # Prisma client
│   ├── rbac/           # roles + route guards
│   ├── orchestration/  # event dispatch + queue + runner
│   ├── agents/         # agent implementations
│   └── utils/          # cn, format helpers
└── workers/
    ├── agent-worker.ts # long-running agent worker
    └── scheduler.ts    # cron-dispatched scheduled workflows
prisma/
├── schema.prisma       # canonical data model
└── seed.ts             # demo org + users + patient
```

## Local development

### Prerequisites

- Node 20+
- A running Postgres instance (locally or via Docker)
- `npm` (or `pnpm`, `yarn`)

### Set up

```bash
# 1. Install deps
npm install

# 2. Copy env template and edit DATABASE_URL + SESSION_SECRET
cp .env.example .env

# 3. Push the Prisma schema and seed demo data
npm run db:push
npm run db:seed

# 4. Run the web app
npm run dev
```

The app is now at [http://localhost:3000](http://localhost:3000).

### Demo accounts (from seed)

| Role       | Email                   | Password       |
| ---------- | ----------------------- | -------------- |
| Patient    | `patient@demo.health`   | `password123`  |
| Clinician  | `clinician@demo.health` | `password123`  |
| Owner/ops  | `owner@demo.health`     | `password123`  |

### Running the agent worker

In a second terminal:

```bash
npm run worker
```

The worker polls the `AgentJob` queue every 2s in dev and executes claimed jobs. For most local development you don't strictly need it running — the patient intake and research flows also run the queue inline after dispatching so the results show up immediately. Once you add agents that take longer or need real model calls, use the worker.

### Useful scripts

| Script               | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Next.js dev server                                      |
| `npm run build`      | Production build                                        |
| `npm run start`      | Production server                                       |
| `npm run worker`     | Long-running agent worker                               |
| `npm run db:push`    | Apply schema without a migration (dev convenience)      |
| `npm run db:migrate` | Create + apply a Prisma migration                       |
| `npm run db:seed`    | Seed demo data                                          |
| `npm run db:studio`  | Open Prisma Studio                                      |
| `npm run typecheck`  | TypeScript check with no emit                           |
| `npm run lint`       | Next.js ESLint                                          |

## Architecture at a glance

One Next.js app handles all UI, API routes, and server actions. Role-based route groups (`(patient)`, `(clinician)`, `(operator)`) share the same app shell and design system. Every server action re-checks RBAC — UI gating alone is never trusted.

Domain code never calls agents directly. Instead, it `dispatch()`es a typed domain event. The workflow engine reads `src/lib/orchestration/workflows.ts`, figures out which steps should run, and enqueues one `AgentJob` row per step. The agent worker polls the queue, claims rows with `SELECT ... FOR UPDATE SKIP LOCKED`, runs the agent in a scoped context with an explicit capability list, and writes the result + logs back.

Approval-gated steps (Scribe, Messaging Assistant) land in `needs_approval` and wait for a human in Mission Control to accept or reject.

See `ARCHITECTURE.md` for the full picture.

## Deploying to Render

`render.yaml` defines the full topology:

- `emr-web` — the Next.js web service
- `emr-agent-worker` — the long-running agent worker
- `emr-scheduler` — a 15-minute cron job that enqueues recurring work
- `emr-postgres` — the managed Postgres instance

Deploy by pointing Render at this repo and letting it pick up `render.yaml`. `SESSION_SECRET` is auto-generated; `ANTHROPIC_API_KEY` is opt-in (the platform defaults to a stub model client).

## Security posture

- RBAC enforced in layouts **and** every server action
- `AuditLog` row on every sensitive action (including agent runs)
- PHI never logged to stdout in production
- Short-lived signed URLs for document storage (when wired)
- HIPAA-ready scaffolding — production launch requires a BAA with hosting + storage providers and a formal security review

## What's deliberately deferred

- Native mobile apps (web is mobile-first)
- Real video telehealth (scheduling is present; handoff is external)
- Real billing/coding submissions (metadata scaffolded, no clearinghouse)
- Semantic research index (stub corpus in place, interface holds)
- Real payment flows

## Contributing

The docs in the repo root are the source of truth. If you're adding an agent, edit `AGENTS.md`, then create a file in `src/lib/agents/`, register it in `src/lib/agents/index.ts`, and add a workflow in `src/lib/orchestration/workflows.ts`. That's it.

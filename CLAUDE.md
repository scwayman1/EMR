# Claude context — EMR (AI-Native Cannabis Care Platform)

This file is read on every Claude session. Keep it short and specific.
Anything Claude needs to know about **this codebase** or **the team**
that isn't obvious from the code belongs here.

## People

- **Dr. Patel** — founder. Sends product prompts via iMessage. Voice:
  stream-of-consciousness, multi-topic, often truncated mid-sentence.
  Prompts frequently span data model, UI, and workflow concerns in one
  paragraph. Do not treat truncation as an error; flag it as an open
  question and still decompose what's there.
- **Avery Hale** (owner@demo.health) — demo practice owner / operator in
  seed data. Used in screenshots and tests.
- **Dr. Lena Okafor** (clinician@demo.health) — demo clinician in seed
  data. MD, Integrative Oncology.
- **Maya Reyes** (patient@demo.health) — demo patient in seed data.

## Agents we've named

- **Mallik** — Product Manager Agent. Decomposes founder prompts into
  Linear-shaped cards. Lives at
  `src/lib/agents/product-manager-agent.ts`. Triggered by
  `founder.prompt.received`. Full contract in `AGENTS.md`.

Everything else in `src/lib/agents/` is a workflow worker with no
persona — just a job name (intake, scribe, scheduling, etc.).

## Prompt pipeline (founder → Linear)

```
Dr. Patel (iMessage)
  → ProductPrompt row created (raw text captured)
  → dispatch("founder.prompt.received")
  → Mallik's pm-decompose workflow enqueues an AgentJob
  → Mallik's run() calls decomposePrompt()
  → ProductPrompt row updated with { epicSlug, epicTitle, summary, cards[], openQuestions[] }
  → Human PM reviews at /ops/product-prompts and promotes cards to Linear
```

**Durable archive of raw prompts lives at `docs/product-prompts/`.**
One markdown file per prompt, numbered by author
(`patel-001-*.md`, `patel-002-*.md`, …). Keep the raw text verbatim —
typos, truncation, and all. Store Mallik's output alongside as
`<slug>.cards.md` so reviewers can see the decomposition without
running the system.

## Session conventions

- All development on `claude/<task>` branches. Never push to `main`.
- Do not create PRs unless the user explicitly asks.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`).
- Run `npx tsc --noEmit` before committing. Zero errors is the bar.
- Prisma schema changes require `prisma validate` to pass. Migrations
  are generated locally when a real `DATABASE_URL` is available; the
  sandbox dev environment here doesn't have one, so migrations are
  generated against a real DB at deploy time.

## Where things live

- `prisma/schema.prisma` — single source of truth for the data model.
- `src/app/(patient|clinician|operator)/…` — role-specific app shells.
  Nav items for `/ops` live in `src/app/(operator)/layout.tsx`.
- `src/lib/agents/` — one file per agent. Registered in `index.ts`.
- `src/lib/orchestration/` — workflows, events, dispatch, queue, runner.
- `src/lib/orchestration/workflows.ts` — the event→agent routing table.
- `src/components/shell/` — `PageShell`, `PageHeader`, `AppShell`.
- `src/components/ui/` — low-level primitives (Card, Badge, Button…).

## House style

- Server components by default; `"use server"` actions for mutations.
- No date library in V1. Use `src/lib/utils/format.ts` helpers.
- Every sensitive write goes through `writeAgentAudit` or a direct
  `prisma.auditLog.create`.
- Empty states via `<EmptyState />` — never blank cards.
- Enum values are snake_case in Prisma, rendered with
  `.replace("_", " ")` in the UI where needed.

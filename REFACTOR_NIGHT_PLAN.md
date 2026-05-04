# Tech Debt Strike — Night Shift Plan

> Run date: 2026-05-04 (overnight) → ready for morning standup.
> Branch: `claude/refactor-technical-debt-ZNMrS`
> Lead: Sr. Eng (ex-Google) directing 10 mid-level devs in parallel.
> Method: 10 read-only recon agents fanned out across the codebase tonight.
> This document is the synthesis. It is the morning briefing.

---

## 0. The bottom line

The platform is functional, but it is a fleet of half-finished things wearing the costume of a finished thing. The previous overnight passes (HARDENING_REPORT, BILLING_HARDENING_REPORT, OVERNIGHT_REPORT) made the agents and billing flows credible. They did not finish the supporting plane: auth has Clerk-migration debris, the data layer leaks tenancy through component-level Prisma imports, the AI surface has a public prompt-injection hole, three storefronts duplicate each other, ~5% test coverage, and ESLint is one rule.

We have **eight P0 items** that are real production risk. Everything else is normal big-codebase debt. We can land all eight P0s and the top quick wins in one day with 10 devs running in parallel — given the slot map below.

---

## 1. P0 hot list (land in the first 90 minutes tomorrow)

These are auth / cost / data-loss class issues. Land before anyone touches anything else. Owners are stable per-domain (see §6).

| # | Issue | File:line | Fix | Owner | Effort |
|---|-------|-----------|-----|-------|--------|
| P0-1 | `OPS_ALLOWED_IPS` middleware fails **OPEN** when env var unset | `src/middleware.ts:56-72` | `if (!allowedIpsStr) return new NextResponse(..., { status: 403 })` — fail closed | Dev 1 (Auth) | 10 min |
| P0-2 | `/api/cfo/generate` dev fallback returns `true` if `CRON_SECRET` unset | `src/app/api/cfo/generate/route.ts:29` | Flip to `return false`. Fail closed. | Dev 5 (API) | 1 min |
| P0-3 | `(researcher)` layout gates by operator allowlist, not researcher role → privilege escalation onto de-id research export | `src/app/(researcher)/layout.tsx:22-27` | Replace allowlist with `r === "researcher"`; add `requireRole("researcher")` defense-in-depth at every page under `/research-portal` | Dev 1 (Auth) | 30 min |
| P0-4 | ChatCB prompt injection — user input concatenated into system prompt with no fencing on a **public, no-auth** surface | `src/app/education/actions.ts:88` | Wrap user input in `<user_question>…</user_question>` markers; switch to role-based message structure if model client supports it; reject inputs >2 KB | Dev 9 (AI) | 45 min |
| P0-5 | `/api/cindy` and `/api/agents/pharmacology` — public, unauthed, unbounded LLM calls — direct cost-attack vector | `src/app/api/cindy/route.ts`, `src/app/api/agents/pharmacology/route.ts` | Per-IP token bucket (in-memory, then Redis later); cap input length; cap `maxTokens`; emit `cost_attack_suspected` log on burst | Dev 9 (AI) + Dev 5 (API) | 1 h |
| P0-6 | `clinic-onboarding/store.ts` is `new Map()` — every onboarding submission is **lost on every deploy** | `src/lib/clinic-onboarding/store.ts:3-17` | Add `ClinicOnboardingSubmission` model to Prisma; replace Map with prisma calls; backfill is N/A (data was already gone) | Dev 8 (Domain libs) | 3 h |
| P0-7 | Mission-control approve/reject server actions missing role gate — any logged-in user can approve agent jobs | `src/app/(operator)/ops/mission-control/actions.ts:8-38` | `if (!user.roles.includes("operator")) return { ok:false, error:"forbidden" }` at top of both | Dev 6 (Server actions) | 15 min |
| P0-8 | Researcher de-id export uses `PORTAL_SALT` hardcoded in plaintext page source — blocks HIPAA claim on EMR-123 | `src/app/(researcher)/research-portal/page.tsx:29` | Generate per-cohort ephemeral salt server-side; store in cohort manifest; never serialize to client; gate render on it | Dev 4 (Operator/Researcher) | 2 h |

**Definition of P0 done:** PR landed, CI green, manual smoke that the fix path exits with the correct status code / behavior. P0-1, P0-2, P0-3, P0-7 should be in by 09:30. P0-4 by 10:00. P0-5, P0-6, P0-8 by 12:00.

---

## 2. P1 hit list (afternoon, parallelizable)

These are real correctness or operational issues but no acute breach risk.

### Auth + Webhooks
- AuditLog write on Clerk webhook signature failure — `src/app/api/webhooks/clerk/route.ts:22-45`. (5 min)
- Clerk inline user provisioning race in `clerk-session.ts:52-103` → switch to upsert + retry on unique-violation. (30 min)
- Confirm or document Payabli webhook signature header — `src/app/api/webhooks/payabli/route.ts:26-51` is a TODO. Add fixture test. (30 min)
- Stale `/security` page copy still claims "Bcrypt-hashed passwords, iron-session cookies" — `src/app/security/page.tsx:122`. (5 min)
- Delete `/api/leafmart/signout` (dead post-Clerk). (5 min)
- Replace `/login` and `/signup` redirects with `/sign-in` and `/sign-up` across patient pages. (15 min)

### Data layer
- Add missing FK indexes: `OrderItem(variantId)`, `Product(organizationId, status)`, `AgentJob(approvedById, status)`. Single migration. (`prisma/schema.prisma` lines 2380, 2072, 1607). (30 min + migration)
- Make `AuditLog.organizationId` NOT NULL (with backfill from actor's org); enforce at write boundary. (`schema.prisma:1616`) (M, 2 h with backfill SQL)
- Soft-delete columns + indexes on `Encounter`, `Claim`, `Charge`, `Payment`. Update domain queries. (M, 2 h)
- Replace direct `prisma` imports inside `src/components/**` and `src/app/(clinician)/clinic/morning-brief/page.tsx:126` with calls into a `src/lib/queries/` layer. (~8 files. M, 3 h)
- Pre-visit-intelligence-agent: add `select:` to the 4 `findMany` calls on lines 255, 286, 310, 315. (S, 30 min)
- Orchestration queue: wrap advisory-lock raw SQL with retry + backoff. (`src/lib/orchestration/queue.ts:13`) (S, 45 min)
- Zod schemas for top 5 untyped Json columns: `Organization.billingAddress`, `ClaimScrubResult.edits`, `EligibilitySnapshot.rawResponse`, `AgentJob.input`, `AgentJob.output`. New `src/lib/zod/` directory. (M, 3 h)

### Server actions / API routes
- Standardize return envelope to `{ ok: boolean; error?: string; data?: T }`. Sweep 63 server actions; the outlier is `encounterActions.confirmEncounter` (`success`-shaped). (M, 2 h)
- Standardize API error envelope (4 different shapes today): `{ error: string; detail?: string; issues?: ZodIssue[] }`. Sweep ~20 routes. (M, 2 h)
- Add audit logs to: `schedule/actions.ts:60-63 rescheduleAppointmentAction`, `observationActions.ts:62-71 acknowledgeObservation`, `broadcasts/actions.ts createCampaignAction`. (S, 45 min)
- Add idempotency key to `createCampaignAction` (hash of audience+template; check `OutreachCampaign.reference`). (S, 30 min)
- `loadPayerRulesForOrg()` add `requireUser()` + org scope. (`src/app/(operator)/ops/billing/payer-rules/actions.ts:111`) (S, 20 min)
- Fix age-gate ordering bug: `/api/marketplace/age-gate/confirm/route.ts:14-51` parses formData before auth; reverse. Then actually persist `ageVerifiedAt` on the user/session so the cart fast-path works. (M, 2 h)

### Routes / UI
- Add `error.tsx` + `loading.tsx` to: `(clinician)/clinic/research`, `library`, `dispensaries`, `communications`, `morning-brief`, `notes/ai-assist`; `(patient)/portal/garden`, `fitness`, `log-dose`. Reuse the existing skeleton + retry pattern. (M, 2 h)
- Add `error.tsx` to marketing pages: `about`, `pricing`, `security`, `licensing`, `status`, `advocacy`, `education`, `developer`, and `share/[token]`. (S, 45 min)
- Per-page `requireUser()` + org-match for `/clinic/patients/[id]/page.tsx`, `/billing/page.tsx`, `/superbill/page.tsx`. Defense-in-depth even though layout already gates. (S, 30 min)
- Migrate the 9 inline `StatCard` definitions (denials, era, lockbox, billing-agents, performance, schedule, scrub, nsf, prior-auth) to the shared `src/components/ui/stat-card.tsx`. (S, 1 h)

### AI / Agents / ChatCB
- Wire the missing **Drug Mix** education tab; the component (`DrugMixTab`) exists but is not in `EDUCATION_TABS`. Reorder tabs to spec order (ChatCB / Wheel / Drug Mix / Research / Learn). (`src/components/education/EducationTabs.tsx:9-14`) (S, 30 min)
- "Community" tab in Education is mislabeled — spec calls it "Learn". Rename, point at educational content (migrate `/learn` page contents in if not already done). (M, 1.5 h)
- Worker robustness pass: validate `maxAttempts > 0` at enqueue; mark agent-not-found jobs as `failed_terminal` (no retry); add a `dead_letter` status + a basic `/ops/dead-letter` view. (`src/lib/orchestration/queue.ts`, `src/workers/agent-worker.ts`) (M, 3 h)
- Model client: add `AbortSignal.timeout(30_000)` on the fetch; surface a per-org daily token budget read from env or org settings; emit logger metrics on every call (`tokens_in`, `tokens_out`, `model`, `cost_estimate`). (`src/lib/orchestration/model-client.ts`) (M, 2 h)
- PubMed citation service: in-memory LRU cache (60s TTL) + 429/503 backoff metric. (`src/lib/agents/research/pubmed-citation-service.ts:62`) (S, 45 min)
- Validate model-cited PMIDs with a regex before rendering as links in ChatCB results. (S, 20 min)

### Domain libs
- Inject a clock (`now?: () => Date`) into the 8 functions that call `new Date()` directly: `clinical/uspstf-screenings.ts`, `clinical/admission-notify.ts`, `clinical/ai-notes.ts`, `clinical/smart-referral.ts`, `clinical/result-signoff.ts`, `finance/balance-sheet.ts`, `finance/period.ts`, `community/volunteer.ts`. Backfill unit tests for at least USPSTF + period.ts. (M, 3 h)
- Extract pure accounting layer in `src/lib/finance/ledger.ts`; thin `balance-sheet.ts` / `cash-flow.ts` / `pnl.ts` to fetch → call pure → format. (L, 5 h)
- Consolidate drug-class detection: `prescribing/multi-rx.DRUG_CLASSES` and `clinical/allergy-profile.FAMILY_KEYWORDS` → single canonical `src/lib/domain/medication-families.ts`. (M, 2 h)
- Consolidate severity ranks (`multi-rx` vs `contraindication-check`) into shared util. (S, 45 min)

### Components
- Delete 8 confirmed-unused UI primitives (or document intent): `HeartPulse`, `cannabis-use-type-badge`, `cannabis-icons`, `attestation-signature`, `cpt-picker` (179 LOC), `simplified-text` (177 LOC), `separator`, `celebration` (151 LOC). One PR. (S, 30 min)
- Tailwind token expansion: replace `text-[color:var(--warning)]` etc with `text-warning`, `text-info`, `text-highlight`. Add named tokens to `tailwind.config.ts`. ~50 first-pass call sites. (M, 2 h)
- `src/components/ui/health-plant.tsx` (793 LOC): split into PlantRoot/Stem/Leaves/Flower; `health-plant.tsx` becomes the composer. (M, 4 h)
- `src/app/(clinician)/clinic/patients/[id]/page.tsx` (2043 LOC): extract `CDSPanel`, `CorrespondenceTab`, `MemoryTab`, `ChartTabs` into separate async components with their own Suspense + error boundaries. **This is the single highest-leverage refactor in the codebase.** (L, 1 day; start scaffolding tomorrow but allow 2-3 PRs)

### Tooling / CI / Observability
- Add `npm run test` step to `.github/workflows/ci.yml`. (S, 10 min)
- Promote ESLint config: add `@typescript-eslint/no-floating-promises`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `no-restricted-syntax` (block raw `as any` in new code). May fail the lint step temporarily; run baseline + fix in one pass. (M, 3 h baseline + 1 h fixes)
- Boot-time env validation: `src/lib/env.ts` with Zod; called from `src/lib/db/prisma.ts` import. Cover the 41 referenced vars; align `.env.example` to match. Render deploy fails fast on missing secret. (M, 2 h)
- Replace `console.*` with `pino` logger in: `(clinician)/clinic/approvals/actions.ts:7`, `(patient)/portal/page.tsx:1`, `marketplace/event-recorder.ts:2`. Add an ESLint rule `no-console` once these are clean. (M, 1.5 h)
- Add `npm audit --omit=dev --production` and a basic secret-grep step to CI. (S, 30 min)

---

## 3. P2 backlog (file as tickets, do later)

These are real but not urgent. Cut tickets, keep moving.

- **70 `as any` in `src/lib/orchestration/workflows.ts`** — root-cause is dynamic LLM output. Track with a tighter agent I/O typing initiative; do not whack-a-mole.
- **42 of 49 domain-lib files have zero tests.** Multi-sprint problem. Quick win: add tests next to every fix landed in P1.
- **Three storefronts (`marketplace`, `leafmart`, `store`) duplicate filter/sort logic.** Consolidate behind `src/lib/commerce/product-service.ts` with `scope: "affiliate" | "retail" | "b2b"`. Multi-week.
- **54 of 139 agents are stub v0.x** (Commerce 20, Research 10, Pharmacology 12). Triage list, one PR per agent. Different sprint.
- **Outcome capture violates Dr. Patel emoji-first directive** (CLAUDE.md): `portal/outcomes/new` is numeric only. Add the 5-emoji row. (Quick, but coordinate with design.)
- **God components 600-1000 LOC** in scheduling, education, imaging, command. Each one is a multi-PR refactor. Triage tickets per file.
- **`src/lib/codex` and `src/server/marketplace`** (only 246 LOC across all of `src/server/`) — half-built abstractions. Either commit to them or delete.
- **Hardcoded `TAX_RATE` in `leafmart/checkout/page.tsx:11`** — must call `/api/marketplace/tax/calculate` before payment step. Already cut as ticket EMR-247-followup; reconfirm.
- **Migrate `/login` and `/signup` legacy redirects** out of marketing pages, vendor portal copy, etc.
- **Cron protection upgrade**: from shared header to HMAC, or move to Render-internal cron.
- **Vendor portal session validation middleware** (`src/app/vendor-portal/middleware.ts`).
- **Centralized feature flags** (`src/lib/flags.ts`) — replace 19 scattered `// EMR-XXX:` comments.

---

## 4. Cross-cutting themes (set the rules tomorrow)

These are the patterns the whole team should converge on. Pick the rule, write the doc, lint for it.

1. **One auth-check helper at the top of every server action and API route.** Today there are three (`requireUser`, `getCurrentUser`, manual headers). Pick `requireUser` (throws 401), document it, codemod the rest.
2. **One return-envelope shape: `{ ok: boolean; error?: string; data?: T }`.** Server actions and API routes. Add an ESLint rule once the sweep is done.
3. **No `prisma` imports outside `src/lib/queries/**`, `src/lib/agents/**`, `src/lib/orchestration/**`, and `src/app/api/**` route handlers.** Add a `no-restricted-imports` ESLint rule. Forces tenancy-scoped queries through a known surface.
4. **No `new Date()` in pure domain functions.** Always inject `now?: () => Date`. Tests freeze the clock.
5. **Audit-log every mutation on clinical or financial data.** Domain layer wrapper that requires an `actor` and writes the log; mutations call through it.
6. **Zod every Json column at the write boundary.** Schemas live in `src/lib/zod/`. Agents and server actions both consume them.
7. **Every page with data-fetching has `loading.tsx` + `error.tsx`.** Skeleton + retry. No exceptions.
8. **No `console.*` in `src/`.** Use `pino`. Lint rule once we're at zero.
9. **Public surfaces have rate-limits + input-length caps.** ChatCB, Cindy, pharmacology, share, whisper. No exceptions.
10. **No magic colors or arbitrary `[Npx]` Tailwind values in components.** Tokens or named utilities. Lint rule planned.

---

## 5. Sequencing — do this first to unblock the rest

There are dependencies. If we do them in this order, no one is stuck.

**Block A — Land before 09:30 (P0 safety):**
- Dev 1: middleware fail-closed; researcher role gate; webhook AuditLog
- Dev 5: cfo dev-fallback flip
- Dev 6: mission-control role gate; payer-rules auth
- Dev 9: ChatCB prompt-injection fence

**Block B — Land before 12:00 (P0 cost + data):**
- Dev 5 + Dev 9: rate-limit on Cindy + pharmacology
- Dev 8: clinic-onboarding Prisma migration
- Dev 4: PORTAL_SALT server-side rotation

**Block C — Foundations the rest will build on (12:00 → 16:00):**
- Dev 2: FK index migration; Zod for top 5 Json columns
- Dev 10: env validation at boot; CI test step
- Dev 7: delete dead UI; named Tailwind tokens
- Dev 6: standardize return envelope
- Dev 5: standardize API error envelope

**Block D — Refactor surface area (16:00 → end of day):**
- Dev 3: extract CDSPanel/CorrespondenceTab/MemoryTab from clinic chart god component (start; expect 2-3 days)
- Dev 4: complete error-boundary rollout to remaining ops dashboards + adopt shared `StatCard`
- Dev 7: token bypass sweep
- Dev 8: clock injection; finance pure-layer extraction
- Dev 9: worker robustness (DLQ, agent-not-found terminal); model-client timeout + budget
- Dev 10: ESLint rule expansion + baseline fix sweep

**Sync points:** 09:30 standup (P0 review). 12:00 sync (Block B done?). 16:00 sync (foundations done?). 18:00 wrap.

---

## 6. The 10 mid-level devs — assignments

Stable owners per domain. PR template: title prefixed with the domain id (e.g. `[auth] fail-closed middleware`).

| # | Dev | Domain | Primary files | First PR (morning) | Stretch (afternoon) |
|---|-----|--------|---------------|--------------------|---------------------|
| 1 | Auth & RBAC | `src/middleware.ts`, `src/lib/auth/**`, route-group layouts, webhooks | P0-1 fail-closed, P0-3 researcher role, webhook audit logging | clerk-session race fix, /security copy, kill `/login` redirects |
| 2 | Data Layer | `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/queries/` (new) | FK index migration; AuditLog NOT NULL | Soft-delete on billing models; Zod for Json columns |
| 3 | Clinician + Patient routes | `src/app/(clinician)/**`, `src/app/(patient)/**` | error.tsx + loading.tsx for the 9 missing routes; per-page `requireUser` | Begin clinic-chart god-component split (CDSPanel first) |
| 4 | Operator + Marketplace + Researcher | `src/app/(operator)/**`, `marketplace`, `leafmart`, `store`, `vendor-portal`, `(researcher)` | P0-8 PORTAL_SALT server-side; StatCard adoption sweep | Complete error-boundary rollout (36 ops dashboards); age-gate persist + ordering fix |
| 5 | API routes | `src/app/api/**` | P0-2 cfo flip; standardize error envelope | Confirm Payabli sig; rate-limit endpoints; document `/api/health` |
| 6 | Server actions | `src/app/**/actions.ts`, `src/app/actions/**` | P0-7 mission-control role gate; payer-rules auth | Standardize `{ok}` envelope; idempotency on broadcasts; missing audit logs |
| 7 | Components / Design system | `src/components/**`, `tailwind.config.ts`, `globals.css` | Delete 8 dead components; named Tailwind tokens | Token bypass sweep (top 50); start `health-plant.tsx` split |
| 8 | Domain libs (clinical / billing / finance) | `src/lib/clinical/**`, `src/lib/prescribing/**`, `src/lib/finance/**`, `src/lib/clinic-onboarding/**` | P0-6 clinic-onboarding to Prisma; consolidate drug classes | Clock injection; finance pure-layer extraction; tests for the consolidated families |
| 9 | AI / Agents / ChatCB | `src/lib/ai/**`, `src/lib/agents/**`, `src/lib/orchestration/**`, `src/lib/education/**`, `src/app/education/**`, `src/workers/agent-worker.ts` | P0-4 ChatCB injection fence; P0-5 rate-limit (with Dev 5) | Wire Drug Mix tab; PubMed cache; worker DLQ + agent-not-found terminal |
| 10 | Tooling / Test / CI / Observability | `package.json`, `tsconfig.json`, `.eslintrc.json`, `.github/workflows/**`, `vitest.config.mts`, `src/lib/env.ts` (new), `src/lib/logger.ts` | Add `npm run test` to CI; boot-time env validation | ESLint rule expansion + baseline fix; replace 3 highest-risk console.* with pino |

---

## 7. Definition of Done (per PR, no exceptions)

Anything merging tomorrow must:

1. Have a clear title with domain prefix and a 1-2 line PR description that names the file/issue it fixes.
2. Pass `npm run typecheck` and `npm run lint`.
3. Pass `npm run test` (so add the CI step **first**, see Dev 10).
4. Include a unit test for any pure function it adds or significantly changes.
5. For server-action / API-route changes: include the auth-check + Zod validation + return-envelope conformance.
6. For clinical / financial mutations: include an `AuditLog` write.
7. For schema changes: a migration file, no NOT NULL adds without a default on populated tables, no `db push` shortcuts.
8. For component changes: respect Tailwind tokens; no new `[Npx]` arbitrary values without a token-extension justification in the PR body.
9. Reference any related EMR-XXX ticket in the PR body, even if newly created.
10. No `as any`. If you have to, comment why and tag it `// TODO(EMR-XXX): tighten typing`.

---

## 8. Risks I'm watching

1. **The clinic-chart god component (2043 LOC) refactor is the riskiest single change.** It touches the most clinically critical surface. Dev 3 should land it as a series of small PRs, each behind an existing UI tab boundary. No one-shot refactor. Smoke against the demo patient set after each step.
2. **AuditLog NOT NULL backfill needs care.** Some system rows may legitimately lack an org. Plan the backfill SQL: assign system rows to a `system` org pseudo-row or keep one column nullable but make a stricter `AuditLogScoped` view for app code.
3. **Standardizing return envelopes is a large diff that breaks every consumer.** Codemod, not hand-edit. Land in one PR per domain (server-actions vs API), gate behind CI typecheck.
4. **The Clerk migration left more debris than commits suggest.** Expect to find more `iron-session` references than the audit caught. Add a `no-restricted-imports` rule for `iron-session` once vendor-portal use is documented as the only sanctioned site.
5. **Public LLM rate-limiting in-memory does not survive multi-instance Render scale-out.** Fine for now; log a follow-up to move to Postgres-backed token bucket or upstash/Redis when Phase-2 scaling lands.
6. **Test coverage push must not become test-theater.** Tests for pure functions only this sprint; no flaky integration tests against Prisma in CI.

---

## 9. What I am NOT doing tonight

- Writing a single line of refactor code. The team writes the code in the morning. Tonight is recon and plan.
- Touching `main`. Everything goes through `claude/refactor-technical-debt-ZNMrS` and child branches per dev.
- Filing tickets in Linear/GitHub Issues. The team can do that with a simple `gh issue create` script after standup; I'd rather their hands be on code.
- Re-doing what HARDENING_REPORT and BILLING_HARDENING_REPORT already covered. The agents and billing logic are credible; this plan is the rest of the platform catching up.

---

## 10. Morning standup script (read at 09:00)

> "We have eight P0s. They are auth, cost, and data-loss class. Owners are on the board. Everyone, your first PR is your P0 if you have one — Devs 1, 4, 5, 6, 8, 9 — and your first PR is the foundations the rest of us need otherwise — Devs 2, 3, 7, 10. We sync at 09:30, 12:00, and 16:00. PR template is in the plan doc. Definition of done is non-negotiable. We're not adding features today. We're not redesigning anything today. We are paying down debt and locking the platform's edges. Questions?"

---

*Prepared overnight 2026-05-04 by the Sr. Eng directing the strike team. Ready for 09:00 standup.*

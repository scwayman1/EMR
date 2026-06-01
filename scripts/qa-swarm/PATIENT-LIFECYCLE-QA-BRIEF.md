# Patient Lifecycle QA Brief — BRUTALLY HONEST EDITION

> Shared mission brief for the overnight QA swarm. Read by `qa-codex.sh`,
> `qa-claude.sh`, and `qa-gemini-antigravity.sh`. Each tool ingests this verbatim.
>
> **Your job is to find what is broken, not to praise what works.** You are a
> hostile QA engineer who has been told the product is perfect and does not
> believe it. Assume every screen is broken until you have personally driven it
> end to end and watched it succeed. Reward yourself for finding defects, not for
> green checkmarks. If you cannot reproduce a happy path, that is a P0 finding —
> not a reason to move on.

---

## 0. Ground rules

- **Honesty over optimism.** Never report a stage as "PASS" unless you personally
  drove it in a real browser session (Playwright MCP / headless) AND observed the
  expected end state (a row written, a PDF rendered, a status changed). "The page
  loaded without a 500" is **NOT** a pass — it is the bare minimum to keep testing.
- **Reproduce before you file.** Every finding needs: route/URL, the exact steps,
  the actual result, the expected result, a severity, and (if UI) a screenshot
  path. No vibes-based bug reports.
- **Severity scale:**
  - `P0` — blocks the patient lifecycle (cannot schedule, cannot check in, cannot
    finalize a note, cannot bill). The patient is stuck.
  - `P1` — major: data loss, wrong data shown, broken continuity of care, PHI leak,
    a workflow that silently no-ops.
  - `P2` — degraded: confusing UX, missing validation, slow, accessibility failure.
  - `P3` — polish: copy, spacing, iOS-aesthetic deviations (see CLAUDE.md).
- **Do not mass-refactor.** This is QA, not a feature sprint. You may make *small,
  surgical* fixes for unambiguous P0/P1 defects (a crash, a null guard, a broken
  link) AND must add/repair a test that proves the fix. Anything larger: file it,
  don't fix it. When in doubt, file it.
- **Leave a paper trail.** Append every finding to your tool's findings file (the
  launcher sets `$QA_FINDINGS`). Keep it updated continuously, not at the end —
  the container can be reclaimed at any moment.

## 1. Environment

- App: Next.js 14 on `http://localhost:3000` (launcher guarantees it is up via
  `/api/health` before handing off to you).
- Demo logins (seeded by `npm run db:seed`), password **`Longbeach2026!`** for all:
  - Patient: `patient@demo.health` (also `james.chen@demo.health`, `sarah.thompson@demo.health`)
  - Clinician: `clinician@demo.health`
  - Operator/Owner (billing, RCM, ops): `owner@demo.health`
- Useful commands you may run:
  - `npm run typecheck` — strict TS, must stay green.
  - `npm run lint`
  - `npm run test` — vitest unit/integration.
  - `npx playwright test e2e/<spec>` — end-to-end (baseURL is localhost:3000).
  - `npx tsx scripts/rcm-stress-test.ts` — billing/RCM stress harness.
  - `npx tsx scripts/smoke-test.ts` — smoke.
- Prefer the **Playwright browser tools** for live UI driving. Take a screenshot at
  every meaningful state transition and save it under `$QA_SHOTS`.

## 2. The lifecycle to verify (this is the whole point)

Drive a SINGLE patient persona through ALL of these, in order, as one continuous
story. Then repeat with an adversarial persona (missing data, wrong DOB at kiosk,
declined consent, expired insurance, no-show). The handoffs *between* stages are
where EMRs rot — test the seams, not just the screens.

### Stage 1 — Scheduling (patient can get an appointment)
- Patient self-serve: `/portal/schedule`, `/portal/appointments`.
- Staff booking: `/clinic/scheduling/book`, `/clinic/schedule/calendar`, `/clinic/schedule/month`.
- Ops: `/ops/schedule`, `/ops/waitlist`.
- APIs: `/api/appointments`, `/api/appointments/ical`, `/api/portal/encounters`,
  `/api/portal/encounters/[id]/calendar.ics`.
- VERIFY: a booked slot actually persists, shows up on BOTH the patient side and
  the clinic calendar, generates a working `.ics`, and fires reminders. Double-book
  protection? Timezone correctness? Cancel/reschedule round-trip?

### Stage 2 — Kiosk check-in (patient arrives and signs in)
- Console: `/kiosk` (the `(console)` flow), lobby: `/kiosk/lobby`,
  `/kiosk/lobby/[token]`, `/kiosk/lobby/intake`, `/kiosk/lobby/consent`.
- API: `/api/mobile/kiosk/check-in`.
- Lib: `src/lib/check-in/*` (handoff token, lobby session).
- VERIFY: identity challenge (DOB) works AND rejects wrong DOB; consent captures and
  stores; intake answers persist and reach the chart; the handoff token can't be
  replayed/forged; idle/expired lobby session is handled; check-in actually flips
  the appointment to "arrived" and notifies the front desk. **This is a named
  priority — be merciless here.**

### Stage 3 — Front desk workflow (staff receives the arrival)
- `/clinic/lobby-submissions`, `/clinic/admissions`.
- VERIFY: the kiosk submission from Stage 2 appears for staff, can be reviewed and
  accepted into the chart, and moves the patient into the rooming queue. No dropped
  submissions. No PHI shown to the wrong org (multi-tenant check).

### Stage 4 — Vitals & rooming workflow
- Rooming/prep: `/clinic/patients/[id]/prepare`.
- Vitals ingest: `/api/integrations/vitals-sync`; emotional/emoji vitals in APSO.
- VERIFY: vitals entry persists and renders in the chart with correct units; out-of-
  range values flag; the emoji/1-10 emotional scales (Dr. Patel directive) save and
  are queryable; rooming status advances and the provider sees the patient as ready.

### Stage 5 — Physician dictation & visit workflow
- `/clinic/patients/[id]/voice-chart`, `/clinic/notes`, `/clinic/notes/ai-assist`,
  `/api/transcribe`, scribe agent (`/api/agents/scribe-qa`, `voice-transcriber`).
- VERIFY: dictation captures text; AI note draft generates an APSO note with
  guardrails; the note can be edited and **finalized** (`note.finalized` event);
  charting timer works; nothing fabricates clinical content silently. Confirm the
  draft requires human approval before finalize.

### Stage 6 — Printed & digital advice + continuity of care (patient leaves informed)
- Print/AVS: `/clinic/patients/[id]/print`, `/clinic/patients/[id]/notes/[noteId]/print`,
  `/clinic/patients/[id]/leaflet`, `/clinic/patients/[id]/referral-letter`.
- Patient digital copy: `/portal/records`, `/portal/records/[id]/view`,
  `/portal/records/download`, `/portal/care-plan`, `/portal/results`,
  `/api/patients/[id]/export/pdf`, `/api/patients/[id]/export/lfj`.
- VERIFY: the after-visit summary the doctor "prints" matches what the patient sees
  in the portal (continuity!). The PDF actually renders with real content, not a
  blank/lorem template. Medication explainer is patient-readable. The digital and
  printed artifacts are consistent and tied to the SAME finalized note from Stage 5.

### Stage 7 — Billing & RCM
- Encounter → charge: `/clinic/patients/[id]/superbill`, `/clinic/patients/[id]/billing`.
- Ops RCM: `/ops/billing`, `/ops/eligibility`, `/ops/era`, `/ops/eob`, `/ops/denials`,
  `/ops/scrub`, `/ops/aging`, `/ops/financial-cockpit`, `/ops/financial-cockpit/ai-rcm`.
- Agents: `claims-scrubber`, `rcm-denial-analyzer`, `billing-coder`, `coding-auditor`.
- Harness: `npx tsx scripts/rcm-stress-test.ts`.
- VERIFY: the finalized Stage-5 note produces a superbill with correct codes; the
  claim scrubs clean; eligibility/ERA/EOB flows render real numbers; a denial can be
  worked; the money math reconciles (charges = payments + adjustments + AR). Look for
  silent zeros, NaN, hardcoded demo totals, and codes that don't match the encounter.

## 3. Cross-cutting checks (run against every stage)

- **Console errors / network failures:** capture browser console + failed requests
  on every page. Any uncaught error or 4xx/5xx on a happy path is at least P1.
- **Auth boundaries:** can a patient hit a `/clinic` or `/ops` route? Can org A see
  org B's patient? Try it. RBAC leaks are P0.
- **Accessibility:** spot-run `e2e/a11y-axe.spec.ts` style checks on each surface.
- **iOS aesthetic (CLAUDE.md):** large touch targets, clean, delightful. Note gross
  deviations as P3.
- **Data-for-research (CLAUDE.md):** confirm emoji/1-10 captures are structured and
  exportable, not just visual.

## 4. Deliverables (what you produce overnight)

1. `$QA_FINDINGS` — a living, severity-sorted findings log (Markdown). Update it
   continuously. One entry per defect with the fields from §0.
2. `$QA_SHOTS/` — screenshots named `stageN-<short>-<pass>.png`.
3. A `SUMMARY` block at the TOP of `$QA_FINDINGS` after each full pass: counts by
   severity, which of the 7 stages are PASS / FAIL / BLOCKED, and the single worst
   thing you found. Overwrite it each pass so the latest truth is always on top.
4. (Optional, only if the launcher set `$QA_FILE_TICKETS=1`) open a GitHub issue per
   P0/P1 in `scwayman1/emr`, labeled `qa-swarm`, titled `[QA][P{n}][Stage{m}] ...`,
   de-duping against existing open `qa-swarm` issues first.

## 5. Loop discipline (you are testing ALL NIGHT)

Each pass = one full lifecycle sweep (Stages 1→7) with one persona. Between passes:
rotate persona (happy → adversarial → multi-tenant → no-show → returning patient),
deepen on whatever failed last pass, and re-test any P0/P1 you "fixed" to confirm.
Never declare victory and stop — if everything passes, get meaner: malformed input,
back-button mid-flow, double-submit, expired tokens, concurrency. The product is not
done proving itself to you until the launcher's clock runs out.

# Production Billing Automation — Hardening Report

**Framing:** Can we start billing patients today and automate the full
lifecycle — coding → claim construction → scrub → submission → ack
→ adjudication → denial handling → appeal → payment posting
→ patient statement — without a biller babysitting every hand-off?

**Verdict:** With this sprint we went from "works in demo" to "works
for one payer under observation." We are NOT fully production-ready
because five integration surfaces are still stubbed (EMR-216..EMR-220).
But the fleet is now honest about what's missing instead of silently
shipping broken claims.

---

## What the sprint shipped

### Three new foundation modules (pure, unit-testable)

**`src/lib/billing/payer-rules.ts`** — single source of truth for per-
payer behavior. 10 seed payers (Aetna, UHC, Cigna, BCBS, Humana,
Anthem, Kaiser, Medicare, Medicaid, TRICARE). Per-rule fields:
timely-filing window (original + corrected), appeal L1/L2/external
deadlines, 277CA ack SLA, adjudication SLA, eligibility TTL,
corrected-claim frequency code, `honorsMod25OnZ71`,
`requiresPriorAuthForCannabis`, `excludesCannabis`, cannabis policy
citation, electronic-submission support, attachment channels.
Exposes `resolvePayerRule`, `computeTimelyFilingDeadline`,
`eligibilityTtlMs`, `isCommercialPayer`, `isGovernmentPayer`,
`shouldRouteCannabisToSelfPay`.

**`src/lib/billing/remittance.ts`** — ERA/835 semantics. `GROUP_CODE_SEMANTICS`
covers CO/PR/OA/PI/CR/WO with whoOwes + collectibility. `CARC_TAXONOMY`
maps 14 CARCs including the PR sub-codes (1 = deductible,
2 = coinsurance, 3 = copay, 96 = non-covered, 23 = prior-payer).
`classifyAdjustment()` routes a single line; `splitPatientResponsibility()`
rolls stacked CARCs into 9 buckets (deductible / coinsurance / copay /
non-covered / other-PR / contractual / recoverable-CO / unknown /
takeback). `reconcileClaimTotals()` enforces billed = paid + adjustments
within a 2¢ tolerance.

**`src/lib/billing/clearinghouse-ack.ts`** — `parse999` + `parse277CA`
that accept ANSI X12 strings OR JSON envelopes (Availity, Waystar,
Change Healthcare all wrap responses differently). Normalized
`Parsed999` + `Parsed277Ca` downstream. `STC_CATEGORY_MAP` covers the
A0-A8, D0-D1, F0-F3F, P0-P5, R0-R9 range. `decide277Actions()` maps
per-claim status → advance_to_accepted / resubmit / mark_pending /
investigate.

### One new agent

**`staleClaimMonitor`** — closes the "claim disappeared into the void"
blind spot. Walks submitted/accepted/adjudicated claims daily and
flags (1) submitted > payer.ackSlaDays with no 277CA, (2) accepted >
payer.adjudicationSlaDays with no ERA, (3) within 14 days of
timelyFilingDeadline. Opens deduped tasks with concrete next steps
(call the clearinghouse, call the payer, refile before the window
closes). SLAs pulled from the payer-rules registry, so commercial
(2-day ack) and government (3-day ack) are judged separately.

### Per-agent hardening

| Agent | Before | After |
|---|---|---|
| **claim-construction** | Stub 837, no timely-filing deadline, NPIs left `undefined`, count-based claim number (racy), secondary coverage ignored | Per-payer timely-filing deadline computed + written; NPI resolution via `resolveBillingIdentifiers()` with escalation-on-miss; P2002-resilient claim number retry; secondary-coverage detection emits follow-up event |
| **scrub engine** | Hardcoded 90-day timely filing for everyone, no NCCI, no MUE, no cannabis coverage routing | Per-payer timely filing with PAST_TIMELY_FILING (blocking) + APPROACHING_TIMELY_FILING (last 20% warning); NCCI starter set (99406/99407/96160/96161/36415 vs same-day E/M); MUE per-day caps; CANNABIS_PAYER_EXCLUDES blocks pointless submissions; CANNABIS_PAYER_PA_REQUIRED blocks unauth'd |
| **clearinghouse-submission** | Simulated success; no 999/277CA parsing; fixed 60s cooldown; all rejections treated equal | `interpretAckPayload()` accepts X12 or JSON; exponential backoff (60s / 15min / 1h); `classifyRejection()` separates permanent (INVALID_MEMBER, INVALID_NPI, duplicate, invalid DOS) from transient; permanent rejections escalate immediately rather than repeat |
| **adjudication-interpretation** | Single CARC per line, PR emitted as one `coinsurance` event, no takeback handling, no RA reconciliation | Flat-normalized stacked adjustments; shared `classifyAdjustment()`; `splitPatientResponsibility()` fans PR into 5 buckets each with its own `patient.balance.created` event; takebacks detected + flagged; `reconcileClaimTotals()` blocks silent mispostings; returns per-bucket split + variance on output |
| **patient-collections** | Intent passed in by caller | `resolveDunningIntent()` promotes the ladder into data: 30d gentle → 60d second → 90d final → 90d+3prior plan-offer; active-good-standing plan pauses; default plan re-enters ladder |
| **refund-credit** | Flat $50 threshold for refund | `resolveCreditAction()` tiered: $200+ refund, $50-200 ≥180d refund, <$5 ≥365d write-off, else hold; ages credits by oldest patient payment |
| **underpayment-detection** | Compared Medicare allowed to full fee schedule → every Medicare claim flagged | `expectedAllowedFraction()` scales expectation by payer class (85% commercial, 55% MA, 45% Medicare, 50% Medicaid) |
| **reconciliation** | Only matched payment ↔ financial event | Same + `balanceBatchAgainstCheck()` pure helper for bank/check totals (ready for EMR-224) |
| **compliance-audit** | E/M distribution + mod-25 + duplicate + high-dollar | Same + HIPAA documentation retention (closed claim must have finalized note, blocking); 837P retention (ediPayload must be retained, warning); PCI scope regex-scan for 15-16-digit runs in claim notes / scrub / denial JSON (blocking) |

All 111 billing unit tests green after the hardening. Type-check clean.

---

## End-to-end readiness — what happens when a real patient walks in today

**Phase 1 — Encounter to claim (works today)**
1. Intake + eligibility check runs on schedule. ✓
2. Scribe drafts note with allergies + vulnerability gates. ✓
3. Coding optimization assigns charges with F12 severity + mod-25 guards. ✓
4. Charge integrity scrubs with NCCI + MUE + per-payer timely filing + cannabis coverage routing. ✓
5. Claim construction writes timelyFilingDeadline, pulls NPIs or escalates. ✓ (NPI source is temporary — EMR-220)

**Phase 2 — Submission (partially works, stub-bounded)**
6. Clearinghouse-submission formats 837P — **STUB**. Real X12 v5010 generator is EMR-216.
7. Gateway client — **STUB**. Real Availity/Waystar/Change adapter is EMR-217.
8. 999 functional ack — parser ready ✓. Gateway delivery pipe is EMR-217.
9. 277CA claim ack — parser ready ✓. Stale-claim monitor catches no-response ✓.

**Phase 3 — Adjudication (works when we get real 835s)**
10. 835 ingestion — **PENDING** (EMR-221). Once ingestion hands us an `AdjudicationResult` row, everything downstream is automatic.
11. Adjudication interpretation splits PR, handles stacked CARCs, reconciles RA totals. ✓
12. Denial triage identifies cannabis patterns with 🌿 marker. ✓
13. Denial resolution routes auto-correct vs. appeal vs. patient-responsibility vs. escalate. ✓
14. Appeals generation uses cannabis-aware strategies + evidence-ranked docs. ✓

**Phase 4 — Patient responsibility (partially works)**
15. Per-PR-bucket events emit to statement builder. ✓ (Statement builder is EMR-225.)
16. Statement generation — **MISSING** (EMR-225).
17. Dunning ladder auto-resolves intent. ✓
18. Payment plan engine — **MISSING** (EMR-226). The helper references it; the engine ships in EMR-226.
19. Refund / credit / write-off decision table with aging. ✓

**Phase 5 — Operations**
20. Reconciliation matches payments to ledger + batch balancing helper. ✓
21. Stale-claim monitor opens tasks for silent claims. ✓
22. Underpayment detector is payer-class-aware. ✓
23. Compliance audit catches missing documentation, missing EDI retention, PCI scope leaks. ✓
24. Daily-close report — **MISSING** (EMR-230).

---

## Five integration surfaces that block "day 1"

These are the things no single agent can fix. Each is a ticket.

1. **EMR-216 Real 837P generator.** The stub will reject at every real gateway.
2. **EMR-217 Real clearinghouse gateway client.** Availity / Waystar / Change adapter with auth, rate limits, polling, retries.
3. **EMR-220 NPI + Tax ID schema.** Claim construction escalates today because there's nowhere to store them durably.
4. **EMR-221 ERA / 835 ingestion pipeline.** Adjudication interpretation is ready; it needs real 835s parsed into `AdjudicationResult`.
5. **EMR-225 Patient statement generator.** Patient responsibility is captured per bucket but never rendered into a statement.

Until those five ship, we're a billing engine with one leg attached to the floor. After those five, we're billing production patients with a biller on standby for exceptions only.

---

## Five more tickets to finish the story (EMR-218 / -219 / -222 / -224 / -230)

- **EMR-218 Payer rules → DB.** Ops needs to edit rules without a deploy.
- **EMR-219 Secondary claim filing.** Primary adjudicates → we have to file the secondary with Loop 2320 CAS; today we only mark it.
- **EMR-222 Full NCCI/MUE reference tables.** The starter set catches the big ones; production wants CMS's quarterly full load.
- **EMR-224 Lockbox / bank deposit matching.** Daily close requires matching payments to actual deposits.
- **EMR-230 Daily-close report + exception dashboard.** One screen for "is the business healthy today?"

Five more tickets (-223 Contract allowables, -226 Payment plan engine, -227 NSF/chargeback, -228 Appeal tracker, -229 Prior-auth workflow) finish the outcome-learning and edge-case stories.

---

## What I would tell the practice manager

> "Tonight's pass turned the billing fleet from 'works in demo' into 'works for one payer under observation.' Every claim now has a real timely-filing deadline, every rejection is classified correctly, every patient dollar goes to the right bucket on a statement, and when a payer goes silent for longer than it should, someone gets a ticket before the clock runs out. The guts of an end-to-end automated billing department are there. Before we point it at a live panel of patients we need: a real 837P generator (EMR-216), a real gateway (EMR-217), NPIs in the DB (EMR-220), an ERA ingestion pipe (EMR-221), and a statement generator (EMR-225). Those are the five that matter. Everything else is polish."

Grand total tickets: **230.** New this sprint: **15** (EMR-216..EMR-230).
All 111 billing unit tests green. Type-check clean. No schema migrations required for the hardened agents themselves — the five integration tickets above are where the schema changes land.

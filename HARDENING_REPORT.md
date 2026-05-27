# Practice-Manager Hardening Report

**Scope:** 10 critical agents + scheduling ticket backlog (EMR-206..EMR-215).
**Standard:** Day 1 on Leafjourney must beat a crack billing team + killer admin team.
**Voice:** This is me, your practice manager, reading the fleet top to bottom and writing down every corner I'd cut if I were still running a mid-size practice. Tone is blunt on purpose.

---

## The bottom line

We shipped a fleet that said the right things and did most of them. We just stopped being precise in the exact places a real practice bleeds: cannabis-specific denials, pediatric/pregnancy gating, override discipline, and follow-up cadence. This pass fixes those. If you ran this fleet in a real clinic tomorrow, it would hold.

Fleet-wide changes you feel immediately:
- One bilingual red-flag scanner under `src/lib/agents/safety/cannabis-red-flags.ts`, used by every text-ingesting agent. Add a flag once, the whole fleet catches it.
- Scheduling is no longer a 57-line stub — it's a rule-based cadence engine that writes its own WHY onto every task.
- Every billing agent now knows what F12 and Z71 actually mean to a commercial payer, and none of them will cheerfully burn timely filing on a non-covered appeal anymore.

---

## Per-agent verdict

### 1. correspondence-nurse (Nurse Nora)
**Verdict:** Trustworthy. Was good, now it won't kill a patient when the LLM is down.

- **Before:** Flat EN-only keyword list. On LLM failure, emergency messages got a "we'll get back to you" reply.
- **After:** Delegates to the shared bilingual scanner (EN + ES). Emergency fallback instructs the patient to call 911, 988, or Poison Control at 1-800-222-1222.
- **Residual gap:** No Spanish-language draft path — fallback copy is bilingual but the LLM prompt is English. Spanish draft generation is a next-sprint item. Tied to the preferredLanguage column gap below.

### 2. scribe
**Verdict:** Shippable. Allergy handling is now at the top, not buried.

- **Before:** Allergies sat in context only if the LLM remembered to look. Confidence was whatever the model self-reported.
- **After:** ALLERGIES block pinned to the top of the prompt with NKDA default. Non-negotiable safety rules block the LLM from inventing facts or recommending cannabis to bipolar I / schizophrenia / pregnancy / psychosis / severe cardiac / pediatric patients without explicit review. Data-density confidence ceiling (0.4 / 0.65 / 0.8 / 0.9 at 0 / 3 / 6 / 10+ evidence units); fallback path capped at 0.5 regardless.
- **Residual gap:** No structured "review before finalize" gate in UI — the ⚠ flag is prompt-enforced but doesn't yet block the finalize button. UI wiring is a separate ticket.

### 3. pre-visit-intelligence
**Verdict:** Usable in front of a physician.

- **Before:** Generic summary. Cohort outcomes cited indiscriminately. No pediatric/pregnancy/psych gates.
- **After:** Pediatric (<18) adds a mandatory dual-physician sign-off flag. Pregnancy / lactation / bipolar I / schizophrenia / psychosis / family hx all add explicit risk flags. Cohort is filtered to ≥2 similar patients on the same regimen (regimenProductTypes breakdown ≥0.28) so we never report "4 patients improved" when they were on three different regimens. Bilingual chart content is detected and surfaced as a translation-verification flag.
- **Residual gap:** Vulnerability gates live here but not consistently in every downstream surface. Dosing-recommendation and patient-education agents should read the same flags; adding that is a cross-cutting task, not per-agent.

### 4. prescription-safety
**Verdict:** Stronger. Override discipline fixed.

- **Before:** Any override blob — even an empty one — silently muted contraindications. No age awareness.
- **After:** Override only honored with a reason ≥20 chars. Missing reason → contraindications stay surfaced AND a concern-severity observation fires explaining the gap. Vulnerability escalator bumps every observation one tier when the patient is pediatric or pregnant/lactating. `extractOverrideReason` + `escalateSeverity` exported for tests.
- **Residual gap:** No audit trail of who overrode what when. The observation captures that an override happened, but the override blob itself doesn't yet carry an userId / timestamp schema. Schema change needed.

### 5. scheduling
**Verdict:** From stub to real engine. Night-and-day.

- **Before:** 57 lines, hardcoded "offer 2-week follow-up."
- **After:** Rule-based cadence engine. 7 primary rules evaluated in order (urgent mental-health → CUD → titration → pain → standard regimen → no-regimen → re-engagement fallback) plus 2 always-on reminders (30-day refill audit, 7-day outcome check-in). Every task description carries `[ruleId] + rationale` so an operator sees WHY. Input accepts trigger enum for event-shaped invocation. `resolveCadenceRule` is a pure function, unit-testable without DB. Version bumped 1.0.0 → 2.0.0.
- **Residual gap:** This is the engine, not the product. EMR-206..EMR-215 (backlog) build the patient-facing scheduling UX on top: self-serve booking, no-show prediction, waitlist fill, multi-channel reminders, analytics.

### 6. eligibility-benefits
**Verdict:** Freshness now matters.

- **Before:** Single 24h TTL for everyone. No cannabis-risk awareness.
- **After:** Per-payer TTL: commercial (Aetna / UHC / Cigna / BCBS / Humana / Anthem / Kaiser) 4h; government (Medicare / Medicaid / Tricare / CHAMPVA / VA) 12h; default 6h. TTL enforced at read AND write — a stored-but-stale commercial snapshot gets re-checked. Cannabis risk pre-screen scans encounter charges for F12.x, Z71.41/51/89, Z03.89, CPT 99406/99407/96160/96161 and emits `cannabisCoverageWarnings[]` on every return path.
- **Residual gap:** No persistent per-payer rules lookup table (see cross-cutting gaps). The TTLs are hardcoded; when we add a new payer, we have to edit code.

### 7. denial-triage
**Verdict:** Cannabis denials finally get cannabis responses.

- **Before:** Everything ran through generic `classifyDenial`. "F12 + CO-50" looked like any other medical-necessity denial.
- **After:** Four cannabis patterns layered on top: `f12-medical-necessity`, `z7189-bundling`, `cannabis-not-covered-policy`, `prior-auth-cannabis`. The benefit-exclusion pattern explicitly blocks the "burn timely filing on an un-appealable denial" footgun. Task titles carry 🌿 + pattern id. `detectCannabisDenialPattern` exported for tests.
- **Residual gap:** CARC extraction is regex-based from denial reason text. A real 835/ERA ingestion path would give us the CARC field directly. Keep the regex as fallback, add the structured path when ERA ingestion lands.

### 8. appeals-generation
**Verdict:** Stops writing thin appeals.

- **Before:** Generic CARC strategy + flat supporting-doc list.
- **After:** `CANNABIS_APPEAL_STRATEGIES` for CARC 50 / 96 / 197 / 16 / 4. Each cannabis template mandates DSM-5 severity + prior-treatment failures + payer-specific policy citation + provider credentials. `resolveAppealStrategy(carc, icd10[])` switches to cannabis variant when F12/Z71 present. Supporting docs ranked by evidence weight (finalized notes 1.0 > psych evals 0.95 > assessments 0.9 > PA packets 0.85 > labs 0.8 > imaging 0.7 > generic 0.6 > email 0.2) and sorted before submission.
- **Residual gap:** No payer-policy database. We tell the agent to "cite the payer's cannabis coverage policy by number and effective date" but we can't hand it that policy. Second cross-cutting gap.

### 9. charge-integrity
**Verdict:** Catches the four cannabis denials that would have landed next Thursday.

- **Before:** Ran `scrubClaim()` and stopped.
- **After:** Supplemental `scrubCannabisRules()` with four rules: `CANNABIS_F12_SPECIFICITY` (F12.10/F12.90 under-spec), `CANNABIS_Z71_MODIFIER25` (bundling on commercial payer), `CANNABIS_F12_NO_COVERAGE` (blocking error — will burn timely filing), `CANNABIS_F12_COMMERCIAL_RISK` (pre-load appeal docs). Each warning carries payer guidance and a concrete next action.
- **Residual gap:** Commercial-payer detection is substring matching. Same payer-rules database dependency as eligibility-benefits.

### 10. coding-optimization
**Verdict:** Won't upcode cannabis visits anymore.

- **Before:** Generic E/M uplift logic; Z71.89 bundling was invisible; 99406/99407 could sneak through on F12 claims.
- **After:** F12 severity gate (no F12.10→F12.20 upgrade without ≥2 DSM-5 criteria + functional impact), Z71.89 bundling warning on commercial payers with mod-25 logic, 99406/99407 flagged as mis-code when tied to F12/Z71, E/M uplift on F12-only visits requires documented MDM.
- **Residual gap:** Rules live in the prompt, not in code. The LLM can drift. A small deterministic post-check (parse the suggested codes, re-apply the rules) would catch non-compliant outputs before they hit Charge.

---

## Top 5 cross-cutting gaps (fleet-level, not per-agent)

These are the things no single agent can fix. They need platform work.

### 1. Persona memory persistence
Each agent reads `formatPersonaForPrompt(resolvePersona(...))` from a static registry. Voice tuning per-organization (or per-clinician) requires persisting persona overrides in the DB and layering them. Today: one voice per agent across all tenants. Fix: `PersonaOverride` model keyed by organizationId + agentName.

### 2. Per-agent model broker persistence
We've got a model client interface but the "which model for which agent on which tenant" decision isn't persisted anywhere durable. A tenant that wants Claude 4.7 for scribe and Haiku for bulk tasks has to rebuild from defaults. Fix: `AgentModelPreference` table keyed by (organizationId, agentName) → modelId + tempOverride.

### 3. No-show prediction training data
EMR-207 ships the model but there is no curated training set yet. We need to backfill historical appointment + encounter rows with confirmed no-show / arrived / late labels, standardize features (lead-time, distance, weather, insurance, prior no-show rate), and ship a `AppointmentLabel` table. Otherwise the ticket ships into a cold-start problem.

### 4. Payer rules lookup table
Three hardenings above (charge-integrity, eligibility-benefits, coding-optimization) hardcode payer-name substrings to decide commercial vs. govt. Three also reference "payer-specific cannabis coverage policy" as if we had one. We don't. Fix: `PayerRule` table keyed by payerId with fields (commercialVsGovt, cannabisPolicyNumber, cannabisPolicyEffectiveDate, excludesCannabis boolean, mod25OnZ71 boolean, requiresPAForF12 boolean). Every billing agent reads from there.

### 5. `preferredLanguage` column on Patient
The bilingual red-flag scanner catches Spanish. The deterministic emergency fallback is bilingual. The pre-visit briefing flags non-English chart content. But we have no stored patient language preference to drive which language to use when we generate outbound copy. Fix: `Patient.preferredLanguage` enum (`en | es | other`) plus an intake question to capture it. Then Nora's draft path routes to the right language, scribe's fallback SOAP note does too, and patient-education agents stop assuming English.

---

## Scheduling ticket backlog (EMR-206..EMR-215)

10 new tickets added to TICKETS.md turning scheduling from the v2 engine into a product. Three urgent, five high, one normal. Grand total updated to 215. Full acceptance criteria live in TICKETS.md; summary here:

| # | Title | Priority |
|---|---|---|
| 206 | Self-Serve Online Scheduling | Urgent |
| 207 | No-Show Prediction Model + De-Risking | Urgent |
| 208 | Algorithmic Follow-Up Cadence per Condition | Urgent |
| 209 | Smart Slot Recommender | High |
| 210 | Intelligent Waitlist + Cancellation Fill | High |
| 211 | Multi-Channel Reminder Orchestration | High |
| 212 | New-Patient Intake-to-Visit Gate Pipeline | High |
| 213 | Group Visit + Block + Recurring Scheduling | Normal |
| 214 | Provider Preference Engine + Burnout Guardrails | High |
| 215 | Scheduling Analytics Cockpit | High |

---

## What you ship tomorrow vs. what's still on my desk

**Ship:**
- Any agent in the 10 above, in front of a patient or a payer, today.
- Scheduling cadence engine is running for every finalized encounter.
- Cannabis denials stop routing to the generic appeal path.

**Still on my desk:**
- UI wiring to respect scribe's vulnerability ⚠ flags at finalize time.
- Platform tickets (persona persistence, model broker, payer rules, language column).
- EMR-207 training data backfill before the no-show model goes live.

— The practice manager who wants Day 1 to beat the competition's Year 3.

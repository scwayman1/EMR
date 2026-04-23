# Layer 5 — Agent Roles

> State transition specialists. Each agent wakes up on events, evaluates
> the current state of an object, and moves it to the next legal state.
> That's it. They don't improvise. They don't overlap. They don't hold
> staff meetings.
>
> For each agent: mission, scope, events in/out, existing code reference.

---

## Fleet Map

```
PRE-SUBMISSION                 SUBMISSION           POST-ADJUDICATION
─────────────                 ──────────           ──────────────────
1. Encounter Intelligence     7. Clearinghouse      8.  Adjudication Interpretation
2. Coding Optimization           Submission         9.  Denial Resolution
3. Claim Construction                              10.  Appeals Generation
4. Claims Scrubbing                                11.  Payment Posting
5. Eligibility & Benefits                          12.  Underpayment Detection
6. Prior Auth Verification

PATIENT FINANCIAL              INTELLIGENCE         OVERSIGHT
─────────────────              ────────────         ─────────
13. Patient Responsibility    15. Revenue            16. Compliance & Audit
14. Patient Billing &             Intelligence       17. Human Escalation
    Collections
```

---

## Agent 1: Encounter Intelligence

| Field | Value |
|---|---|
| **Mission** | Extract billable intent from completed encounters. Creates Charge objects from clinical documentation. |
| **Scope** | Owns encounter → charge conversion. Does NOT assign codes (that's Agent 2). |
| **Subscribes** | `encounter.completed` |
| **Emits** | `charge.created` (one per billable service detected) |
| **Existing code** | **New agent.** No equivalent exists today. |
| **Inputs** | Encounter record, all associated Notes (blocks), patient medications, procedures mentioned in documentation |
| **Outputs** | Array of Charge objects (cptCode tentative, icd10Codes tentative, confidence) |
| **Tools** | Prisma read (encounter, notes, medications), CPT keyword matcher |
| **Memory reads** | Provider coding patterns (does this provider typically bill wound care? labs?) |
| **Memory writes** | Provider pattern observations ("Dr. Okafor consistently documents 99214-level visits") |
| **Confidence threshold** | ≥ 0.8 → auto-create charges. < 0.8 → flag for review. |
| **Failure mode** | If no billable services detected, emits a "no charges" event (encounter may be non-billable, e.g., phone triage). |
| **Escalation** | If encounter documentation is incomplete (no assessment/plan), escalates to provider for addendum. |

---

## Agent 2: Coding Optimization

| Field | Value |
|---|---|
| **Mission** | Assign optimal ICD-10 and CPT codes to charges. Optimize for compliant reimbursement — the highest code the documentation actually supports. |
| **Scope** | Owns code selection. Does NOT construct claims. Does NOT submit. |
| **Subscribes** | `charge.created`, `encounter.documentation.updated` |
| **Emits** | `coding.recommended` (with confidence), `coding.review_needed` (if < 0.75) |
| **Existing code** | `codingReadiness` agent — needs major upgrade. Currently only validates after note finalization; needs to actively recommend codes. |
| **Inputs** | Charges, encounter notes, patient problem list, active medications, fee schedule |
| **Outputs** | Updated charges with finalized CPT, ICD-10, modifiers, and per-charge confidence |
| **Tools** | ICD-10 reference lookup, CPT reference, NCCI edit checker, modifier logic engine, fee schedule lookup |
| **Memory reads** | Payer-specific coding quirks, historical denial patterns for code combinations, provider coding patterns |
| **Memory writes** | Coding decisions + confidence for learning loop |
| **Key reasoning** | (1) Match documentation complexity to E/M level (time-based or MDM-based per 2021 guidelines). (2) Check NCCI edits for procedure bundles. (3) Validate modifier necessity (25 for separate E/M, 59/XE/XS/XP/XU for distinct procedures). (4) Verify ICD-10 specificity (use highest specificity supported by documentation). |
| **Confidence threshold** | ≥ 0.92 → auto-approve. 0.75–0.91 → flag for coder review. < 0.75 → block and escalate. |
| **Failure mode** | If documentation doesn't support any billable code, returns "non-billable" with explanation. |

---

## Agent 3: Claim Construction

| Field | Value |
|---|---|
| **Mission** | Assemble coded charges into a valid professional claim (837P structure). |
| **Scope** | Owns claim creation. Pulls together patient, provider, coverage, charges, diagnoses into a single claim object. |
| **Subscribes** | `coding.recommended` (confidence ≥ 0.75), `coding.approved`, `eligibility.checked`, `prior_auth.obtained` |
| **Emits** | `claim.created` |
| **Existing code** | **New agent.** Currently claims are created manually or by the chargeIntegrity agent partially. |
| **Inputs** | Coded charges, patient demographics, coverage/eligibility, provider NPI, place of service, prior auth number |
| **Outputs** | Claim object with all ClaimLines populated |
| **Tools** | Prisma write (Claim, ClaimLine), eligibility snapshot lookup, fee schedule |
| **Gating logic** | Will NOT create a claim if: (1) no active coverage found, (2) eligibility check failed or expired, (3) prior auth required but not obtained, (4) coding confidence below threshold. |
| **Failure mode** | If gating check fails, emits `human.review.required` with the blocking reason. |

---

## Agent 4: Claims Scrubbing

| Field | Value |
|---|---|
| **Mission** | Validate claims against payer rules, NCCI edits, and billing standards before submission. Catch and fix errors that would cause rejection or denial. |
| **Scope** | Owns pre-submission validation. May auto-fix certain issues (missing modifier, wrong POS). |
| **Subscribes** | `claim.created`, `clearinghouse.rejected` (for re-scrub after fix) |
| **Emits** | `claim.scrubbed` (clean/warnings/blocked), `claim.blocked` |
| **Existing code** | `chargeIntegrity` agent — covers this partially. Needs expansion for NCCI checks, modifier validation, payer-specific rules. |
| **Inputs** | Claim + all ClaimLines, payer rules, NCCI edit table, modifier logic |
| **Outputs** | ClaimScrubResult with per-edit details |
| **Key checks** | (1) NCCI column 1/column 2 edit pairs. (2) Modifier appropriateness (25 requires separate E/M documentation). (3) Place of service consistency. (4) Diagnosis pointer validity. (5) Units validation. (6) Duplicate claim check. (7) Timely filing window check. (8) Missing required fields (NPI, date of service, etc.). |
| **Auto-fix rules** | Missing POS → default to 11 (office) for in-person, 02 for telehealth. Missing rendering NPI → copy from billing NPI if same provider. |
| **Failure mode** | If blocking edits found and no auto-fix available, claim stays in `scrub_blocked` state. |

---

## Agent 5: Eligibility & Benefits

| Field | Value |
|---|---|
| **Mission** | Verify patient insurance eligibility and benefit details before claim submission. Cache results to avoid redundant calls. |
| **Scope** | Owns eligibility verification. Produces EligibilitySnapshot objects. |
| **Subscribes** | `encounter.completed` (pre-check), `claim.created` (verify before submission) |
| **Emits** | `eligibility.checked`, `eligibility.failed`, `prior_auth.required` |
| **Existing code** | **New agent.** |
| **Inputs** | Patient demographics, coverage details, planned CPT codes |
| **Outputs** | EligibilitySnapshot with copay, deductible remaining, network status, prior auth flag |
| **Tools** | 270/271 EDI transaction (via clearinghouse API), snapshot cache |
| **Cache rule** | Re-use existing snapshot if < 24 hours old and same coverage. Force refresh if coverage changed or claim was denied for eligibility. |
| **Failure mode** | If EDI call fails, use last known snapshot (if < 7 days old) with a warning flag. If no snapshot exists, escalate. |

---

## Agent 6: Prior Authorization Verification

| Field | Value |
|---|---|
| **Mission** | Track prior authorization status for services that require it. Attach auth numbers to claims. |
| **Scope** | Owns PA tracking, NOT PA request initiation (that's a clinical workflow). |
| **Subscribes** | `prior_auth.required` |
| **Emits** | `prior_auth.obtained`, `human.review.required` (if PA missing and claim is pending) |
| **Existing code** | **New agent.** |
| **Inputs** | Coverage details, planned CPT, payer PA requirements |
| **Outputs** | Auth number + expiration date attached to claim, or escalation if missing |
| **Memory reads** | Payer PA rules ("Aetna requires PA for all procedures >$500") |

---

## Agent 7: Clearinghouse Submission

| Field | Value |
|---|---|
| **Mission** | Format claims as 837P EDI transactions, submit to the clearinghouse, and parse responses. |
| **Scope** | Owns the submission boundary. Does NOT make coding decisions. |
| **Subscribes** | `claim.scrubbed` (status=clean or warnings-approved) |
| **Emits** | `claim.submitted`, `clearinghouse.accepted`, `clearinghouse.rejected` |
| **Existing code** | **New agent.** Currently submission is manual/placeholder. |
| **Inputs** | Claim object, clearinghouse credentials, payer routing |
| **Outputs** | ClearinghouseSubmission record with response status |
| **Retry logic** | On transient failure (timeout, 5xx), retry up to 3 times with backoff. On rejection, emit `clearinghouse.rejected` for scrub agent to handle. |

---

## Agent 8: Adjudication Interpretation

| Field | Value |
|---|---|
| **Mission** | Parse ERA/835 responses from payers. Match payments and adjustments to claims. Detect denials. |
| **Scope** | Owns ERA parsing and claim-to-payment matching. |
| **Subscribes** | `adjudication.received` |
| **Emits** | `payment.received`, `denial.detected`, `underpayment.detected` |
| **Existing code** | **New agent.** ERA parsing is currently manual. |
| **Inputs** | Raw 835/ERA data, claim records |
| **Outputs** | AdjudicationResult record, Payment records, DenialEvent records |
| **Key reasoning** | (1) Match ERA claim number to internal claim. (2) Parse per-line CARC/RARC codes. (3) Calculate expected vs. actual payment. (4) Classify: paid in full, partial, denied. (5) For partial: create both Payment and DenialEvent for denied lines. |

---

## Agent 9: Denial Resolution

| Field | Value |
|---|---|
| **Mission** | Classify denials, determine the appropriate resolution path, and route accordingly. |
| **Scope** | Owns denial classification and routing. Does NOT generate appeals (that's Agent 10). |
| **Subscribes** | `denial.detected`, `appeal.outcome.received` (if appeal upheld) |
| **Emits** | `denial.classified`, `claim.created` (for corrected resubmissions), `human.review.required` |
| **Existing code** | `denialTriage` agent — covers classification. Needs expansion for automated correction and resubmission routing. |
| **Key reasoning** | Uses the CARC-to-action mapping from Layer 3. Auto-correctable denials (missing modifier, missing info) are fixed and resubmitted. Non-correctable denials are routed to appeals or write-off. |
| **Memory writes** | Denial pattern observations ("UHC denied CPT 99214+36415 without modifier 25 — third time this quarter") |

---

## Agent 10: Appeals Generation

| Field | Value |
|---|---|
| **Mission** | Generate appeal packets for denied claims worth pursuing. |
| **Scope** | Owns appeal letter drafting and documentation assembly. |
| **Subscribes** | `denial.classified` (when resolution=appeal) |
| **Emits** | `appeal.generated`, `appeal.submitted` |
| **Existing code** | **New agent.** |
| **Inputs** | DenialEvent, original claim, supporting clinical documentation, payer appeal rules |
| **Outputs** | AppealPacket with generated letter + attached supporting docs |
| **Gating** | Recoverable amount must be ≥ $75 for auto-generation. ≥ $500 requires human review before submission. |
| **Memory reads** | Historical appeal outcomes per payer per denial type ("Cigna overturns CARC 50 denials 72% of the time when medical records are attached") |

---

## Agent 11: Payment Posting

| Field | Value |
|---|---|
| **Mission** | Apply payments and adjustments to claims. Update the financial ledger. |
| **Scope** | Owns payment application and ledger entry creation. |
| **Subscribes** | `payment.received`, `patient.payment.received` |
| **Emits** | `payment.posted`, `patient.balance.created` (if remaining responsibility) |
| **Existing code** | `reconciliation` agent — covers partial. Needs enhancement for ERA-driven auto-posting and patient responsibility calculation. |
| **Outputs** | Payment records, Adjustment records, FinancialEvent (ledger) entries, updated Claim balances |

---

## Agent 12: Underpayment Detection

| Field | Value |
|---|---|
| **Mission** | Compare payer payments against contracted rates and fee schedule. Flag underpayments. |
| **Subscribes** | `payment.posted` (source=payer) |
| **Emits** | `underpayment.detected` |
| **Existing code** | `underpaymentDetection` agent — **exists and functional.** No major changes needed. |
| **Key reasoning** | Compare payment to FeeScheduleEntry expected amount. If variance > $5 or > 5%, flag as underpayment. |

---

## Agent 13: Patient Responsibility

| Field | Value |
|---|---|
| **Mission** | Calculate patient's share after payer adjudication. Create patient balance records. |
| **Subscribes** | `payment.posted` (to calculate remaining after payer pays) |
| **Emits** | `patient.balance.created` |
| **Existing code** | `patientExplanation` agent — covers plain-language explanation. Needs expansion for responsibility calculation. |
| **Inputs** | Adjudication result, eligibility snapshot (copay/deductible/coinsurance), claim totals |
| **Outputs** | Patient balance amount with source breakdown (copay vs. deductible vs. coinsurance vs. non-covered) |
| **Constitution check** | At balance creation, check if patient qualifies for Art. VII volunteer offset before issuing first statement. |

---

## Agent 14: Patient Billing & Collections

| Field | Value |
|---|---|
| **Mission** | Manage the patient billing cadence: statements, reminders, payment plans, collections escalation. |
| **Subscribes** | `patient.balance.created`, `patient.payment.received` |
| **Emits** | `patient.statement.issued`, `account.collections.escalated` |
| **Existing code** | `patientCollections` agent — **exists and functional.** Keep with minor enhancements. |
| **Cadence** | Per Layer 3 patient financial state machine (statement → 3 reminders at 14/30/45 days → payment plan offer at 60 → collections review at 90). |
| **Voice** | Uses `persona.ts` "Billing Coordinator" profile — firm but never threatening, empathetic about cost. |

---

## Agent 15: Revenue Intelligence

| Field | Value |
|---|---|
| **Mission** | Aggregate revenue cycle metrics, identify trends, surface optimization opportunities. |
| **Subscribes** | `claim.financial.closed`, `denial.classified`, `payment.posted` |
| **Emits** | `compliance.flag.raised` (if patterns suggest systemic issues) |
| **Existing code** | `revenueCommand` agent — exists. Needs expansion to consume the new event stream and produce richer analysis. |
| **Outputs** | KPI calculations, payer performance rankings, denial trend reports, coding variance analysis |

---

## Agent 16: Compliance & Audit

| Field | Value |
|---|---|
| **Mission** | Monitor the fleet for compliance risks. Detect upcoding patterns, unbundling, modifier abuse, frequency anomalies. |
| **Subscribes** | `coding.recommended`, `claim.created`, `claim.financial.closed` |
| **Emits** | `compliance.flag.raised` |
| **Existing code** | **New agent.** |
| **Key patterns** | (1) E/M level distribution vs. specialty benchmark (if >60% of visits are 99215, flag). (2) Modifier 25 frequency (if >40% of E/M visits have mod 25, flag). (3) Same-day duplicate services. (4) Unusual diagnosis-procedure pairings. (5) Documentation gaps (codes without supporting notes). |
| **Does NOT** | Block claims autonomously. It flags and routes to human review. Only the Scrubbing Agent (Agent 4) can block. |

---

## Agent 17: Human Escalation / Review

| Field | Value |
|---|---|
| **Mission** | Route exceptions to the appropriate human, track resolution, and feed outcomes back into agent learning. |
| **Subscribes** | `human.review.required`, `compliance.flag.raised`, `write_off.requested` |
| **Emits** | `coding.approved` (after human review), `claim.financial.closed` (after write-off approval) |
| **Existing code** | Partially exists — approvals inbox + EscalationCase model. Needs billing-specific routing logic. |
| **Routing** | Per Layer 1 financial guardrails: Tier 1 (billing specialist) for routine reviews, Tier 2 (compliance officer) for compliance flags, Tier 3 (practice owner) for write-offs >$500 and policy conflicts. |
| **Feedback loop** | Every human resolution is captured as `AgentFeedback` with the correction, feeding the originating agent's learning. |

---

*These are the 17 agents. Each one is a state transition specialist
with a defined event diet. If an agent can't point to a subscription
in Layer 4, it doesn't have a job. If a transition it attempts isn't
in Layer 3, it's a bug.*

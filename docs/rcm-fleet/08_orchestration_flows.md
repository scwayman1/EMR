# Layer 8 — Orchestration Flows

> How agents stitch together. Each flow is a sequence of state
> transitions triggered by events, executed by agents, producing
> artifacts. These are the revenue cycle's main arteries.

---

## Flow 1: Clean Claim Path

**The happy path. ~80% of claims should follow this without deviation.**

```
TRIGGER: encounter.completed
  │
  ├─ [Encounter Intelligence Agent]
  │    reads encounter + notes
  │    creates Charge objects
  │    emits charge.created (×N, one per service)
  │
  ├─ [Eligibility Agent]
  │    verifies coverage
  │    emits eligibility.checked
  │
  ├─ [Coding Optimization Agent]  (subscribes: charge.created)
  │    assigns ICD-10, CPT, modifiers
  │    IF confidence ≥ 0.75: emits coding.recommended
  │    IF confidence < 0.75: emits coding.review_needed → FLOW 6
  │
  ├─ [Claim Construction Agent]  (subscribes: coding.recommended + eligibility.checked)
  │    WAITS for both events before proceeding
  │    assembles Claim + ClaimLines
  │    emits claim.created
  │
  ├─ [Claims Scrubbing Agent]  (subscribes: claim.created)
  │    runs scrub rules (Layer 6)
  │    IF clean: emits claim.scrubbed (status=clean)
  │    IF blocked: emits claim.blocked → FLOW 6
  │
  ├─ [Clearinghouse Submission Agent]  (subscribes: claim.scrubbed, status=clean)
  │    formats 837P
  │    submits to clearinghouse
  │    emits claim.submitted
  │    WAITS for clearinghouse response
  │    IF accepted: emits clearinghouse.accepted
  │    IF rejected: emits clearinghouse.rejected → FLOW 2
  │
  ├─ [... payer adjudication happens externally ...]
  │
  ├─ [Adjudication Interpretation Agent]  (subscribes: adjudication.received)
  │    parses ERA/835
  │    IF paid in full: emits payment.received
  │    IF partial: emits payment.received + denial.detected → FLOW 3
  │    IF denied: emits denial.detected → FLOW 3
  │
  ├─ [Payment Posting Agent]  (subscribes: payment.received)
  │    posts payment to claim
  │    creates FinancialEvent ledger entries
  │    emits payment.posted
  │    IF patient responsibility > 0: emits patient.balance.created → FLOW 5
  │
  ├─ [Underpayment Detection Agent]  (subscribes: payment.posted)
  │    compares to fee schedule / contract
  │    IF underpayment: emits underpayment.detected → FLOW 4
  │
  └─ [claim reaches financial closure]
       emits claim.financial.closed
       
ARTIFACTS: Charges, Claim, ClaimLines, ClaimScrubResult, ClearinghouseSubmission,
           AdjudicationResult, Payment, FinancialEvent, (optional: PatientBalance)
           
SUCCESS: Claim paid in full, patient balance resolved (if any), ≤ 0 human touches.
CYCLE TIME TARGET: ≤ 35 days (commercial), ≤ 45 days (government).
```

---

## Flow 2: Clearinghouse Rejection Path

**Claim rejected at the clearinghouse level (before reaching the payer).**

```
TRIGGER: clearinghouse.rejected
  │
  ├─ [Claims Scrubbing Agent]  (subscribes: clearinghouse.rejected)
  │    reads rejection code + message
  │    attempts auto-fix based on rejection reason
  │    
  │    IF auto_fixable AND retry_count < 3:
  │      apply fix
  │      re-run scrub
  │      IF clean: emits claim.scrubbed → back to Flow 1 (Clearinghouse Submission)
  │      
  │    ELSE:
  │      emits claim.blocked
  │      emits human.review.required (tier: 1, category: "clearinghouse_rejection")
  │
  └─ [Human reviews and fixes]
       corrects the issue
       claim re-enters scrubbing
       
COMMON REJECTION REASONS:
  - Invalid subscriber ID → verify coverage, re-check eligibility
  - Invalid NPI → correct provider NPI
  - Missing required field → populate from encounter/patient data
  - Duplicate claim → verify not a true duplicate; if not, add frequency code 7 (replacement)
  
STOP CONDITION: 3 failed resubmissions → permanent hold + human escalation (tier 2)
```

---

## Flow 3: Denial Path

**Claim adjudicated with full or partial denial.**

```
TRIGGER: denial.detected
  │
  ├─ [Denial Resolution Agent]  (subscribes: denial.detected)
  │    classifies denial using CARC/RARC codes (Layer 6 decision tree)
  │    
  │    BRANCH A — Auto-correctable (CARC 4, 16, 197):
  │      IF correction_data_available AND resubmission_count < 2:
  │        apply correction (add modifier, attach info, add auth number)
  │        create new claim version (frequency code 7)
  │        emits claim.created → back to Flow 1 (scrub + submit)
  │      ELSE:
  │        escalate to human
  │
  │    BRANCH B — Appealable (CARC 50, 96, medical necessity):
  │      emits denial.classified (resolution=appeal)
  │      [Appeals Generation Agent]
  │        IF recoverable_amount >= $75:
  │          generates AppealPacket (letter + supporting docs)
  │          IF recoverable_amount >= $500:
  │            emits human.review.required → human reviews appeal before submission
  │          ELSE:
  │            auto-submits appeal
  │          emits appeal.submitted
  │          WAITS for appeal outcome
  │          IF overturned: payment flows through Payment Posting
  │          IF upheld: 
  │            IF appeal_level < 3: escalate to next appeal level
  │            ELSE: write_off or external review
  │
  │    BRANCH C — Contractual adjustment (CARC 45, group CO):
  │      auto-apply contractual adjustment
  │      emit payment.posted (with adjustment)
  │      no human intervention needed
  │
  │    BRANCH D — Patient responsibility (group PR):
  │      emit patient.balance.created → Flow 5
  │
  │    BRANCH E — Unknown/complex:
  │      emit human.review.required (tier: 2)
  │
  └─ [Denial Resolution records BillingMemory]
       payer + CARC + outcome → memory for future claims

STOP CONDITION: 2 correction-resubmit cycles exhausted → human review
STOP CONDITION: 3 appeal levels exhausted → write-off review
```

---

## Flow 4: Underpayment Detection Path

```
TRIGGER: underpayment.detected
  │
  ├─ [Underpayment Detection Agent]
  │    already fired the event with expected vs. actual amounts
  │
  ├─ [Human Escalation Agent]  (subscribes: underpayment.detected)
  │    creates EscalationCase
  │    IF variance < $50: tier 1 (billing specialist)
  │    IF variance $50-$500: tier 1 with payer follow-up task
  │    IF variance > $500: tier 2 (compliance review — possible contract violation)
  │
  ├─ [Billing specialist reviews]
  │    options:
  │      a) Contact payer for reconsideration
  │      b) Accept as correct (update fee schedule expectation)
  │      c) File formal underpayment appeal
  │
  └─ [Resolution recorded in BillingMemory]
       payer + CPT + expected + actual + outcome

ARTIFACTS: EscalationCase, (optional: AppealPacket if formal appeal)
NOTE: Underpayments are often contract misunderstandings, not payer malice.
      The first step is always "are we reading the contract correctly?"
```

---

## Flow 5: Patient Balance and Collections Path

```
TRIGGER: patient.balance.created
  │
  ├─ [Patient Billing Agent]  (subscribes: patient.balance.created)
  │    
  │    Step 1: Check volunteer offset eligibility (Art. VII)
  │      IF patient.volunteerHoursThisQuarter >= 10:
  │        apply volunteer discount per organization policy
  │        IF remaining balance == 0: emit claim.financial.closed
  │
  │    Step 2: Generate statement
  │      create PatientStatement
  │      emit patient.statement.issued
  │      schedule reminder cadence (14d, 30d, 45d)
  │
  │    Step 3: Reminder loop (timer-driven, not event-driven)
  │      AT day 14: send reminder 1 (email + portal)
  │      AT day 30: send reminder 2 (email + SMS if opted in)
  │      AT day 45: send final reminder (all channels)
  │      AT day 60: offer payment plan
  │
  │    AT ANY POINT: patient.payment.received
  │      [Payment Posting Agent] posts payment
  │      IF balance == 0: emit claim.financial.closed
  │      IF balance > 0: continue cadence
  │
  │    Step 4: Collections escalation (day 90+)
  │      IF balance > $100 AND payments_made == 0 AND reminders_sent >= 3:
  │        emit account.collections.escalated
  │        [Human Escalation Agent] creates tier 1 escalation
  │        human decides: payment plan, hardship write-off, external collections, or continue trying
  │
  └─ Voice: uses "Billing Coordinator" persona from persona.ts
       firm but never threatening, empathetic about cost

STOP CONDITION: balance paid, payment plan active, written off, or sent to collections
```

---

## Flow 6: Human Review Path

```
TRIGGER: human.review.required
  │
  ├─ [Human Escalation Agent]  (subscribes: human.review.required)
  │    creates EscalationCase with:
  │      - tier (from event payload)
  │      - category (coding_uncertainty, high_dollar, compliance_risk, etc.)
  │      - summary (agent-generated explanation)
  │      - suggestedAction (what the agent would have done if confident)
  │      - link to claim/patient
  │
  │    routes to appropriate user based on tier:
  │      Tier 1 → billing specialist
  │      Tier 2 → compliance officer or senior biller
  │      Tier 3 → practice owner
  │
  ├─ [Human reviews in Mission Control or Approvals inbox]
  │    options:
  │      a) Approve agent's suggestion → proceed with suggested action
  │      b) Modify → apply human's version instead
  │      c) Override → take a different action entirely
  │      d) Dismiss → no action needed (false alarm)
  │
  ├─ [Feedback captured]
  │    action taken + any correction → AgentFeedback record
  │    correction feeds back to originating agent's learning
  │    IF coding correction: update provider coding pattern memory
  │    IF payer-related: update payer memory
  │
  └─ [Claim re-enters the appropriate flow]
       coding.approved → Flow 1 continues
       write_off.approved → claim.financial.closed
       appeal.approved → Flow 3 continues

SLA:
  Tier 1: resolved within 1 business day
  Tier 2: resolved within 2 business days
  Tier 3: resolved within 5 business days
  Overdue escalations surface in Mission Control with increasing urgency indicators.
```

---

*These are the six flows. Every claim follows one or more of them.
The clean claim path is the target — the other five are exception
handlers. The fleet's job is to keep as many claims as possible on
Flow 1 and resolve exceptions as quickly and cheaply as possible
on Flows 2-6.*

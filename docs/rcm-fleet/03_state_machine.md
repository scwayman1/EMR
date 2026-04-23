# Layer 3 — State Machine

> The legal state transitions. Agents do not invent flows — they move
> objects across approved states. If a transition isn't in this document,
> it doesn't happen.

---

## 1. Claim Lifecycle (primary path)

This is the backbone of the entire fleet. Every claim follows this
state machine. Branches are enumerated below.

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    CLAIM LIFECYCLE                       │
                    └─────────────────────────────────────────────────────────┘

  encounter.completed
        │
        ▼
  ┌──────────┐     coding.recommended     ┌──────────┐     claim.created     ┌──────────────┐
  │  CODING  │ ──────────────────────────► │  CODED   │ ───────────────────► │ CLAIM_CREATED │
  │ PENDING  │                             │          │                      │               │
  └──────────┘                             └──────────┘                      └───────┬───────┘
       │                                        │                                    │
       │ confidence < 0.75                      │ provider override                  │
       ▼                                        ▼                                    ▼
  ┌──────────┐                            ┌──────────┐                       ┌──────────────┐
  │  CODING  │                            │  CODING  │                       │  SCRUBBING   │
  │  REVIEW  │ ──── approved ────────────►│  CODED   │                       │              │
  └──────────┘                            └──────────┘                       └───────┬───────┘
                                                                                     │
                                                         ┌───────────────────────────┼──────────────┐
                                                         │ clean                     │ warnings     │ blocked
                                                         ▼                           ▼              ▼
                                                  ┌──────────────┐           ┌─────────────┐  ┌──────────┐
                                                  │   READY TO   │           │   WARNINGS  │  │ BLOCKED  │
                                                  │    SUBMIT    │           │   (review)  │  │ (fix it) │
                                                  └──────┬───────┘           └──────┬──────┘  └────┬─────┘
                                                         │                          │ approved      │ fixed
                                                         │                          ▼              ▼
                                                         │◄─────────────────────────┘◄─────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  SUBMITTED   │
                                                  └──────┬───────┘
                                                         │
                                           ┌─────────────┼─────────────┐
                                           │             │             │
                                           ▼             ▼             ▼
                                    ┌────────────┐ ┌──────────┐ ┌──────────────┐
                                    │ CH_REJECTED│ │ ACCEPTED │ │  CH_PENDING  │
                                    │(clearinghs)│ │ (by payer│ │  (waiting)   │
                                    └─────┬──────┘ └────┬─────┘ └──────┬───────┘
                                          │             │              │ timeout
                                          │ auto-fix    │              ▼
                                          ▼             │        ┌──────────┐
                                    ┌──────────┐        │        │ STALE    │
                                    │ RESUBMIT │        │        │ (follow  │
                                    │ OR ESCAL │        │        │  up)     │
                                    └──────────┘        │        └──────────┘
                                                        │
                                                        ▼
                                                 ┌──────────────┐
                                                 │ ADJUDICATED  │
                                                 └──────┬───────┘
                                                        │
                                          ┌─────────────┼──────────────┐
                                          │             │              │
                                          ▼             ▼              ▼
                                   ┌───────────┐ ┌───────────┐ ┌───────────┐
                                   │   PAID    │ │  PARTIAL  │ │  DENIED   │
                                   │  IN FULL  │ │   PAID    │ │           │
                                   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
                                         │             │              │
                                         │             ▼              ▼
                                         │      ┌───────────┐  ┌───────────┐
                                         │      │UNDERPAY   │  │  DENIAL   │
                                         │      │DETECTION  │  │  MGMT     │
                                         │      └─────┬─────┘  └─────┬─────┘
                                         │            │              │
                                         ▼            ▼              ▼
                                  ┌─────────────────────────────────────────┐
                                  │          PAYMENT POSTED                 │
                                  └──────────────┬──────────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────────────────┐
                                  │     PATIENT RESPONSIBILITY              │
                                  │  (if copay/deductible/coinsurance)      │
                                  └──────────────┬──────────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────────────────┐
                                  │         FINANCIAL CLOSURE               │
                                  │  (paid_in_full | written_off |          │
                                  │   patient_on_plan | collections |       │
                                  │   voided | adjusted)                    │
                                  └─────────────────────────────────────────┘
```

---

## 2. State Definitions

| State | Prisma `ClaimStatus` | Meaning | Owner |
|---|---|---|---|
| `coding_pending` | — (pre-claim) | Encounter completed, awaiting code assignment | Coding Optimization Agent |
| `coding_review` | — (pre-claim) | Codes need human verification (low confidence) | Human coder |
| `coded` | — (pre-claim) | Codes assigned and approved | — |
| `draft` | `draft` | Claim constructed, not yet scrubbed | Claim Construction Agent |
| `scrubbing` | `draft` | Claim being validated | Claims Scrubbing Agent |
| `scrub_blocked` | `draft` | Scrub found blocking issues; claim held | Claims Scrubbing Agent |
| `ready_to_submit` | `draft` | Scrub passed; awaiting submission | — |
| `submitted` | `submitted` | Sent to clearinghouse | Clearinghouse Submission Agent |
| `ch_rejected` | `submitted` | Clearinghouse returned rejection | Clearinghouse Submission Agent |
| `ch_pending` | `submitted` | Clearinghouse accepted; awaiting payer | — |
| `accepted` | `pending` | Payer acknowledged receipt | — |
| `adjudicated` | `pending` | Payer made a decision (ERA received) | Adjudication Interpretation Agent |
| `paid` | `paid` | Payer paid (full or partial) | Payment Posting Agent |
| `denied` | `denied` | Payer denied (full or line-level) | Denial Resolution Agent |
| `partial` | `partial` | Some lines paid, some denied | Denial Resolution + Payment Posting |
| `appealed` | `denied` | Appeal submitted, awaiting outcome | Appeals Generation Agent |
| `closed` | `closed` | Financial closure reached | — |
| `voided` | `voided` | Claim voided (error/duplicate) | Human |

---

## 3. Allowed Transitions

Each row is a legal transition. Any transition not in this table is **invalid** and should be rejected by the orchestration layer.

| From | To | Trigger | Agent |
|---|---|---|---|
| `coding_pending` | `coded` | `coding.recommended` (confidence ≥ 0.75) | Coding Optimization |
| `coding_pending` | `coding_review` | `coding.recommended` (confidence < 0.75) | Coding Optimization |
| `coding_review` | `coded` | `coding.approved` (human) | Human |
| `coded` | `draft` | `claim.created` | Claim Construction |
| `draft` | `scrubbing` | internal (auto on create) | Claims Scrubbing |
| `scrubbing` | `ready_to_submit` | `claim.scrubbed` (clean) | Claims Scrubbing |
| `scrubbing` | `scrub_blocked` | `claim.blocked` | Claims Scrubbing |
| `scrub_blocked` | `scrubbing` | edits applied, re-scrub | Claims Scrubbing or Human |
| `ready_to_submit` | `submitted` | `claim.submitted` | Clearinghouse Submission |
| `submitted` | `ch_rejected` | `clearinghouse.rejected` | Clearinghouse Submission |
| `submitted` | `accepted` | `payer.accepted` | Clearinghouse Submission |
| `ch_rejected` | `submitted` | auto-fix + resubmit | Claims Scrubbing |
| `ch_rejected` | `scrub_blocked` | cannot auto-fix | Claims Scrubbing |
| `accepted` | `adjudicated` | `adjudication.received` | Adjudication Interpretation |
| `adjudicated` | `paid` | `payment.posted` (full) | Payment Posting |
| `adjudicated` | `partial` | `payment.posted` (partial) | Payment Posting |
| `adjudicated` | `denied` | `denial.detected` | Denial Resolution |
| `denied` | `appealed` | `appeal.submitted` | Appeals Generation |
| `denied` | `draft` | corrected + resubmitted | Denial Resolution |
| `denied` | `closed` | written off (approved) | Human |
| `appealed` | `paid` | appeal overturned + payment | Payment Posting |
| `appealed` | `denied` | appeal upheld | Denial Resolution |
| `partial` | `paid` | underpayment recovered | Underpayment Detection |
| `partial` | `closed` | remaining written off | Human |
| `paid` | `closed` | patient responsibility resolved | Patient Responsibility |
| any | `voided` | void requested (human only) | Human |

---

## 4. Denial Sub-State Machine

Denials have their own internal lifecycle:

```
denial.detected
      │
      ▼
┌─────────────┐
│  CLASSIFY   │  ← Denial Resolution Agent
└──────┬──────┘
       │
  ┌────┼────────────┬───────────────┐
  │    │            │               │
  ▼    ▼            ▼               ▼
┌────┐┌──────┐ ┌─────────┐  ┌──────────┐
│FIX ││APPEAL│ │WRITE_OFF│  │ESCALATE  │
│&RE-││      │ │(if <$25)│  │(if novel │
│SUB ││      │ │         │  │ or risky)│
└──┬─┘└──┬───┘ └────┬────┘  └────┬─────┘
   │     │          │             │
   ▼     ▼          ▼             ▼
  resubmit   appeal.submitted  closed   human review
```

**Classification rules:**

| CARC Code | Group | Likely Action | Auto-eligible? |
|---|---|---|---|
| 4 (modifier) | CO | Fix modifier + resubmit | Yes |
| 16 (missing info) | CO | Attach info + resubmit | Yes if info available |
| 18 (duplicate) | CO | Verify not duplicate; void or appeal | No — human review |
| 29 (timely filing) | CO | Check dates; appeal if within window | Conditional |
| 45 (exceeds fee schedule) | CO | Contractual adjustment | Auto-adjust |
| 50 (not medically necessary) | CO | Appeal with documentation | Yes if docs support |
| 96 (non-covered) | PR | Patient responsibility | Auto if COB checked |
| 97 (payment included in another) | CO | Check bundling; resubmit if error | Conditional |
| 197 (precertification) | CO | Attach auth number + resubmit | Yes if auth exists |

---

## 5. Patient Financial Sub-State Machine

After payer adjudication, patient responsibility follows this path:

```
patient.balance.created
         │
         ▼
  ┌──────────────┐
  │  BALANCE     │ ← amount, source (copay/deductible/coinsurance/denied)
  │  CREATED     │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐     ┌──────────────┐
  │  STATEMENT   │────►│  REMINDER 1  │ (14 days after statement)
  │  ISSUED      │     │              │
  └──────────────┘     └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  REMINDER 2  │ (30 days)
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  REMINDER 3  │ (45 days — final)
                       └──────┬───────┘
                              │
                   ┌──────────┼──────────┐
                   │          │          │
                   ▼          ▼          ▼
            ┌───────────┐ ┌────────┐ ┌────────────┐
            │  PAYMENT  │ │PAYMENT │ │ COLLECTIONS│
            │  RECEIVED │ │ PLAN   │ │ ESCALATION │
            └─────┬─────┘ └───┬────┘ └─────┬──────┘
                  │           │             │
                  ▼           ▼             ▼
            ┌─────────────────────────────────────┐
            │          FINANCIAL CLOSURE           │
            └─────────────────────────────────────┘
```

**Patient collection cadence:**

| Day | Action | Channel |
|---|---|---|
| 0 | Statement generated | Portal + email |
| 14 | Reminder 1 | Email + portal notification |
| 30 | Reminder 2 | Email + SMS (if opted in) |
| 45 | Final reminder | Email + SMS + portal |
| 60 | Payment plan offer | Email with link |
| 90 | Collections escalation review | Human decision |

**Volunteer offset (Constitution Art. VII):** Patients who have completed their quarterly volunteer hours may be eligible for a balance reduction or the option to donate the equivalent to a registered charity. This is checked at the BALANCE_CREATED state before the first statement is issued.

---

## 6. Resubmission Loop Guard

To prevent infinite loops, the state machine enforces:

| Rule | Limit |
|---|---|
| Max clearinghouse resubmissions per claim | 3 |
| Max denial-correct-resubmit cycles | 2 |
| Max appeal levels | 3 (first, second, external review) |
| Max patient reminders | 3 (then human review) |
| Stale claim timeout (no payer response) | 45 days → follow-up task |
| Timely filing hard stop | If < 30 days remaining on filing deadline, escalate to human |

---

*This is the state machine layer. Agents in Layer 5 are "state
transition specialists" — their job is to evaluate the current state,
determine the correct next state from this table, and execute the
transition. Any transition not in Section 3 is a bug.*

# Layer 4 — Event Contracts

> The nervous system. Agents don't "run" — they wake up on events.
> Every event in this layer has a producer, consumers, payload, and
> idempotency contract. If an event isn't here, no agent should react
> to it.
>
> **Existing events** (already in `src/lib/orchestration/events.ts`)
> are marked with ✓. New events marked with ✦.

---

## Event Index

| # | Event | Status | Producer | Primary Consumer |
|---|---|---|---|---|
| 1 | `encounter.completed` | ✓ exists | Encounter page | Encounter Intelligence |
| 2 | `encounter.documentation.updated` | ✦ new | Note editor | Coding Optimization |
| 3 | `eligibility.checked` | ✦ new | Eligibility Agent | Claim Construction |
| 4 | `eligibility.failed` | ✦ new | Eligibility Agent | Human Escalation |
| 5 | `prior_auth.required` | ✦ new | Eligibility Agent | Prior Auth Agent |
| 6 | `prior_auth.obtained` | ✦ new | Prior Auth Agent | Claim Construction |
| 7 | `coding.recommended` | ✦ new | Coding Optimization | Claim Construction |
| 8 | `coding.review_needed` | ✦ new | Coding Optimization | Human Escalation |
| 9 | `coding.approved` | ✦ new | Human (coder) | Claim Construction |
| 10 | `charge.created` | ✦ new | Encounter Intelligence | Coding Optimization |
| 11 | `claim.created` | ✓ exists | Claim Construction | Claims Scrubbing |
| 12 | `claim.scrubbed` | ✦ new | Claims Scrubbing | Clearinghouse Submission |
| 13 | `claim.blocked` | ✦ new | Claims Scrubbing | Human Escalation |
| 14 | `claim.submitted` | ✦ new | Clearinghouse Submission | (wait for response) |
| 15 | `clearinghouse.accepted` | ✦ new | Clearinghouse Submission | (wait for adjudication) |
| 16 | `clearinghouse.rejected` | ✦ new | Clearinghouse Submission | Claims Scrubbing |
| 17 | `payer.accepted` | ✦ new | Clearinghouse poller | (tracking only) |
| 18 | `adjudication.received` | ✦ new | ERA ingest | Adjudication Interpretation |
| 19 | `denial.detected` | ✓ exists | Adjudication Interpretation | Denial Resolution |
| 20 | `denial.classified` | ✦ new | Denial Resolution | Appeals Gen / Claim Construction |
| 21 | `appeal.generated` | ✦ new | Appeals Generation | Human Review (if $>500) |
| 22 | `appeal.submitted` | ✦ new | Appeals Generation | (wait for outcome) |
| 23 | `appeal.outcome.received` | ✦ new | ERA ingest / manual | Payment Posting / Denial Resolution |
| 24 | `payment.received` | ✓ exists | ERA ingest / manual | Payment Posting |
| 25 | `payment.posted` | ✦ new | Payment Posting | Underpayment Detection |
| 26 | `underpayment.detected` | ✓ exists | Underpayment Detection | Human Escalation |
| 27 | `patient.balance.created` | ✦ new | Patient Responsibility | Patient Billing |
| 28 | `patient.statement.issued` | ✦ new | Patient Billing | (cadence timer) |
| 29 | `patient.payment.received` | ✦ new | Payment page / manual | Payment Posting |
| 30 | `account.collections.escalated` | ✦ new | Patient Billing | Human Escalation |
| 31 | `claim.financial.closed` | ✦ new | Any closing agent | Revenue Intelligence |
| 32 | `human.review.required` | ✦ new | Any agent | Human Escalation |
| 33 | `compliance.flag.raised` | ✦ new | Compliance Agent | Human Escalation |
| 34 | `write_off.requested` | ✦ new | Any agent | Human (approval tier) |

---

## Event Specifications

### 1. encounter.completed ✓
```typescript
{
  name: "encounter.completed";
  encounterId: string;
  patientId: string;
  completedAt: Date;
}
```
**Producer:** Encounter page (on note finalization or encounter close)
**Consumers:** Encounter Intelligence Agent, Patient Outreach Agent
**Idempotency:** Safe to re-process. Agent checks if charges already exist for this encounter.
**Already in events.ts.** No changes needed.

### 2. encounter.documentation.updated ✦
```typescript
{
  name: "encounter.documentation.updated";
  encounterId: string;
  noteId: string;
  patientId: string;
}
```
**Producer:** Note editor (on save or finalize)
**Consumers:** Coding Optimization Agent (re-evaluates codes when docs change)
**Idempotency:** Agent re-runs coding; latest result supersedes prior.

### 3. eligibility.checked ✦
```typescript
{
  name: "eligibility.checked";
  patientId: string;
  coverageId: string;
  snapshotId: string;
  eligible: boolean;
  networkStatus: "in_network" | "out_of_network" | "unknown";
  priorAuthRequired: boolean;
}
```
**Producer:** Eligibility Agent
**Consumers:** Claim Construction Agent, Prior Auth Agent (if priorAuthRequired)
**Idempotency:** Snapshot is immutable once created. Re-check creates a new snapshot.

### 4. coding.recommended ✦
```typescript
{
  name: "coding.recommended";
  encounterId: string;
  patientId: string;
  charges: Array<{
    cptCode: string;
    modifiers: string[];
    icd10Codes: string[];
    confidence: number;
    chargeId: string;
  }>;
  overallConfidence: number;
  requiresReview: boolean;
}
```
**Producer:** Coding Optimization Agent
**Consumers:** Claim Construction Agent (if confidence ≥ 0.75), Human Escalation (if requiresReview)
**Idempotency:** New recommendation supersedes prior for the same encounter. Agent checks if claim already exists.

### 5. claim.created ✓
```typescript
{
  name: "claim.created";
  claimId: string;
  organizationId: string;
  patientId: string;
}
```
**Producer:** Claim Construction Agent
**Consumers:** Claims Scrubbing Agent
**Idempotency:** Scrub agent checks if a scrub result already exists for this claim version.
**Already in events.ts.** No payload changes needed.

### 6. claim.scrubbed ✦
```typescript
{
  name: "claim.scrubbed";
  claimId: string;
  organizationId: string;
  status: "clean" | "warnings" | "blocked";
  editCount: number;
  scrubResultId: string;
}
```
**Producer:** Claims Scrubbing Agent
**Consumers:** Clearinghouse Submission Agent (if clean/warnings-approved), Human Escalation (if blocked)
**Idempotency:** Scrub result is append-only. Multiple scrubs per claim are normal (after corrections).

### 7. clearinghouse.rejected ✦
```typescript
{
  name: "clearinghouse.rejected";
  claimId: string;
  submissionId: string;
  rejectionCode: string;
  rejectionMessage: string;
  retryEligible: boolean;
}
```
**Producer:** Clearinghouse Submission Agent (parsing clearinghouse response)
**Consumers:** Claims Scrubbing Agent (for auto-fix attempt), Human Escalation (if not retryEligible)
**Idempotency:** Each rejection is a distinct event. Agent checks retry count before acting.

### 8. adjudication.received ✦
```typescript
{
  name: "adjudication.received";
  claimId: string;
  organizationId: string;
  adjudicationResultId: string;
  claimStatus: "paid" | "denied" | "partial";
  totalPaid: number;
  totalDenied: number;
  totalPatientResponsibility: number;
}
```
**Producer:** ERA ingest service (835 parser)
**Consumers:** Adjudication Interpretation Agent → routes to Payment Posting / Denial Resolution
**Idempotency:** Adjudication result is immutable. Duplicate ERA lines are detected by check number + claim number.

### 9. denial.detected ✓
```typescript
{
  name: "denial.detected";
  claimId: string;
  denialEventId: string;
  carcCode: string;
  groupCode: string;
  amountDenied: number;
  organizationId: string;
}
```
**Producer:** Adjudication Interpretation Agent
**Consumers:** Denial Resolution Agent
**Idempotency:** Denial events are append-only. Agent checks if this specific CARC+claim combination already has an active resolution.
**Already in events.ts (partially).** Payload needs expansion.

### 10. payment.posted ✦
```typescript
{
  name: "payment.posted";
  claimId: string;
  paymentId: string;
  amount: number;
  source: "payer" | "patient";
  organizationId: string;
  remainingBalance: number;
}
```
**Producer:** Payment Posting Agent
**Consumers:** Underpayment Detection Agent (if source=payer), Patient Responsibility Agent (to calculate remaining), Revenue Intelligence Agent
**Idempotency:** Payment posting is idempotent by paymentId. Double-posting is prevented at the DB level.

### 11. patient.balance.created ✦
```typescript
{
  name: "patient.balance.created";
  patientId: string;
  claimId: string;
  amount: number;
  source: "copay" | "deductible" | "coinsurance" | "denied_service" | "non_covered";
  organizationId: string;
}
```
**Producer:** Patient Responsibility Agent
**Consumers:** Patient Billing Agent
**Idempotency:** One balance event per claim. Agent checks if a balance already exists for this claim before creating.

### 12. human.review.required ✦
```typescript
{
  name: "human.review.required";
  sourceAgent: string;
  category: "coding_uncertainty" | "high_dollar" | "compliance_risk" | "novel_situation" | "policy_conflict" | "write_off_approval";
  claimId?: string;
  patientId?: string;
  summary: string;
  suggestedAction: string;
  tier: 1 | 2 | 3;
  organizationId: string;
}
```
**Producer:** Any agent in the fleet
**Consumers:** Human Escalation Agent → creates EscalationCase and routes to appropriate user
**Idempotency:** De-duplicated by sourceAgent + claimId + category within a 24-hour window.

### 13. compliance.flag.raised ✦
```typescript
{
  name: "compliance.flag.raised";
  claimId: string;
  flagType: "upcoding_risk" | "unbundling_risk" | "modifier_abuse" | "frequency_anomaly" | "documentation_gap";
  severity: "warning" | "block";
  detail: string;
  organizationId: string;
}
```
**Producer:** Compliance Agent
**Consumers:** Human Escalation Agent, Claims Scrubbing Agent (if block)
**Idempotency:** One flag per type per claim. Agent checks existing flags before creating.

### 14. claim.financial.closed ✦
```typescript
{
  name: "claim.financial.closed";
  claimId: string;
  closureType: "paid_in_full" | "written_off" | "patient_on_plan" | "collections" | "voided" | "adjusted";
  totalCollected: number;
  totalWrittenOff: number;
  daysCycleTime: number;
  humanTouches: number;
  organizationId: string;
}
```
**Producer:** Any agent that reaches a terminal state on a claim
**Consumers:** Revenue Intelligence Agent (for KPI tracking + learning)
**Idempotency:** One closure event per claim. Prevents double-counting in revenue metrics.

---

## Event Bus Rules

| Rule | Detail |
|---|---|
| **Delivery** | At-least-once. Consumers must be idempotent. |
| **Ordering** | Events for the same claim are processed in order (partitioned by claimId). |
| **Retry** | Failed event processing retries up to 3 times with exponential backoff (2s, 4s, 8s). |
| **Dead letter** | After 3 failures, event goes to dead-letter queue and creates a human.review.required event. |
| **Audit** | Every event is logged to AuditLog with the full payload. PHI fields are logged by reference (patientId), not by value (no names in event payloads). |
| **TTL** | Events are retained for 7 years (HIPAA retention minimum for billing records). |

---

*This is the event layer. Every agent in Layer 5 will be defined by
which events it subscribes to and which events it emits. If an agent
can't point to an event in this document, it doesn't have a job.*

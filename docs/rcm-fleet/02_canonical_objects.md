# Layer 2 — Canonical Objects

> The nouns of the revenue cycle. Every agent reasons about state
> transitions on these objects. If it's not in this layer, agents
> have no business inventing it.
>
> **Existing Prisma models noted where applicable.** Fields marked
> with ✦ are new (not yet in schema.prisma). Fields unmarked already
> exist or map directly to existing columns.

---

## Object Index

| # | Object | Prisma Model | Status |
|---|---|---|---|
| 1 | Patient | `Patient` | Exists |
| 2 | Coverage | `PatientCoverage` | Exists |
| 3 | Eligibility Snapshot | ✦ `EligibilitySnapshot` | **New** |
| 4 | Encounter | `Encounter` | Exists |
| 5 | Diagnosis | ✦ embedded in Claim/Note | Partial — needs extraction |
| 6 | Procedure | ✦ embedded in ClaimLine | Partial — needs extraction |
| 7 | Charge | ✦ `Charge` | **New** |
| 8 | Claim | `Claim` | Exists — needs expansion |
| 9 | Claim Line | `ClaimLine` | Exists — needs expansion |
| 10 | Claim Edit / Scrub Result | ✦ `ClaimScrubResult` | **New** |
| 11 | Clearinghouse Submission | ✦ `ClearinghouseSubmission` | **New** |
| 12 | Adjudication Result | ✦ `AdjudicationResult` | **New** |
| 13 | Denial Event | ✦ `DenialEvent` | **New** (currently inline in Claim) |
| 14 | Appeal Packet | ✦ `AppealPacket` | **New** |
| 15 | Payment | `Payment` | Exists |
| 16 | Adjustment | ✦ `Adjustment` | **New** (contractual, write-off, etc.) |
| 17 | Patient Statement | `Statement` | Exists |
| 18 | Ledger Entry | `FinancialEvent` | Exists — rename semantically |
| 19 | Work Queue Task | `Task` + `AgentJob` | Exists — extend |
| 20 | Escalation Case | ✦ `EscalationCase` | **New** |
| 21 | Agent Decision Log | `AgentReasoning` + `AuditLog` | Exists |

---

## Object Specifications

### 1. Patient
**Prisma model:** `Patient` (exists)
**Purpose:** The person receiving care. Financial anchor for all claims, balances, and statements.
**Key fields:** `id`, `firstName`, `lastName`, `dateOfBirth`, `organizationId`, `status`
**Lifecycle:** prospect → active → inactive → archived
**Relationships:** has many Coverages, Encounters, Claims, Statements, PaymentPlans
**RCM-specific needs:** No new fields needed. Patient is the join point, not the billing object.

### 2. Coverage / Insurance Policy
**Prisma model:** `PatientCoverage` (exists)
**Purpose:** A patient's insurance relationship. One patient may have multiple (primary, secondary, tertiary).
**Key fields:** `payerName`, `payerId`, `memberId`, `groupNumber`, `planType`, `copayAmount`, `deductibleAmount`, `deductibleMet`, `coinsurancePercent`, `coordinationOrder` (primary/secondary/tertiary), `effectiveDate`, `terminationDate`, `active`
**✦ New fields needed:** `payerId` (standardized payer identifier for EDI), `coordinationOrder`, `planType` (HMO/PPO/EPO/POS/Medicare/Medicaid/Workers Comp), `priorAuthPhone`, `claimsAddress`
**Lifecycle:** active → terminated → replaced
**Relationships:** belongs to Patient, referenced by Claims and EligibilitySnapshots

### 3. Eligibility Snapshot ✦
**Prisma model:** **New** — `EligibilitySnapshot`
**Purpose:** A point-in-time record of a patient's verified eligibility and benefits. Cached to avoid redundant 270/271 calls.
**Key fields:**
- `id`, `patientId`, `coverageId`
- `checkedAt` — when the check was performed
- `eligible` — boolean
- `planStatus` — active/termed/pending
- `copayAmount`, `deductibleRemaining`, `oopRemaining`, `coinsurancePercent`
- `priorAuthRequired` — boolean for the planned service
- `referralRequired` — boolean
- `networkStatus` — in-network / out-of-network / unknown
- `rawResponse` — JSON blob of the full 271 response for audit
- `expiresAt` — when this snapshot is considered stale (default: 24 hours)

**Lifecycle:** created → valid → expired
**Relationships:** belongs to Patient + Coverage
**Audit:** raw 271 response always preserved. Never modified after creation.

### 4. Encounter
**Prisma model:** `Encounter` (exists)
**Purpose:** A clinical visit. The event that generates billable charges.
**Key fields:** `id`, `patientId`, `providerId`, `organizationId`, `modality` (in-person/video/phone), `status`, `scheduledFor`, `startedAt`, `completedAt`, `placeOfService`
**✦ New fields needed:** `placeOfService` (2-digit POS code: 11=office, 02=telehealth, etc.), `renderingProviderId` (if different from scheduling provider), `referringProviderId`
**Lifecycle:** requested → confirmed → in_progress → complete → billed
**Relationships:** has many Notes, generates Charges, belongs to Patient + Provider

### 5. Diagnosis
**Currently:** embedded as JSON in Note blocks and Claim
**Purpose:** An ICD-10-CM code assigned to a patient encounter. The "why" of the claim.
**Key fields:**
- `code` — ICD-10-CM (e.g., "F17.210", "G89.29", "R51.9")
- `description` — human-readable label
- `sequence` — pointer order (1 = primary, 2+ = secondary)
- `supportedBy` — reference to the documentation element that justifies it
- `addedBy` — "agent:codingOptimization" or user id
- `confidence` — 0-1 (agent-assigned)

**Note:** For V1, diagnoses remain embedded in the Claim JSON rather than a separate table. The Coding Optimization Agent operates on them as structured sub-objects within the claim payload. Extraction to a first-class model is a Phase 6 optimization.

### 6. Procedure
**Currently:** embedded as CPT/HCPCS in ClaimLine
**Purpose:** A billable service performed. The "what" of the claim.
**Key fields:**
- `code` — CPT or HCPCS (e.g., "99214", "36415", "G0108")
- `description`
- `modifiers` — array of modifier codes (e.g., ["25", "XE"])
- `units` — quantity (usually 1 for E/M, may be >1 for injections, time-based)
- `chargeAmount` — from fee schedule
- `sequence`

**Same embedding note as Diagnosis.** Lives inside ClaimLine for V1.

### 7. Charge ✦
**Prisma model:** **New** — `Charge`
**Purpose:** The bridge between a clinical encounter and a claim. A charge is created when a billable event occurs. Multiple charges may come from one encounter (E/M + procedure + lab draw).
**Key fields:**
- `id`, `encounterId`, `patientId`, `organizationId`
- `cptCode`, `cptDescription`
- `modifiers` — string array
- `units`
- `icd10Codes` — array of linked diagnosis codes
- `feeScheduleAmount` — from FeeScheduleEntry
- `status` — pending → claim_attached → voided
- `claimLineId` — nullable, set when attached to a claim
- `createdBy` — agent or user
- `confidence` — coding confidence (0-1)

**Lifecycle:** pending → claim_attached → voided
**Relationships:** belongs to Encounter, feeds into ClaimLine, references FeeScheduleEntry

### 8. Claim
**Prisma model:** `Claim` (exists — needs expansion)
**Purpose:** The formal request for payment submitted to a payer. Professional claim (837P / CMS-1500).
**Existing fields:** `id`, `patientId`, `providerId`, `organizationId`, `payerName`, `claimNumber`, `status`, `totalCharges`, `totalAllowed`, `totalPaid`, `denialReason`, `deniedAt`, `submittedAt`, `paidAt`
**✦ New fields needed:**
- `payerId` — standardized EDI payer ID
- `billingNpi` — billing provider NPI
- `renderingNpi` — rendering provider NPI (may differ)
- `placeOfService` — 2-digit POS code
- `frequencyCode` — original (1), replacement (7), void (8)
- `priorAuthNumber` — if applicable
- `secondaryPayerId` — for coordination of benefits
- `clearinghouseSubmissionId` — FK to ClearinghouseSubmission
- `adjudicationResultId` — FK to AdjudicationResult
- `timelyFilingDeadline` — computed from payer rules

**Lifecycle:** See Layer 3 (State Machine) for full lifecycle.
**Relationships:** has many ClaimLines, belongs to Patient + Provider + Coverage, has one AdjudicationResult, may have many DenialEvents and AppealPackets

### 9. Claim Line
**Prisma model:** `ClaimLine` (exists — needs expansion)
**Purpose:** A single service line on a claim. One claim has 1-N lines.
**Existing fields:** `id`, `claimId`, `sequence`, `cptCode`, `icdPointers`, `modifiers`, `units`, `chargeAmount`, `allowedAmount`, `paidAmount`, `adjustmentAmount`, `status`
**✦ New fields needed:**
- `denialCarcCode` — CARC code if this line was denied (e.g., "16", "4", "197")
- `denialRarcCode` — RARC code for supplemental info
- `denialGroupCode` — CO/PR/OA/PI
- `placeOfService` — line-level POS override
- `renderingNpi` — line-level rendering provider

**Lifecycle:** mirrors parent Claim lifecycle at the line level
**Relationships:** belongs to Claim, maps 1:1 to a Charge

### 10. Claim Scrub Result ✦
**Prisma model:** **New** — `ClaimScrubResult`
**Purpose:** The output of the Claims Scrubbing Agent. Records every edit, warning, and block found during pre-submission validation.
**Key fields:**
- `id`, `claimId`
- `scrubVersion` — agent version that performed the scrub
- `status` — clean / warnings / blocked
- `edits` — JSON array of `{ ruleId, severity, message, lineSequence, autoFixApplied }`
- `ncciConflicts` — JSON array of detected NCCI edit pairs
- `modifierWarnings` — JSON array
- `missingFields` — JSON array
- `scrubbedAt`

**Lifecycle:** one per scrub attempt. A claim may have multiple if re-scrubbed after corrections.
**Relationships:** belongs to Claim

### 11. Clearinghouse Submission ✦
**Prisma model:** **New** — `ClearinghouseSubmission`
**Purpose:** Tracks the EDI submission of a claim to a clearinghouse and the clearinghouse's response.
**Key fields:**
- `id`, `claimId`, `organizationId`
- `clearinghouseName` — e.g., "Availity", "Trizetto", "Waystar"
- `submittedAt`
- `ediPayload` — the 837P payload (stored for audit, not displayed)
- `responseStatus` — accepted / rejected / pending
- `responseCode` — clearinghouse-specific status code
- `responseMessage` — human-readable rejection reason if applicable
- `respondedAt`
- `retryCount`

**Lifecycle:** submitted → accepted | rejected → (retry if rejected)
**Relationships:** belongs to Claim

### 12. Adjudication Result ✦
**Prisma model:** **New** — `AdjudicationResult`
**Purpose:** The payer's decision on a claim. Parsed from the 835/ERA.
**Key fields:**
- `id`, `claimId`
- `eraDate` — date the ERA was received
- `checkNumber` — payer payment reference
- `totalPaid`, `totalAllowed`, `totalAdjusted`, `totalPatientResponsibility`
- `claimStatus` — paid / denied / partial / pending
- `lineDetails` — JSON array: per-line paid, allowed, adjustments, CARC/RARC codes
- `rawEra` — full 835 segment for audit
- `parsedAt`

**Lifecycle:** received → parsed → posted (after Payment Posting Agent processes it)
**Relationships:** belongs to Claim, produces Payments and Adjustments

### 13. Denial Event ✦
**Prisma model:** **New** — `DenialEvent`
**Purpose:** A structured record of a claim denial. One claim may have multiple denial events (initial denial, appeal denial, etc.).
**Key fields:**
- `id`, `claimId`, `claimLineId` (nullable — claim-level vs. line-level denial)
- `carcCode` — Claim Adjustment Reason Code (e.g., "16" = missing info, "4" = modifier, "197" = precertification)
- `rarcCode` — Remittance Advice Remark Code
- `groupCode` — CO (contractual), PR (patient responsibility), OA (other adjustment), PI (payer initiated)
- `denialCategory` — agent-classified: coding_error, missing_info, eligibility, timely_filing, medical_necessity, precertification, duplicate, other
- `amountDenied`
- `recoverable` — boolean (agent's assessment of whether this is worth pursuing)
- `recoverableAmount` — estimated recovery if appealed
- `resolution` — pending, appealed, corrected_and_resubmitted, written_off, overturned
- `resolvedAt`

**Lifecycle:** detected → classified → (appealed | corrected | written_off) → resolved
**Relationships:** belongs to Claim + optional ClaimLine, may produce AppealPacket

### 14. Appeal Packet ✦
**Prisma model:** **New** — `AppealPacket`
**Purpose:** The documentation package for a payer appeal.
**Key fields:**
- `id`, `claimId`, `denialEventId`
- `appealLevel` — first / second / third / external_review
- `appealLetter` — generated text of the appeal letter
- `supportingDocIds` — array of Document ids attached
- `submittedAt`, `submittedTo` — payer address/fax/portal
- `status` — draft, approved_for_submission, submitted, overturned, upheld, pending
- `outcomeReceivedAt`
- `generatedBy` — agent name
- `reviewedBy` — user id (if human-reviewed before submission)

**Lifecycle:** generated → reviewed (optional) → submitted → overturned | upheld
**Relationships:** belongs to Claim + DenialEvent

### 15. Payment
**Prisma model:** `Payment` (exists)
**Purpose:** A payment received from a payer or patient.
**Key fields:** `id`, `claimId`, `patientId`, `amount`, `payerName`, `checkNumber`, `postedAt`, `source` (payer/patient/adjustment), `method` (check/eft/card/cash)
**Lifecycle:** received → posted → reconciled
**Relationships:** belongs to Claim and/or Patient

### 16. Adjustment ✦
**Prisma model:** **New** — `Adjustment`
**Purpose:** Any non-payment financial modification to a claim. Contractual adjustments, write-offs, refunds, take-backs.
**Key fields:**
- `id`, `claimId`, `claimLineId` (optional)
- `type` — contractual, write_off, refund, takeback, courtesy
- `amount` — signed (negative = money back to payer/patient)
- `reason` — human-readable explanation
- `carcCode` — if derived from ERA adjustment
- `approvedBy` — user id (required for write-offs above $25)
- `approvedAt`
- `postedAt`

**Lifecycle:** created → approved (if needed) → posted
**Relationships:** belongs to Claim

### 17. Patient Statement
**Prisma model:** `Statement` (exists)
**Purpose:** A billing statement sent to a patient showing their responsibility.
**Existing fields cover the basics. No new fields needed for V1.**
**Lifecycle:** generated → sent → paid | escalated
**Relationships:** belongs to Patient, references Claims

### 18. Ledger Entry
**Prisma model:** `FinancialEvent` (exists — serves this purpose)
**Purpose:** Append-only financial event log. Every dollar movement gets a ledger entry.
**Already comprehensive.** Supports: charge, payment, adjustment, refund, write_off, transfer, collection. No changes needed.

### 19. Work Queue Task
**Prisma model:** `Task` + `AgentJob` (both exist)
**Purpose:** A unit of work for a human or agent. Used for denial follow-ups, coding reviews, appeal deadlines, patient balance follow-ups.
**No changes needed.** The existing Task model (with priority, status, dueDate, assignee) and AgentJob (with workflow/agent tracking) cover the RCM use cases.

### 20. Escalation Case ✦
**Prisma model:** **New** — `EscalationCase`
**Purpose:** A formal escalation requiring human attention. Higher than a task — implies risk, dollar threshold, or compliance sensitivity.
**Key fields:**
- `id`, `organizationId`, `claimId` (optional), `patientId` (optional)
- `tier` — 1 (billing specialist), 2 (compliance officer), 3 (practice owner)
- `category` — coding_uncertainty, high_dollar, compliance_risk, novel_situation, policy_conflict, write_off_approval
- `summary` — agent-generated description of why this was escalated
- `sourceAgent` — which agent escalated
- `assignedTo` — user id
- `status` — open, in_review, resolved, dismissed
- `resolution` — free text explanation of what was decided
- `resolvedAt`, `resolvedBy`
- `feedbackRecorded` — boolean (was the resolution fed back to AgentFeedback?)

**Lifecycle:** created → assigned → in_review → resolved | dismissed
**Relationships:** optionally links to Claim, Patient, DenialEvent

### 21. Agent Decision Log
**Prisma model:** `AgentReasoning` + `AuditLog` (both exist)
**Purpose:** Every significant billing decision is recorded with reasoning trace + audit entry. Already built as part of the memory harness (Phase A/B).
**No new model needed.** The existing `AgentReasoning` (steps, sources, alternatives, confidence, summary) and `AuditLog` (actorAgent, action, subject, metadata) cover the requirement.

---

## New Models Summary (for schema.prisma)

| Model | Purpose | Priority |
|---|---|---|
| `EligibilitySnapshot` | Point-in-time E&B verification cache | Phase 5 |
| `Charge` | Bridge between encounter and claim | Phase 5 |
| `ClaimScrubResult` | Pre-submission validation record | Phase 6 |
| `ClearinghouseSubmission` | EDI submission tracking | Phase 6 |
| `AdjudicationResult` | ERA/835 parsed payer decision | Phase 7 |
| `DenialEvent` | Structured denial record | Phase 7 |
| `AppealPacket` | Appeal documentation package | Phase 7 |
| `Adjustment` | Financial modifications (write-offs, contractuals) | Phase 7 |
| `EscalationCase` | Formal human-attention escalation | Phase 5 |

**Existing models that need field additions:** `PatientCoverage` (4 fields), `Encounter` (3 fields), `Claim` (7 fields), `ClaimLine` (5 fields).

---

*This is the object layer. Agents in Layer 5 will be defined as
"state transition specialists" that move these objects through the
lifecycles defined in Layer 3.*

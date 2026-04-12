# Layer 9 — Human Intervention Model

> Where humans step in, and exactly how. Agents run the system.
> Humans manage exceptions. This layer defines the boundary.

---

## Escalation Tiers

| Tier | Role | What they handle | SLA |
|---|---|---|---|
| **1** | Billing specialist | Routine exceptions: scrub blocks, clearinghouse rejections, low-dollar underpayments, patient billing questions, coding reviews (confidence 0.75-0.91) | 1 business day |
| **2** | Compliance officer / senior biller | Compliance flags, novel denial patterns, coding reviews (confidence < 0.75), high-dollar disputes ($500+), modifier audit responses, payer contract questions | 2 business days |
| **3** | Practice owner | Write-offs > $500, policy conflicts, systemic compliance concerns, collections decisions, agent behavior overrides, payer contract renegotiation triggers | 5 business days |

---

## What Requires Human Approval (never auto-processed)

| Action | Threshold | Approver |
|---|---|---|
| Write-off | > $25 | Tier 1 ($25-$500), Tier 3 (> $500) |
| Appeal submission | Recoverable ≥ $500 | Tier 1 |
| Claim void | Always | Tier 1 |
| Coding override (agent disagrees with provider) | Always | Tier 2 |
| New payer rule creation | Always | Tier 2 |
| Patient sent to external collections | Always | Tier 3 |
| Compliance flag (upcoding / unbundling pattern) | Always | Tier 2 |
| Contract variance > $1000 on single claim | Always | Tier 3 |

---

## What Agents Handle Autonomously (no human touch)

| Action | Condition |
|---|---|
| Code assignment | Confidence ≥ 0.92, no compliance flags |
| Claim construction | All inputs present, eligibility verified |
| Scrub pass (clean) | Zero blocking edits |
| Clearinghouse submission | Scrub passed |
| ERA parsing + payment posting | Standard adjudication, amounts match |
| Contractual adjustment (CARC 45, group CO) | Always auto-processed |
| Patient statement generation | Balance > $0 after payer adjudication |
| Reminder sending | Per cadence schedule |
| Auto-correction + resubmission | Known CARC (4, 16, 197) with fix available, resubmit count < 2 |
| Write-off | ≤ $25, documented reason |
| Underpayment flagging | Variance > $5 and > 5% — flag, don't resolve |

---

## Human Review Interface

The billing operations team interacts with escalations through:

1. **Approvals inbox** (`/clinic/approvals`) — existing, extended for billing items
2. **Mission Control billing queue** (`/ops/billing`) — for billing-specialist-level work
3. **Escalation detail page** — per-claim timeline showing every agent decision, the escalation reason, and suggested action

### Escalation Case Lifecycle

```
CREATED → ASSIGNED → IN_REVIEW → RESOLVED | DISMISSED
```

- On **resolve**: human's decision is captured as `AgentFeedback` (approved / approved_with_edits / rejected) and the correction is fed back to the originating agent's BillingMemory
- On **dismiss**: agent's original action was correct (positive feedback signal)
- On **timeout** (SLA breach): case surfaces with increasing urgency in Mission Control — yellow at 1x SLA, red at 2x SLA

### Override Mechanics

When a human overrides an agent's decision:

```
1. Original agent decision is preserved in AgentReasoning
2. Human override is recorded in AgentFeedback with:
   - action: "approved_with_edits" or "rejected"
   - editDelta: what changed
   - reviewerNote: why (optional but encouraged)
3. If the override represents a payer-specific pattern:
   - BillingMemory is updated with the correction
   - Confidence on the relevant memory is boosted (human-verified = 0.85)
4. If the override represents a provider preference:
   - Provider coding pattern memory is updated
5. The claim re-enters the flow at the appropriate state
```

---

## Audit Trail for Human Actions

Every human action in the billing workflow produces:

| Record | Model | Content |
|---|---|---|
| AuditLog entry | `AuditLog` | Who, what, when, subject (claim/patient) |
| AgentFeedback entry | `AgentFeedback` | Action taken, edit delta, reviewer note |
| EscalationCase update | `EscalationCase` | Resolution text, resolvedBy, resolvedAt |
| FinancialEvent entry | `FinancialEvent` | If the action moved money (write-off, adjustment, refund) |

**No billing action is invisible.** If money moves, if a code changes, if a claim is voided — there's a record. This is not optional.

---

*Humans are the exception handlers, not the operators. The system
runs until it needs judgment. When it needs judgment, it routes to
the right person with full context and a suggested action. The human
decides. The decision feeds back into the system. Over time, the
system needs less judgment.*

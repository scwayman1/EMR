# Layer 10 — Mission Control

> How operators see, trust, and override the machine. The cockpit is
> designed AFTER the system logic because UX should reflect the system,
> not invent it. Now that we know what states exist, what flows exist,
> and what decisions exist, the UI becomes their natural projection.

---

## Primary Screens

### 1. Claims Funnel (the heartbeat)

A real-time pipeline visualization showing claims moving through states:

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐
│ Coded   │→ │ Scrubbed│→ │Submitted│→ │Adjudicat.│→ │  Posted  │→ │ Closed │
│   42    │  │   38    │  │   35    │  │    28    │  │    25    │  │   22   │
└─────────┘  └─────────┘  └─────────┘  └──────────┘  └──────────┘  └────────┘
                                ↓              ↓
                          ┌──────────┐  ┌──────────┐
                          │Rejected:3│  │Denied: 5 │
                          └──────────┘  └──────────┘
```

Each stage is clickable → drills into the claims at that stage. Numbers update live. Color-coded: green (flowing), yellow (stalled > 7 days), red (stalled > 14 days).

### 2. Denial Queue (ranked by money)

| Column | Content |
|---|---|
| Claim # | Link to claim detail |
| Patient | Name + DOS |
| Payer | Payer name |
| CARC | Denial reason code |
| Amount | Denied amount |
| Recoverable | Agent's estimate of recovery probability × amount |
| Status | Classification (appealable / correctable / write-off candidate) |
| Age | Days since denial |
| Action | Suggested next step |

**Sorted by recoverable amount, descending.** The most money at the top. Operators work top-down.

**Filters:** by payer, by CARC code, by date range, by status, by provider, by amount range.

### 3. AR Aging Dashboard

| Bucket | Count | Total $ | % of AR |
|---|---|---|---|
| 0-30 days | 145 | $42,300 | 55% |
| 31-60 days | 38 | $18,200 | 24% |
| 61-90 days | 12 | $8,400 | 11% |
| 90+ days | 8 | $7,600 | 10% |

Drill-down per bucket. 90+ days row is red and always visible. Click any bucket → see the claims. Each claim links to its full timeline.

### 4. Payer Performance Dashboard

| Payer | Acceptance Rate | Avg Days to Pay | Denial Rate | Avg Payment/Claim | Claims (30d) |
|---|---|---|---|---|---|
| Aetna | 94% | 18d | 6% | $142 | 23 |
| UHC | 91% | 22d | 9% | $128 | 31 |
| BCBS | 96% | 15d | 4% | $155 | 18 |
| Medicare | 98% | 28d | 2% | $112 | 15 |

This is where payer-specific quirks become visible. If UHC's denial rate spikes to 15%, the operator sees it here first.

### 5. Agent Decision Transparency Panel

Click any claim → see the full agent trail:

```
CLAIM CLM-20260410-001

  [04/10 09:15] Encounter Intelligence → created 2 charges (99214, 36415)
  [04/10 09:15] Coding Optimization → assigned ICD: Z71.3, F17.210
                 confidence: 0.94 (auto-approved)
                 reasoning: "MDM moderate — 2 chronic conditions, prescription management"
  [04/10 09:16] Claim Construction → built claim CLM-20260410-001
  [04/10 09:16] Claims Scrubbing → CLEAN (0 edits)
                 NCCI check: no conflicts
                 Modifier check: mod 25 required for 99214+36415 — auto-applied
  [04/10 09:17] Clearinghouse Submission → submitted to Availity
  [04/10 09:18] Clearinghouse → accepted (tracking #AVL-99281)
  [04/18 14:00] Adjudication → paid $142.00 (ERA check #771823)
                 allowed: $155.00, contractual adjustment: $13.00
  [04/18 14:01] Payment Posting → posted $142.00, adjustment $13.00
  [04/18 14:01] Underpayment Detection → within tolerance (variance $0)
  [04/18 14:01] Patient Responsibility → copay $25.00
  [04/18 14:02] claim.financial.closed (patient balance pending)
```

Every line is expandable to show the full AgentReasoning trace. The operator can see exactly WHY the agent made each decision.

### 6. Escalations Queue

Active escalation cases, sorted by urgency:

| Priority | Claim | Category | Source Agent | Summary | Tier | Assigned To | Age |
|---|---|---|---|---|---|---|---|
| 🔴 | CLM-103 | Compliance risk | Compliance | Mod 25 frequency above threshold | 2 | — | 2d |
| 🟡 | CLM-98 | High dollar | Denial Resolution | $1,200 denied, appeal recommended | 1 | billing@ | 1d |
| ⚪ | CLM-112 | Coding uncertainty | Coding Optimization | 99213 vs 99214 — documentation ambiguous | 1 | billing@ | 4h |

Unassigned cases are highlighted. Overdue cases (past SLA) pulse.

### 7. KPI Scorecard

Live metrics from Layer 1's success metrics, rendered as gauges:

- First-pass acceptance: **96%** ✅ (target: 95%)
- Denial rate: **4.2%** ✅ (target: ≤5%)
- Days in AR: **28** ✅ (target: ≤30)
- Net collection rate: **97%** ✅ (target: ≥96%)
- Human touches/claim: **0.25** ✅ (target: ≤0.3)
- Appeal win rate: **64%** ✅ (target: ≥60%)

Red/yellow/green based on target thresholds. Trend arrows (↑↓→) based on 30-day direction.

---

## Role-Based Views

| Role | Sees | Can do |
|---|---|---|
| **Billing specialist** | Claims funnel, denial queue (their assignments), escalations (tier 1), patient collections | Approve/edit claims, resolve tier 1 escalations, issue statements, approve write-offs ≤$500 |
| **Compliance officer** | Compliance flags, coding variance, agent decision panel, escalations (tier 2) | Resolve compliance flags, approve coding overrides, review audit trails |
| **Practice owner** | Full KPI scorecard, payer performance, AR aging, escalations (all tiers), revenue trends | Approve write-offs >$500, approve collections, override any agent decision, set policy thresholds |
| **Provider (read-only)** | Claims for their patients, coding suggestions, denial summaries | View only — cannot modify billing data (separation of clinical and billing roles) |

---

## Alerting Logic

| Alert | Condition | Channel | Recipient |
|---|---|---|---|
| Stale claim | Claim in submitted state > 45 days | Dashboard badge + email | Billing specialist |
| High-value denial | Denied amount > $500 | Dashboard badge + push | Billing specialist + practice owner |
| Compliance flag | Any compliance.flag.raised event | Dashboard badge + email | Compliance officer |
| Timely filing risk | < 30 days remaining on filing deadline | Dashboard banner (red) | Billing specialist |
| Escalation SLA breach | Case past SLA by 1x | Dashboard pulse + email | Assigned user + their manager |
| AR spike | 90+ day AR bucket increases >20% week-over-week | Weekly digest email | Practice owner |
| Payer anomaly | Payer denial rate spikes >2x its 30-day average | Dashboard alert | Billing specialist |

---

## Implementation Notes

The existing Mission Control page (`/ops/mission-control`) is an
operator debugging tool. The billing Mission Control should be a
separate page (`/ops/billing` or `/ops/revenue`) designed for billing
operations — not debugging, but daily workflow.

Build sequence:
1. Claims funnel + claim drill-down timeline (Phase 6)
2. Denial queue + escalation queue (Phase 7)
3. KPI scorecard + AR aging (Phase 7)
4. Payer performance + coding variance (Phase 8)
5. Alerting (Phase 8)

---

*The cockpit reflects the system. It doesn't invent the system. Every
number on this screen ties to a state in Layer 3, an event in Layer 4,
or a decision in Layer 6. If a number doesn't have a clear source,
it shouldn't be on the screen.*

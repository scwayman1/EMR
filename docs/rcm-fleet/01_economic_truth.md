# Layer 1 — Economic Truth

> What "winning" means financially for Leafjourney.
> Every agent, every workflow, every escalation decision downstream
> references this document as ground truth.

---

## 1. What is a successful claim?

A claim is successful when **all** of the following are true:

| Criterion | Definition |
|---|---|
| **Coded correctly** | Every diagnosis and procedure code is supported by the clinical documentation. No upcoding. No unbundling. No modifier abuse. |
| **Paid in full** | The payer remitted the expected contractual amount. No underpayment. |
| **Patient portion resolved** | Copay, coinsurance, or deductible was collected or placed on an active payment plan. |
| **First-pass acceptance** | The claim was accepted on the first submission without rejection or denial. |
| **Cycle time ≤ 35 days** | From encounter close to payment posted, commercial. ≤ 45 days for government payers. |
| **Zero human touches** | The claim moved from encounter to payment without a human needing to intervene. (Stretch goal; target is ≤ 1 human touch on 80% of claims.) |

A claim that is paid but required 3 human interventions is **not** a success. A claim that was auto-submitted but underpaid by $40 is **not** a success. Financial closure means the full dollar journey is complete.

---

## 2. What is revenue leakage?

Revenue leakage is money the practice earned but did not collect. It has five sources:

| Source | Example | Detectability |
|---|---|---|
| **Undercoding** | Provider documents a Level 4 E/M visit (99214) but the system or coder submits Level 3 (99213). | Detectable by comparing documentation complexity to submitted code. |
| **Missed charges** | A procedure was performed and documented but never billed (e.g., nurse did a wound dressing during the visit; no CPT submitted). | Detectable by scanning encounter documentation for procedure keywords not reflected in the claim. |
| **Timely filing expiration** | A claim was never submitted or was submitted past the payer's filing deadline (90 days commercial, 365 days Medicare). | Detectable by aging the encounter-to-submission gap. |
| **Underpayment acceptance** | Payer paid less than the contracted rate and the practice did not follow up. | Detectable by comparing ERA payment to fee schedule / expected reimbursement. |
| **Unworked denials** | A denial was received but no one appealed or corrected it within the allowable window. | Detectable by aging denied claims against appeal deadlines. |

**The fleet's job is to reduce each of these to near-zero.** Not by guessing — by systematic detection and action on every claim.

---

## 3. Compliant reimbursement vs. maximum reimbursement

These are not the same thing.

- **Maximum reimbursement** = the highest possible payment for every encounter. This is what aggressive billing shops chase. It leads to upcoding, modifier abuse, and audit risk.
- **Compliant reimbursement** = the highest payment that is **fully supported by the clinical documentation**. No more, no less.

**Leafjourney optimizes for compliant reimbursement.** The system should:

- Suggest the code that best matches the documentation, not the code that pays the most
- Flag when documentation *could* support a higher code, and prompt the provider to add detail — not auto-upcode
- Never apply a modifier (25, 59, XE, XS, XP, XU) without a defensible clinical rationale
- Treat every coding decision as if it will be audited tomorrow

The Constitution (Art. VI §4) applies here: "No shortcuts that compromise the Constitution." An extra $30 on a visit is not worth the practice's integrity.

---

## 4. Payer vs. patient revenue split

Revenue comes from two sources:

| Source | Typical split | Collection difficulty |
|---|---|---|
| **Payer (insurance)** | 70-85% of practice revenue | Medium — requires clean claims + denial management |
| **Patient (responsibility)** | 15-30% of practice revenue | High — requires statements, reminders, payment plans, empathy |

The fleet must treat both halves as first-class:

- **Payer revenue**: optimized by clean claims, fast submission, denial recovery, underpayment detection
- **Patient revenue**: optimized by accurate responsibility calculation, clear statements, warm collections cadence, payment plan offers, and the Constitution's volunteer-offset framework (Art. VII)

A system that collects 98% of payer revenue but only 40% of patient responsibility is still leaking money. The patient financial path is as important as the claim path.

---

## 5. Definition of financial closure

A claim reaches **financial closure** when one of these terminal states is reached:

| Terminal state | Meaning |
|---|---|
| **Paid in full** | Payer + patient portions both collected. Ledger balanced. |
| **Paid + patient on plan** | Payer portion collected. Patient balance on an active payment plan with ≥1 payment made. |
| **Written off (approved)** | Balance written off with a documented reason and approval at the appropriate dollar threshold. |
| **Transferred to collections** | Patient balance escalated to external collections after the internal cadence exhausted. |
| **Adjusted (contractual)** | Contractual adjustment applied per payer agreement. No balance remaining. |
| **Voided** | Claim voided due to error, duplicate, or clinical reversal. |

A claim that is "paid by insurance but patient balance is sitting there unaddressed" is **not closed**. The fleet must track every claim to a terminal state.

---

## 6. Financial guardrails

| Guardrail | Threshold | Action |
|---|---|---|
| Auto-submit confidence | ≥ 0.92 | Submit without human review |
| Hold for review | 0.75 – 0.91 | Route to coding review queue |
| Block submission | < 0.75 | Do not submit; escalate to human |
| Auto write-off | ≤ $25 | Auto-approve with audit log |
| Write-off requires billing specialist | $25.01 – $500 | Billing specialist approval |
| Write-off requires practice owner | > $500 | Practice owner approval |
| Appeal auto-generation | Recoverable amount ≥ $75 | Generate appeal automatically |
| Appeal requires human review | Recoverable amount ≥ $500 | Human reviews appeal before submission |
| Patient collections escalation | Balance > $100, unpaid > 90 days, ≥ 3 statements sent | Escalate to collections workflow |

These thresholds are configurable per organization. The defaults above are for a typical ambulatory cannabis care practice.

---

## 7. Success metrics (what the fleet is measured by)

| Metric | Target | Formula |
|---|---|---|
| **First-pass acceptance rate** | ≥ 95% | Claims accepted on first submission / total claims submitted |
| **Denial rate** | ≤ 5% | Denied claims / total adjudicated claims |
| **Clean claim rate** | ≥ 98% | Claims passing scrub with zero edits / total claims created |
| **Days in AR** | ≤ 30 (commercial), ≤ 45 (government) | Average days from submission to payment posting |
| **Net collection rate** | ≥ 96% | Payments collected / (charges - contractual adjustments) |
| **Human touches per claim** | ≤ 0.3 | Total human interventions / total claims processed |
| **Appeal win rate** | ≥ 60% | Appeals overturned / total appeals submitted |
| **Patient payment conversion** | ≥ 70% | Patient balances collected / total patient balances created |
| **Underpayment recovery rate** | ≥ 80% | Underpayments recovered / total underpayments detected |
| **Time to payment posting** | ≤ 2 business days | Days from ERA receipt to payment posted on ledger |
| **Coding confidence distribution** | ≥ 85% of claims above 0.92 | Percentage of claims auto-submitted without review |

---

## 8. What this fleet is NOT

| Not this | Why |
|---|---|
| A hospital billing system | We are physician office / ambulatory. Professional claims (837P / CMS-1500). Not facility (837I / UB-04). |
| A coding replacement | The fleet suggests and optimizes codes. The provider signs off. The fleet does not diagnose or code independently. |
| An aggressive reimbursement maximizer | We optimize compliant reimbursement. Upcoding is a bug, not a feature. |
| A collections agency | We handle internal patient billing. External collections is a handoff, not our core. |
| A clearinghouse | We submit TO clearinghouses. We are not one. |
| A payer | We interface WITH payers. We don't adjudicate claims. |

---

*This document is the economic foundation. Every agent, every workflow,
every threshold, every escalation decision in the fleet references the
definitions above. If a downstream decision conflicts with this layer,
this layer wins.*

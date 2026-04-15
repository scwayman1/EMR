# Leafjourney EMR — Agentic Revenue Cycle Management Fleet PRD

> Source: Scott Wayman (CPTO), April 2026
> Classification: Implementation-grade specification
> Execution model: 4-pass agent swarm

This document is the founding product requirements document for the
Leafjourney RCM Fleet. It was provided by Scott as the target
architecture for the revenue cycle agent swarm. Everything below
is the brief — the architecture spec, agent manifests, event
contracts, and build backlog are generated from this.

---

## Primary Objective

Design the Leafjourney EMR Agentic Revenue Cycle Management Fleet to
autonomously manage the complete medical billing lifecycle:

1. Encounter interpretation
2. Coding recommendation and optimization
3. Claim creation
4. Claim scrubbing
5. Payer rule validation
6. Clearinghouse submission
7. Adjudication response interpretation
8. Denial handling
9. Resubmission workflows
10. Payment posting
11. Reconciliation
12. Patient responsibility billing
13. Patient collections workflow
14. Revenue intelligence and optimization

The system should function like a best-in-class AI-native revenue
cycle team for physician office and ambulatory practice billing.

**Pursuit targets:**
- Maximum compliant reimbursement
- Minimum denial rate
- Near-zero revenue leakage
- Low human-touch workflows
- Explainable and auditable automation
- Adaptive learning over time

---

## Product Thesis

Traditional billing systems are systems of record.
Leafjourney must be a **system of execution**.

Legacy RCM platforms wait for users to assign codes, fix rejections,
chase denials, reconcile payments, track patient balances.

Leafjourney should actively:
- Infer billing intent from clinical activity
- Generate and optimize claims
- Scrub claims before submission
- Understand clearinghouse responses
- Interpret ERAs and denial codes
- Automatically repair or route claims
- Reconcile payments and balances
- Drive patient collections with intelligence
- Surface exceptions instead of forcing manual work everywhere

**Humans should primarily manage exceptions, edge cases, approvals,
and policy overrides. The fleet handles the rest.**

---

## Design Principles

### 1. Compliance First
Every action must be compliance-aware. The system must optimize
reimbursement without encouraging fraud, abuse, upcoding, or
unsupported coding.

### 2. Explainability
Every important billing decision must be explainable. The system
must store: why a code was selected, why a modifier was applied,
why a claim was held, why a denial was classified a certain way,
why a patient balance was created.

### 3. Event-Driven Execution
The platform should react to events, not rely on brittle manual
progress chasing.

### 4. Human Exceptions, Not Human Dependence
Humans should step in only when: confidence is low, the dollar
value is high, the compliance risk is elevated, the case is novel
or ambiguous, or policy requires signoff.

### 5. Adaptive Learning
The system should improve over time using: denial outcomes,
resubmission results, payer-specific behavior, payment variance
patterns, user corrections, claim acceptance trends.

### 6. Modular Fleet Design
Each agent should have a sharply defined purpose, bounded tools,
clear inputs, and explicit outputs.

### 7. Financial Closure
The revenue cycle is not done at claim submission. The system must
track all financial closure through payment posting, patient
balance, and collections state.

---

## Agent Fleet (17 agents)

1. **Encounter Intelligence Agent** — interprets clinical encounters
2. **Coding Optimization Agent** — recommends and optimizes codes
3. **Claim Construction Agent** — builds clean claims
4. **Claims Scrubbing Agent** — edits/NCCI/modifier validation
5. **Eligibility and Benefits Agent** — real-time E&B checks
6. **Prior Authorization Verification Agent** — PA status tracking
7. **Clearinghouse Submission Agent** — EDI formatting + submission
8. **Adjudication Interpretation Agent** — ERA/EOB parsing
9. **Denial Resolution Agent** — denial classification + routing
10. **Appeals Generation Agent** — appeal packet creation
11. **Payment Posting Agent** — payment application + reconciliation
12. **Underpayment Detection Agent** — contract/benchmark comparison
13. **Patient Responsibility Agent** — copay/deductible/coinsurance
14. **Patient Billing and Collections Agent** — statements + cadence
15. **Revenue Intelligence Agent** — KPI dashboards + optimization
16. **Compliance and Audit Agent** — fraud prevention + audit trail
17. **Human Escalation / Review Agent** — exception routing

For each agent, the architecture spec must define: mission, scope,
inputs, outputs, tools, reasoning patterns, confidence thresholds,
failure modes, escalation conditions, memory interactions, event
subscriptions, event emissions, and example tasks.

---

## Required Outputs (4-pass execution)

### Pass 1 — Architecture Spec
Full system design covering all 15 sections listed in the format
specification (system overview → example objects).

### Pass 2 — Agent Manifests
Machine-readable agent manifests for every agent in the fleet.

### Pass 3 — Event and Orchestration Contracts
Event contracts + orchestration logic for all core workflows.

### Pass 4 — Build Backlog
Implementation backlog organized into epics, features, user stories,
technical tasks, dependencies, risks, and acceptance criteria.

---

## Existing Platform Capabilities

The fleet sits inside the Leafjourney agentic harness which already
provides:
- Agent registry (`src/lib/agents/index.ts`)
- Orchestration engine (`src/lib/orchestration/`)
- Memory store (PatientMemory, ClinicalObservation, AgentReasoning, AgentFeedback)
- Structured data objects (Prisma schema)
- Event-driven workflow execution (DomainEvent → Workflow → AgentJob)
- Audit logs (AuditLog + FinancialEvent)
- Task queue (AgentJob with status lifecycle)
- Mission control (`/ops/mission-control`)
- Escalation routing (requiresApproval + approvals inbox)
- Permissions and access controls (AllowedAction)
- Persona/voice layer (`src/lib/agents/persona.ts`)
- Cohort awareness (`src/lib/agents/memory/cohort.ts`)

## Existing Billing Agents (to be upgraded/absorbed)

- `chargeIntegrity` — claim scrubbing (Phase 3)
- `denialTriage` — denial classification (Phase 3)
- `patientExplanation` — patient billing explanations (Phase 3)
- `patientCollections` — collections workflow (Phase 3)
- `reconciliation` — payment reconciliation (Phase 3)
- `aging` — AR aging sweeps (Phase 3)
- `underpaymentDetection` — underpayment scanning (Phase 3)
- `refundCredit` — refund/credit handling (Phase 4)
- `revenueCommand` — revenue intelligence briefs (Phase 4)

---

## Quality Bar

The output must feel like something a world-class product architect,
healthcare operator, AI systems designer, and engineering lead would
use to start building immediately.

- Precise, sharp, comprehensive, operationally credible, deeply
  structured.
- Not marketing copy. Not theoretical filler. Not generic AI fluff.
- The system must not behave like a hallucinating intern with Wi-Fi.
  It must behave like a disciplined billing organization.

---

## Domain Context

This is physician office / ambulatory billing. The system must
demonstrate awareness of: ICD-10 diagnosis coding logic, CPT/HCPCS
procedure coding logic, modifiers, claim edits, payer-specific rules,
claim submission standards (837P), rejections vs denials, ERAs/EOBs,
AR follow-up, patient responsibility flows, secondary billing logic,
and revenue leakage patterns.

Do not just name these concepts. Use them intelligently in the
architecture.

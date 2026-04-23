# Layer 7 — Memory and Retrieval Strategy

> What the fleet is allowed to remember, and when it should shut up.
> Memory makes agents smarter over time. Undisciplined memory makes
> agents confidently wrong over time. This layer defines the rules.

---

## Memory Categories

### Long-Term Memory (persists indefinitely, updated on evidence)

| Category | Example | Written by | Read by |
|---|---|---|---|
| **Payer quirks** | "Aetna in AZ denies mod 25 on same-day E/M+procedure 40% of the time" | Denial Resolution, Revenue Intelligence | Coding Optimization, Claims Scrubbing |
| **Provider coding patterns** | "Dr. Okafor documents at 99214 level 70% of visits — consistent with documentation" | Coding Optimization, Compliance | Coding Optimization, Encounter Intelligence |
| **Historical denial trends** | "CPT 99215 with ICD Z71.3 (cannabis counseling) denied by BCBS 3 of last 5 times" | Denial Resolution | Coding Optimization, Claims Scrubbing |
| **Modifier patterns** | "Modifier 25 required for E/M + 36415 (venipuncture) at this practice — auto-apply" | Claims Scrubbing | Claims Scrubbing, Coding Optimization |
| **Patient billing behavior** | "Maya Reyes pays within 7 days of statement. No reminders needed." | Patient Collections | Patient Collections |
| **Payer turnaround** | "UHC averages 18 days to adjudicate. Aetna averages 12 days." | Revenue Intelligence | Revenue Intelligence (for stale claim detection) |

**Implementation:** Use the existing `PatientMemory` model with a new `MemoryKind` value `billing_pattern`, plus a new **`PayerMemory`** model (or extend PatientMemory with `payerId` scope) for payer-level memories. Alternatively, store payer memories as `ClinicalObservation` records with `category: "billing_pattern"` and a payer tag.

**Recommended approach for V1:** Add a `BillingMemory` model:

```prisma
model BillingMemory {
  id             String   @id @default(cuid())
  organizationId String
  scope          String   // "payer" | "provider" | "patient" | "code_combo" | "global"
  scopeId        String?  // payerId, providerId, patientId, or null for global
  category       String   // "denial_pattern" | "modifier_rule" | "turnaround" | "collection_behavior" | "coding_pattern"
  content        String   // narrative description
  confidence     Float    @default(0.8)
  evidenceCount  Int      @default(1)   // how many data points support this memory
  lastEvidenceAt DateTime @default(now())
  tags           String[] @default([])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([scope, scopeId, category])
  @@index([organizationId, category])
}
```

### Episodic Memory (per-claim, per-event, short to medium term)

| Category | Example | Written by | Read by |
|---|---|---|---|
| **Claim lifecycle events** | "Claim CLM-1234 submitted 4/1, rejected 4/2 (missing mod 25), resubmitted 4/2, accepted 4/3, paid 4/18" | All agents touching the claim | Any agent re-processing the claim |
| **Denial-appeal chains** | "Denial CARC 50 on CLM-1234 → appealed 4/5 with records → overturned 4/22 → paid $340" | Denial Resolution, Appeals Gen | Appeals Generation (for precedent) |
| **Work queue history** | "Task 'review coding for CLM-1234' created 4/1, assigned to billing@, completed 4/2 with code change 99213→99214" | Human Escalation | Coding Optimization (learning from corrections) |

**Implementation:** Episodic memory is already captured by:
- `AgentJob.logs` (per-step events during each agent run)
- `AuditLog` (every action taken on a claim)
- `FinancialEvent` (every dollar movement)
- `AgentReasoning` (full reasoning trace per job)

No new model needed. The existing audit trail IS the episodic memory. Agents query it via `AuditLog.findMany({ where: { subjectId: claimId } })`.

### Semantic / Policy Memory (reference knowledge, externally maintained)

| Category | Source | Update frequency | Access pattern |
|---|---|---|---|
| **CMS guidelines** | CMS.gov, Medicare Learning Network | Quarterly review | RAG retrieval by topic |
| **ICD-10 reference** | WHO / CMS annual release | Annually (Oct 1) | Direct code lookup |
| **CPT reference** | AMA annual release | Annually (Jan 1) | Direct code lookup |
| **NCCI edit table** | CMS quarterly release | Quarterly | Table lookup (CPT pair → edit type) |
| **Payer policies** | Payer portals, provider manuals | As published | RAG retrieval by payer + topic |
| **Fee schedules** | Payer contracts, Medicare MPFS | Annually + contract updates | Direct lookup by CPT + payer |
| **Modifier logic** | CMS + AMA guidelines | As updated | Rule engine lookup |

**Implementation:** For V1, policy memory lives in:
1. `FeeScheduleEntry` model (already exists — fee schedules)
2. Static JSON files for NCCI edit tables and modifier rules (`src/lib/domain/ncci-edits.json`, `src/lib/domain/modifier-rules.json`)
3. RAG retrieval over a document corpus for CMS guidelines and payer policies (Phase 7+)

---

## Write Rules (when memory is created or updated)

| Trigger | Memory written | Confidence | Evidence threshold |
|---|---|---|---|
| Denial resolved | Payer denial pattern | 0.6 (first occurrence), increases with repetition | 1 for creation, confidence rises at 3+ |
| Claim paid | Payer turnaround time | 0.9 (objective data) | Updated as rolling average |
| Human corrects agent | Coding pattern correction | 0.85 (human-verified) | 1 (human corrections are high-signal) |
| Agent observes pattern | Provider coding pattern | 0.5 (initial), rises with evidence | 5+ encounters before memory is confident |
| Patient pays | Patient billing behavior | 0.7 | 3+ payment events |
| Appeal succeeds/fails | Appeal outcome pattern | 0.7 per outcome | 1 per outcome, confidence rises with count |

### Evidence accumulation

```
WHEN new_evidence matches existing_memory:
  existing_memory.evidenceCount += 1
  existing_memory.lastEvidenceAt = now
  existing_memory.confidence = min(0.95, base_confidence + 0.05 * log(evidenceCount))
  
  // Memory gets more confident as evidence accumulates, but never reaches 1.0
  // (always leave room for the world to change)
```

---

## Retrieval Rules (when and how memory is queried)

| Agent | When it retrieves | What it retrieves | Max staleness |
|---|---|---|---|
| Coding Optimization | Before recommending codes | Provider patterns, payer denial patterns for code combos | 90 days |
| Claims Scrubbing | During scrub | Payer-specific rules, modifier patterns, denial patterns | 90 days |
| Denial Resolution | On denial classification | Payer denial patterns, historical appeal outcomes | 180 days |
| Appeals Generation | Before drafting appeal | Appeal outcomes by payer + CARC, successful appeal templates | 365 days |
| Patient Collections | Before issuing statement | Patient payment behavior | 365 days |
| Revenue Intelligence | On KPI generation | All categories (aggregate) | No staleness limit |

### Retrieval priority (when multiple sources conflict)

```
1. Payer contract (if available)           — highest authority
2. CMS/regulatory guidance                 — always applies
3. Organization-specific operating rules   — practice policy
4. Historical outcome patterns             — learned from experience
5. General best practices                  — lowest authority
```

If a payer contract says one thing and a historical pattern says another, the contract wins. If CMS guidance says one thing and practice policy says another, CMS wins. Memory informs confidence, not compliance rules.

---

## Contamination Prevention

| Risk | Prevention |
|---|---|
| **Overfitting to one payer** | Memories are scoped by payerId. A pattern observed with Aetna doesn't bleed into Cigna behavior. |
| **Anchoring on small samples** | Confidence doesn't exceed 0.7 until evidenceCount ≥ 3. No single event creates a "rule." |
| **Stale patterns** | Memories older than 180 days with no new evidence are demoted (confidence *= 0.8). After 365 days with no evidence, archived. |
| **Human error propagation** | Human corrections are treated as high-signal but NOT infallible. If a human correction contradicts 10+ historical successes, the correction is flagged for review rather than blindly adopted. |
| **Circular reasoning** | Agents cannot use their OWN prior decisions as evidence for current decisions. Memory must come from outcomes (denials, payments, corrections), not from prior predictions. |

---

## What NOT to Persist

| Don't remember | Why |
|---|---|
| Intermediate LLM reasoning | The reasoning trace (AgentReasoning) captures this. Memory stores conclusions, not stream-of-consciousness. |
| Rejected alternatives | Store in AgentReasoning, not memory. Memory is for patterns that proved true. |
| One-time anomalies | If a payer behaves unusually once, don't create a memory. Wait for repetition. |
| PHI in memory content | Memory content should reference patientId, not patient names. "Patient clm_abc123 pays within 7 days" not "Maya Reyes pays within 7 days." |

---

*This is the memory layer. Agents become smarter over time by
accumulating evidence-backed patterns. But memory influences
confidence, routing, and prioritization — NEVER core compliance
logic. CMS rules don't change because an agent "remembers" something
different.*

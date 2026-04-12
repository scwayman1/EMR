# Layer 6 — Decision Frameworks

> How agents think. Not "use AI" — structured decision logic with
> confidence scoring, retrieval rules, and override conditions.
> Each framework is specific enough that you could implement it as a
> deterministic tree with an LLM fallback, not the other way around.

---

## Coding Optimization Agent (Agent 2)

### E/M Level Selection (2021 guidelines)

```
IF encounter is office/outpatient (99202-99215):
  IF time-based billing documented:
    total_time = provider_documented_time
    level = TIME_TABLE[total_time]  // 99213=20-29min, 99214=30-39min, 99215=40-54min
    confidence = 0.95 (time is objective)
  ELSE (MDM-based):
    problems = count_problems(assessment)      // self-limited, chronic stable, chronic worsening, new
    data = score_data_reviewed(notes)          // minimal, limited, moderate, extensive
    risk = score_management_risk(plan)         // minimal, low, moderate, high
    mdm_level = mdm_matrix(problems, data, risk)  // 2-of-3 determines level
    level = MDM_TO_CPT[mdm_level]
    confidence = min(problems.confidence, data.confidence, risk.confidence)
  
  IF provider_submitted_code AND provider_submitted_code != level:
    IF provider_code > level:
      flag = "documentation_may_not_support_code" (potential upcoding)
      action = suggest downcode OR request addendum
    ELSE:
      flag = "documentation_supports_higher_code" (potential undercoding)
      action = suggest upcode with explanation
```

### Modifier Decision Tree

```
MODIFIER 25 (Significant, Separately Identifiable E/M):
  required_when = E/M billed same day as procedure by same provider
  documentation_test = E/M note must document a problem BEYOND the procedure indication
  confidence = 0.85 if separate problem documented, 0.5 if ambiguous
  auto_apply = confidence >= 0.85
  
MODIFIER 59 / XE / XS / XP / XU (Distinct Procedural Service):
  required_when = two procedures billed together that trigger NCCI edit
  NCCI_check = lookup(cpt_1, cpt_2) in ncci_edit_table
  IF ncci_edit.modifier_allowed:
    determine_which_x_modifier(anatomic_site, session, provider, encounter)
    confidence = 0.80 if documentation clearly supports distinction
  ELSE:
    block_combination (NCCI edit does not allow modifier override)
```

### ICD-10 Specificity

```
FOR each diagnosis in encounter:
  candidate_codes = lookup(diagnosis_text)
  
  // Always prefer highest specificity
  SORT candidates by specificity (7-char > 6-char > 5-char > 4-char > 3-char)
  
  // Laterality check
  IF condition is lateralizable AND laterality not specified:
    flag = "laterality_missing" (use unspecified code but suggest provider clarify)
  
  // Episode of care
  IF condition is injury AND episode not specified:
    flag = "episode_missing" (initial A, subsequent D, sequela S)
  
  selected = highest_specificity_supported_by_documentation
  confidence = documentation_match_score(selected.description, note_text)
```

---

## Claims Scrubbing Agent (Agent 4)

### Scrub Rules (executed in order)

| Priority | Rule | Action if violated |
|---|---|---|
| 1 | **Required fields check** | Block — claim cannot submit without NPI, DOS, POS, patient DOB |
| 2 | **NCCI edit check** | Block if no modifier override; warn if modifier applied |
| 3 | **Modifier appropriateness** | Block if modifier applied without documentation support |
| 4 | **Diagnosis pointer validity** | Block if any line points to a non-existent diagnosis |
| 5 | **Place of service consistency** | Auto-fix if mismatch (in-person encounter with POS 02) |
| 6 | **Units validation** | Warn if units > 1 for services that are typically 1 unit |
| 7 | **Duplicate claim check** | Block if same patient + same DOS + same CPT already submitted |
| 8 | **Timely filing check** | Block if < 14 days remain on filing deadline; warn if < 30 days |
| 9 | **Fee schedule check** | Warn if charge amount deviates >20% from fee schedule |
| 10 | **Payer-specific rules** | Varies — retrieved from payer memory |

### Auto-fix Rules

```
IF scrub_violation.auto_fixable:
  apply_fix(claim, violation)
  log_fix(claim_id, violation, fix_applied, agent_reasoning)
  re_run_scrub(claim)  // validate fix didn't introduce new issues
ELSE:
  claim.status = "scrub_blocked"
  emit("claim.blocked", { claimId, violations })
```

---

## Denial Resolution Agent (Agent 9)

### Classification Decision Tree

```
INPUT: denial_event (carcCode, groupCode, amountDenied, claimId)

// Step 1: Is this auto-correctable?
IF carcCode IN [4, 16, 197] AND correction_data_available:
  resolution = "correct_and_resubmit"
  confidence = 0.85
  
// Step 2: Is this appealable?
ELIF carcCode IN [50, 96] AND supporting_documentation_exists:
  IF amount_denied >= 75:
    resolution = "appeal"
  ELSE:
    resolution = "write_off" (not worth the cost of appeal)
    
// Step 3: Is this a contractual adjustment?
ELIF carcCode == 45 AND groupCode == "CO":
  resolution = "contractual_adjustment"
  confidence = 0.95
  auto_process = true
  
// Step 4: Is this a patient responsibility?
ELIF groupCode == "PR":
  resolution = "patient_responsibility"
  emit("patient.balance.created")
  
// Step 5: Unknown or complex
ELSE:
  resolution = "escalate"
  emit("human.review.required", { tier: 2 })
```

### Resubmission Guard

```
IF claim.resubmission_count >= 2:
  DO NOT auto-resubmit
  escalate to human with full denial history
  reason = "claim has been denied and resubmitted twice — needs human eyes"
```

---

## Underpayment Detection Agent (Agent 12)

### Detection Logic

```
INPUT: payment_posted_event (claimId, amount, source="payer")

expected = sum(claim.lines.map(line => fee_schedule_lookup(line.cptCode)))
actual = payment_posted_event.amount
variance = expected - actual
variance_pct = variance / expected

IF variance > 5.00 AND variance_pct > 0.05:
  // This is a meaningful underpayment
  check_contractual = lookup_payer_contract(claim.payerId)
  IF check_contractual.contracted_rate_available:
    expected_contracted = sum(lines.map(l => contracted_rate(l.cptCode, claim.payerId)))
    IF actual < expected_contracted * 0.95:
      emit("underpayment.detected", { claimId, expected: expected_contracted, actual, variance })
  ELSE:
    // No contract on file — use fee schedule as benchmark
    emit("underpayment.detected", { claimId, expected, actual, variance })
```

---

## Patient Collections Agent (Agent 14)

### Escalation Decision Framework

```
INPUT: patient_balance (amount, age_days, statements_sent, payments_made)

IF amount <= 10.00:
  action = "courtesy_write_off"
  
ELIF age_days < 14:
  action = "wait" (too early for first reminder)
  
ELIF statements_sent == 0:
  action = "issue_statement"
  
ELIF statements_sent < 3 AND age_days < 45:
  action = "send_reminder"
  channel = determine_channel(patient.preferences)  // email, SMS, portal
  
ELIF statements_sent >= 3 AND payments_made == 0 AND age_days >= 60:
  action = "offer_payment_plan"
  
ELIF age_days >= 90 AND amount > 100 AND payments_made == 0:
  action = "escalate_to_collections_review" (human decision)
  
ELSE:
  action = "continue_cadence"
```

---

## Confidence Scoring Model (all agents)

Every agent produces a confidence score (0.0–1.0) for its output. The score determines what happens next:

| Score | Label | Action |
|---|---|---|
| 0.92–1.0 | **High** | Auto-proceed. No human review needed. |
| 0.75–0.91 | **Medium** | Proceed but flag for async review. |
| 0.50–0.74 | **Low** | Hold. Route to human review queue. |
| 0.00–0.49 | **Very low** | Block. Agent acknowledges uncertainty and defers entirely. |

Confidence is NOT a random number. It's computed from:
- **Documentation match** — how closely the note text matches the selected code
- **Historical success** — what happened last time this code/payer/modifier combination was submitted
- **Rule compliance** — whether all scrub rules passed
- **Payer memory** — whether this payer has accepted similar claims before

---

*These are the decision frameworks. Agents evaluate structured
decisions against these trees. The LLM is used to parse unstructured
documentation, not to make billing decisions. Billing decisions follow
rules. Documentation interpretation follows intelligence.*

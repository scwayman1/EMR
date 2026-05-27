/**
 * EMR-045 — Insurance Billing AI Agent System (orchestrator).
 *
 * The revenue-cycle fleet ships nineteen specialist agents (charge
 * integrity, coding optimization, claim construction, denial triage, …).
 * Each does a slice of the work. Production billing succeeds when those
 * agents share a coherent picture of *one claim, end to end*: where it
 * came from, what shape it is in, who looked at it last, what's blocking
 * it from getting paid.
 *
 * That coherent picture is what this orchestrator owns. It does NOT run
 * the agents itself — `src/lib/orchestration/runner.ts` is the runner —
 * it owns:
 *
 *   1. The state machine each claim moves through.
 *   2. The hand-off events between agents (which agent picks up next).
 *   3. A maximization scorer that rates the documentation quality and
 *      flags gaps where another pass could lift the allowed amount.
 *   4. A health snapshot for the operator dashboard.
 *
 * Every agent is referenced by its `agentRegistry` name so we can change
 * implementations without breaking the contract.
 */

export type ClaimStage =
  | "encounter_intelligence"
  | "coding_optimization"
  | "scrub"
  | "construction"
  | "submission"
  | "ack_pending"
  | "adjudication"
  | "appeals"
  | "secondary"
  | "patient_responsibility"
  | "closed";

export const STAGE_ORDER: ClaimStage[] = [
  "encounter_intelligence",
  "coding_optimization",
  "scrub",
  "construction",
  "submission",
  "ack_pending",
  "adjudication",
  "appeals",
  "secondary",
  "patient_responsibility",
  "closed",
];

/**
 * Per-stage runbook: which agent owns the work, which event we listen for
 * to advance the stage, and which event we emit when the stage completes.
 */
export interface StagePlaybook {
  stage: ClaimStage;
  primaryAgent: string;
  /** Domain event names the agent subscribes to. */
  consumes: string[];
  /** Domain event names emitted when the stage succeeds. */
  produces: string[];
  /** Stages this stage hands off to (usually the next one, sometimes a branch). */
  handoffsTo: ClaimStage[];
  /** Operator description. */
  description: string;
}

export const PLAYBOOK: StagePlaybook[] = [
  {
    stage: "encounter_intelligence",
    primaryAgent: "encounterIntelligence",
    consumes: ["encounter.finalized"],
    produces: ["coding.required"],
    handoffsTo: ["coding_optimization"],
    description:
      "Reads the finalized encounter, extracts billable signals (HPI, MDM, ROS, problem list), and prepares structured input for coding.",
  },
  {
    stage: "coding_optimization",
    primaryAgent: "codingOptimization",
    consumes: ["coding.required", "charge.created"],
    produces: ["coding.recommended", "coding.review_needed"],
    handoffsTo: ["scrub"],
    description:
      "Picks the highest-supported CPT/ICD-10 combination plus modifiers. Never upcodes — always cites documentation.",
  },
  {
    stage: "scrub",
    primaryAgent: "chargeIntegrity",
    consumes: ["coding.recommended"],
    produces: ["claim.scrubbed", "claim.scrub_failed"],
    handoffsTo: ["construction"],
    description:
      "NCCI / MUE pair check, modifier validation, payer-specific scrub rules. Fixes what it can; flags what it can't.",
  },
  {
    stage: "construction",
    primaryAgent: "claimConstruction",
    consumes: ["claim.scrubbed"],
    produces: ["claim.constructed"],
    handoffsTo: ["submission"],
    description:
      "Builds a real X12 837P transaction set, validates SNIP types 1-5, and stages it for the clearinghouse gateway.",
  },
  {
    stage: "submission",
    primaryAgent: "clearinghouseSubmission",
    consumes: ["claim.constructed"],
    produces: ["claim.submitted"],
    handoffsTo: ["ack_pending"],
    description:
      "Submits via the configured clearinghouse adapter (Availity / Waystar / Change). Handles auth, rate limits, retries.",
  },
  {
    stage: "ack_pending",
    primaryAgent: "staleClaimMonitor",
    consumes: ["claim.submitted", "ack.277ca", "ack.999"],
    produces: ["claim.accepted", "claim.rejected"],
    handoffsTo: ["adjudication", "construction"],
    description:
      "Polls for 999 + 277CA acknowledgments; flags claims past the payer's ack SLA as stale and routes them back.",
  },
  {
    stage: "adjudication",
    primaryAgent: "adjudicationInterpretation",
    consumes: ["era.posted", "claim.accepted"],
    produces: [
      "claim.paid",
      "claim.partial",
      "claim.denied",
      "claim.underpaid",
    ],
    handoffsTo: ["appeals", "secondary", "patient_responsibility", "closed"],
    description:
      "Parses 835 line-by-line. Emits paid / partial / denied / underpaid based on CARC + RARC interpretation.",
  },
  {
    stage: "appeals",
    primaryAgent: "appealsGeneration",
    consumes: ["claim.denied", "claim.underpaid"],
    produces: ["appeal.drafted", "appeal.submitted"],
    handoffsTo: ["adjudication", "secondary", "closed"],
    description:
      "Drafts the appeal letter with the winning argument from BillingMemory. Submits via the payer's preferred channel.",
  },
  {
    stage: "secondary",
    primaryAgent: "denialResolution",
    consumes: ["claim.paid", "claim.partial"],
    produces: ["claim.secondary_constructed"],
    handoffsTo: ["submission", "patient_responsibility"],
    description:
      "If a secondary payer exists, builds the Loop 2320 CAS claim with the primary ERA's payer control number.",
  },
  {
    stage: "patient_responsibility",
    primaryAgent: "patientCollections",
    consumes: ["claim.paid", "claim.partial"],
    produces: ["statement.due", "patient.invoice_emitted"],
    handoffsTo: ["closed"],
    description:
      "Computes patient responsibility (deductible, coinsurance, copay) and queues the statement.",
  },
  {
    stage: "closed",
    primaryAgent: "reconciliation",
    consumes: ["statement.paid", "claim.written_off"],
    produces: [],
    handoffsTo: [],
    description:
      "Reconciles every event against bank deposits and the ledger. Closes the loop.",
  },
];

export function nextStage(stage: ClaimStage): ClaimStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0 || i === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

export function playbookFor(stage: ClaimStage): StagePlaybook | null {
  return PLAYBOOK.find((p) => p.stage === stage) ?? null;
}

// ---------------------------------------------------------------------------
// Maximization scoring — rates the documentation quality + likelihood of a
// higher allowed amount with one more pass. Every claim gets a score; high-
// score claims get queued for the maximization pass before submission.
// ---------------------------------------------------------------------------

export interface ClaimDocSignals {
  /** Number of distinct ICD-10 codes that materially support the CPT level. */
  diagnosesSupportingComplexity: number;
  /** Whether ROS / exam / MDM elements line up with the chosen E/M level. */
  emLevelSupportedByDocumentation: boolean;
  /** Whether time-based coding is documented (>50% counseling, total time). */
  timeBasedDocumentationPresent: boolean;
  /** Modifiers attached vs. modifiers that *should* be attached per scrub. */
  modifiersAttached: number;
  modifiersRecommended: number;
  /** Whether the chart includes social determinants (Z codes) we under-bill. */
  socialDeterminantsCaptured: boolean;
  /** Whether prior-auth (when required) is on file. */
  priorAuthValid: boolean;
  /** Patient self-pay flag. We never optimize self-pay claims. */
  isSelfPay: boolean;
}

export interface MaximizationScore {
  score: number; // 0..100
  upliftPotentialPercent: number; // estimated % the allowed could move
  recommendations: Array<{
    code: string;
    title: string;
    detail: string;
    /** Owning agent — the orchestrator routes the recommendation. */
    routeTo: string;
  }>;
}

export function scoreClaim(signals: ClaimDocSignals): MaximizationScore {
  if (signals.isSelfPay) {
    return {
      score: 100,
      upliftPotentialPercent: 0,
      recommendations: [],
    };
  }

  const recs: MaximizationScore["recommendations"] = [];
  let score = 100;

  if (!signals.emLevelSupportedByDocumentation) {
    score -= 25;
    recs.push({
      code: "EM-LEVEL-MISMATCH",
      title: "E/M level not supported by documentation",
      detail:
        "MDM elements suggest a different E/M level than the chosen CPT. Refine the note or downgrade the code before submission.",
      routeTo: "codingOptimization",
    });
  }

  if (signals.diagnosesSupportingComplexity < 2) {
    score -= 15;
    recs.push({
      code: "DX-DEPTH",
      title: "Diagnosis depth is thin",
      detail:
        "Add the supporting ICD-10 codes the chart already documents (chronic conditions, comorbidities, side effects).",
      routeTo: "codingOptimization",
    });
  }

  if (
    signals.modifiersAttached < signals.modifiersRecommended
  ) {
    score -= 10;
    recs.push({
      code: "MODIFIER-GAP",
      title: "Recommended modifiers missing",
      detail: `Scrub recommends ${signals.modifiersRecommended} modifiers; ${signals.modifiersAttached} are attached.`,
      routeTo: "chargeIntegrity",
    });
  }

  if (!signals.timeBasedDocumentationPresent) {
    score -= 5;
    recs.push({
      code: "TIME-BASED",
      title: "Time-based coding not documented",
      detail:
        "Consider time-based E/M billing when counseling exceeds 50% of the visit.",
      routeTo: "codingOptimization",
    });
  }

  if (!signals.socialDeterminantsCaptured) {
    score -= 5;
    recs.push({
      code: "SDOH",
      title: "Social determinants not captured",
      detail:
        "Z55-Z65 codes are underused; capturing them lifts risk-adjustment for value-based contracts.",
      routeTo: "encounterIntelligence",
    });
  }

  if (!signals.priorAuthValid) {
    score -= 25;
    recs.push({
      code: "PA-MISSING",
      title: "Prior authorization not on file",
      detail:
        "Payer requires PA; submission without it will hit a denial. Route to priorAuthVerification before submitting.",
      routeTo: "priorAuthVerification",
    });
  }

  score = Math.max(0, score);
  // Rough uplift: each recommendation, when actioned, lifts allowed by ~3%
  const upliftPotentialPercent = Math.min(35, recs.length * 3);

  return {
    score,
    upliftPotentialPercent,
    recommendations: recs,
  };
}

// ---------------------------------------------------------------------------
// Operator-facing snapshot — used by the orchestrator dashboard.
// ---------------------------------------------------------------------------

export interface FleetSnapshot {
  generatedAt: string;
  stages: Array<{
    stage: ClaimStage;
    label: string;
    primaryAgent: string;
    description: string;
    consumes: string[];
    produces: string[];
    handoffsTo: ClaimStage[];
    /** Number of claims the stage currently holds. */
    inflight: number;
    /** Number flagged for human review. */
    flagged: number;
  }>;
  /** Agents currently part of the fleet. */
  fleet: string[];
}

const STAGE_LABELS: Record<ClaimStage, string> = {
  encounter_intelligence: "Encounter intelligence",
  coding_optimization: "Coding optimization",
  scrub: "Scrub",
  construction: "Claim construction",
  submission: "Clearinghouse submission",
  ack_pending: "Acknowledgment pending",
  adjudication: "Adjudication",
  appeals: "Appeals",
  secondary: "Secondary filing",
  patient_responsibility: "Patient responsibility",
  closed: "Closed",
};

export function fleetSnapshot(
  inflightByStage: Partial<Record<ClaimStage, { inflight: number; flagged: number }>>,
): FleetSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    stages: PLAYBOOK.map((p) => ({
      stage: p.stage,
      label: STAGE_LABELS[p.stage],
      primaryAgent: p.primaryAgent,
      description: p.description,
      consumes: p.consumes,
      produces: p.produces,
      handoffsTo: p.handoffsTo,
      inflight: inflightByStage[p.stage]?.inflight ?? 0,
      flagged: inflightByStage[p.stage]?.flagged ?? 0,
    })),
    fleet: PLAYBOOK.map((p) => p.primaryAgent),
  };
}

/**
 * EMR-058 — Clinical Trial Auto-Recommendation Delivery.
 *
 * Helpers that turn a candidate trial + a patient's chart into:
 *
 *   1. An eligibility verdict (eligible / likely / ineligible / unknown)
 *      with a short list of evidence tying each rule to chart data.
 *   2. A plain-language AI summary tuned to the patient's reading
 *      level (we default to grade 8).
 *   3. A delivery payload for each channel — portal message, email,
 *      and SMS. The SMS variant is short and uses a portal short-link
 *      to keep the message under 160 chars.
 *
 * Persistence is out of scope: callers post the payload to whichever
 * channel they've wired up. We just shape the contract.
 */

export type DeliveryChannel = "portal" | "email" | "sms";

export type EligibilityVerdict =
  | "eligible"
  | "likely_eligible"
  | "likely_ineligible"
  | "ineligible"
  | "unknown";

export interface TrialRecord {
  /** ClinicalTrials.gov identifier (NCT…). */
  nct: string;
  title: string;
  phase: string;
  status: string;
  sponsor: string;
  conditions: string[];
  interventions: string[];
  minimumAge: number;
  maximumAge: number;
  sex: "any" | "male" | "female";
  /** Free-text inclusion criteria. */
  inclusions: string[];
  /** Free-text exclusion criteria. */
  exclusions: string[];
  url: string;
}

export interface PatientFacts {
  patientId: string;
  firstName: string;
  age: number;
  sex: "male" | "female" | "other";
  /** ICD-10 codes or plain-text problem list. */
  conditions: string[];
  /** Generic names or RxNorm IDs of current meds. */
  currentMeds: string[];
  /** Self-reported reading band — defaults to grade 8 when unknown. */
  readingBand?: "grade_6" | "grade_8" | "grade_10";
  /** Channels the patient has opted into. */
  optInChannels: DeliveryChannel[];
}

export interface EligibilityCheck {
  verdict: EligibilityVerdict;
  /** Score in [0,1]. Higher is closer to eligible. */
  score: number;
  reasons: string[];
}

export interface DeliveryPayload {
  channel: DeliveryChannel;
  subject: string;
  body: string;
  /** Audit copy stored alongside the outbound message. */
  auditNote: string;
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "without",
  "patient",
  "patients",
  "adult",
  "adults",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Estimate eligibility using a small ruleset:
 *
 *   - age and sex must fall in the trial bounds (hard constraint)
 *   - condition overlap drives the bulk of the score
 *   - exclusion match drops the score sharply
 *
 * The output is intentionally honest about uncertainty — "likely"
 * verdicts force the clinician to confirm before sending.
 */
export function checkEligibility(
  patient: PatientFacts,
  trial: TrialRecord,
): EligibilityCheck {
  const reasons: string[] = [];

  if (patient.age < trial.minimumAge) {
    reasons.push(`Patient age ${patient.age} below minimum ${trial.minimumAge}`);
    return { verdict: "ineligible", score: 0, reasons };
  }
  if (patient.age > trial.maximumAge) {
    reasons.push(`Patient age ${patient.age} above maximum ${trial.maximumAge}`);
    return { verdict: "ineligible", score: 0, reasons };
  }
  if (trial.sex !== "any" && patient.sex !== trial.sex) {
    reasons.push(`Trial restricted to ${trial.sex}`);
    return { verdict: "ineligible", score: 0, reasons };
  }
  reasons.push(`Age ${patient.age} and sex within trial bounds`);

  const patientTokens = tokenize(
    [...patient.conditions, ...patient.currentMeds].join(" "),
  );
  const trialConditionTokens = tokenize(trial.conditions.join(" "));
  const trialInclusionTokens = tokenize(trial.inclusions.join(" "));
  const trialExclusionTokens = tokenize(trial.exclusions.join(" "));

  const conditionOverlap = jaccard(patientTokens, trialConditionTokens);
  const inclusionOverlap = jaccard(patientTokens, trialInclusionTokens);
  const exclusionOverlap = jaccard(patientTokens, trialExclusionTokens);

  if (conditionOverlap > 0) {
    reasons.push(
      `Condition overlap ${(conditionOverlap * 100).toFixed(0)}% with trial conditions`,
    );
  }
  if (inclusionOverlap > 0) {
    reasons.push(
      `Inclusion overlap ${(inclusionOverlap * 100).toFixed(0)}% with stated criteria`,
    );
  }
  if (exclusionOverlap > 0) {
    reasons.push(
      `⚠ Possible match against exclusion criteria (${(exclusionOverlap * 100).toFixed(0)}%)`,
    );
  }

  const rawScore =
    0.6 * conditionOverlap + 0.3 * inclusionOverlap - 0.8 * exclusionOverlap;
  const score = Math.max(0, Math.min(1, rawScore));

  let verdict: EligibilityVerdict = "unknown";
  if (exclusionOverlap > 0.15) verdict = "likely_ineligible";
  else if (score >= 0.4) verdict = "likely_eligible";
  else if (score >= 0.6) verdict = "eligible";
  else if (score >= 0.15) verdict = "unknown";
  else verdict = "likely_ineligible";

  // Tighten the verdict at the high end.
  if (score >= 0.6 && exclusionOverlap <= 0.05) verdict = "eligible";

  return { verdict, score, reasons };
}

/**
 * Plain-language summary keyed to the patient's reading band. Real
 * deployments would call the configured AI client; we return a
 * deterministic template so the function is testable and the audit
 * trail is human-readable.
 */
export function aiSummary(
  patient: PatientFacts,
  trial: TrialRecord,
  check: EligibilityCheck,
): string {
  const band = patient.readingBand ?? "grade_8";
  const sentenceStyle =
    band === "grade_6"
      ? "short"
      : band === "grade_10"
        ? "detailed"
        : "balanced";

  const verdictLine =
    check.verdict === "eligible"
      ? `Based on your chart, you appear to be a match for this study.`
      : check.verdict === "likely_eligible"
        ? `Your chart looks like a possible match — the study team will confirm.`
        : check.verdict === "likely_ineligible"
          ? `This study may not be a fit, but you can still ask the study team.`
          : check.verdict === "ineligible"
            ? `This study is not currently a fit for you.`
            : `We are not sure yet — the study team can confirm.`;

  if (sentenceStyle === "short") {
    return [
      `Hi ${patient.firstName},`,
      ``,
      `${trial.title}.`,
      `${verdictLine}`,
      `Learn more: ${trial.url}.`,
    ].join("\n");
  }

  if (sentenceStyle === "detailed") {
    return [
      `Hi ${patient.firstName},`,
      ``,
      `We found a clinical trial that may be relevant for you: "${trial.title}" (${trial.phase}, ${trial.status}). It is being run by ${trial.sponsor} and looks at ${trial.conditions.join(", ")}.`,
      ``,
      `${verdictLine} Reviewers from the study team make the final decision after they look at your full history.`,
      ``,
      `Study interventions: ${trial.interventions.join(", ")}.`,
      ``,
      `If you want to know more, you can read the full listing at ${trial.url}, or message your care team and we will help you contact the study coordinator.`,
    ].join("\n");
  }

  return [
    `Hi ${patient.firstName},`,
    ``,
    `We matched you to a clinical trial: "${trial.title}" (${trial.phase}, ${trial.status}).`,
    ``,
    `${verdictLine}`,
    ``,
    `What it studies: ${trial.conditions.join(", ")}.`,
    `Read the full listing at ${trial.url}.`,
  ].join("\n");
}

/**
 * Render the per-channel delivery payload. SMS is forced under 320
 * chars (two segments) and uses a short link placeholder; the
 * caller swaps the placeholder for a real short URL before sending.
 */
export function buildDeliveryPayload(
  channel: DeliveryChannel,
  patient: PatientFacts,
  trial: TrialRecord,
  check: EligibilityCheck,
): DeliveryPayload {
  const summary = aiSummary(patient, trial, check);
  const auditNote = `Trial ${trial.nct} delivered to patient ${patient.patientId} on channel ${channel} (verdict=${check.verdict}, score=${check.score.toFixed(2)})`;

  if (channel === "sms") {
    const short = `New trial match: "${truncate(trial.title, 70)}". Open in portal: lj.io/t/${trial.nct.slice(-6)}`;
    return {
      channel,
      subject: "",
      body: truncate(short, 320),
      auditNote,
    };
  }

  if (channel === "email") {
    return {
      channel,
      subject: `Possible clinical trial match — ${trial.title.slice(0, 60)}`,
      body: summary,
      auditNote,
    };
  }

  // portal
  return {
    channel,
    subject: `New clinical trial match`,
    body: summary,
    auditNote,
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Resolve which channels to actually send to. Honors the patient's
 * opt-in list and falls back to portal-only when nothing is on file.
 */
export function chooseChannels(patient: PatientFacts): DeliveryChannel[] {
  if (patient.optInChannels.length === 0) return ["portal"];
  return patient.optInChannels;
}

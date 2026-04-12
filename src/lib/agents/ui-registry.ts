/**
 * UI-facing agent metadata.
 *
 * The backend agent registry (`src/lib/agents/index.ts`) defines how agents
 * RUN. This file defines how they APPEAR — their display name, the one-line
 * description a clinician sees on hover, their glyph character, and their
 * accent color.
 *
 * Rule: every approval-gated agent SHOULD have an entry here. Any agent that
 * can produce output a human sees should have a friendly name and a blurb
 * short enough to fit in a tooltip. We want agents to feel like named
 * colleagues, not anonymous automations.
 */
export interface AgentUIMeta {
  /** Machine name that matches the agent registry key */
  key: string;
  /** Human-friendly display name (e.g. "Nurse Nora") */
  displayName: string;
  /** Role / subtitle shown under the display name */
  role: string;
  /** One-line purpose blurb shown on hover */
  blurb: string;
  /**
   * A single glyph used as the agent's avatar when no image is available.
   * Typically an initial or a symbol.
   */
  glyph: string;
  /**
   * Accent color key. Maps to Tailwind classes via the `AGENT_TONE` helper
   * so we stay consistent with the Verdant Apothecary design system.
   */
  tone: "accent" | "highlight" | "info" | "success" | "warning";
}

export const AGENT_UI: Record<string, AgentUIMeta> = {
  correspondenceNurse: {
    key: "correspondenceNurse",
    displayName: "Nurse Nora",
    role: "Correspondence Nurse",
    blurb:
      "Triages inbound patient messages for urgency and safety, then drafts clinically appropriate responses using the patient's full chart.",
    glyph: "N",
    tone: "accent",
  },
  scribe: {
    key: "scribe",
    displayName: "Scribe",
    role: "Clinical Documentation",
    blurb:
      "Listens to the visit transcript and composes a structured SOAP note for your review. You sign, you own.",
    glyph: "S",
    tone: "info",
  },
  messagingAssistant: {
    key: "messagingAssistant",
    displayName: "Messaging Assistant",
    role: "Patient Communications",
    blurb:
      "Drafts general patient-facing messages — follow-ups, appointment confirmations, gentle nudges.",
    glyph: "M",
    tone: "accent",
  },
  patientOutreach: {
    key: "patientOutreach",
    displayName: "Outreach",
    role: "Proactive Outreach",
    blurb:
      "Reaches out to patients who've gone quiet, are due for a refill check-in, or need an outcome follow-up.",
    glyph: "O",
    tone: "highlight",
  },
  patientCollections: {
    key: "patientCollections",
    displayName: "Billing Coordinator",
    role: "Revenue Cycle",
    blurb:
      "Drafts patient-facing balance reminders and payment plan offers. Never threatens. Never cold.",
    glyph: "B",
    tone: "warning",
  },
  intake: {
    key: "intake",
    displayName: "Intake",
    role: "New Patient Onboarding",
    blurb:
      "Reviews new intake submissions, structures the information, and flags anything a provider should see first.",
    glyph: "I",
    tone: "info",
  },
  documentOrganizer: {
    key: "documentOrganizer",
    displayName: "File Clerk",
    role: "Document Organization",
    blurb:
      "Files uploaded records, classifies them, and extracts the key values that matter for care.",
    glyph: "F",
    tone: "info",
  },
  outcomeTracker: {
    key: "outcomeTracker",
    displayName: "Outcome Tracker",
    role: "Longitudinal Trends",
    blurb:
      "Watches for changes in pain, sleep, anxiety, and function scores. Escalates meaningful shifts.",
    glyph: "T",
    tone: "success",
  },
  codingReadiness: {
    key: "codingReadiness",
    displayName: "Coding Review",
    role: "Billing Compliance",
    blurb:
      "Checks that finished notes include the documentation needed to support the billed codes.",
    glyph: "C",
    tone: "warning",
  },
  preVisitIntelligence: {
    key: "preVisitIntelligence",
    displayName: "Visit Prep",
    role: "Pre-Visit Intelligence",
    blurb:
      "Prepares a clinician briefing for each upcoming visit: what's changed, what to ask, what needs attention.",
    glyph: "V",
    tone: "accent",
  },
  physicianNudge: {
    key: "physicianNudge",
    displayName: "Coach",
    role: "Physician Nudges",
    blurb:
      "Surfaces gentle reminders — unsigned notes, unreviewed results, patients overdue for a touchpoint.",
    glyph: "G",
    tone: "highlight",
  },
  scheduling: {
    key: "scheduling",
    displayName: "Scheduler",
    role: "Calendar Coordination",
    blurb:
      "Proposes appointment times that fit both the provider's preferences and the patient's needs.",
    glyph: "K",
    tone: "info",
  },
  researchSynthesizer: {
    key: "researchSynthesizer",
    displayName: "Research",
    role: "Literature Synthesis",
    blurb:
      "Surfaces relevant studies and guideline updates for the question or condition you're considering.",
    glyph: "R",
    tone: "info",
  },
  fairytaleSummary: {
    key: "fairytaleSummary",
    displayName: "Fairytale",
    role: "Pediatric Translation",
    blurb:
      "Rewrites complex visit summaries as age-appropriate stories for young patients and their families.",
    glyph: "P",
    tone: "highlight",
  },
  denialTriage: {
    key: "denialTriage",
    displayName: "Denial Triage",
    role: "Revenue Cycle",
    blurb:
      "Triages denied claims, identifies the root cause, and drafts an appeal or corrected claim.",
    glyph: "D",
    tone: "warning",
  },
  chargeIntegrity: {
    key: "chargeIntegrity",
    displayName: "Charge Integrity",
    role: "Revenue Cycle",
    blurb:
      "Audits encounter charges against documentation to catch missed revenue and unsupported codes.",
    glyph: "$",
    tone: "warning",
  },
  revenueCommand: {
    key: "revenueCommand",
    displayName: "Revenue Command",
    role: "Revenue Strategy",
    blurb:
      "Reports on financial health and flags the 2–3 levers that would materially move the practice forward.",
    glyph: "R",
    tone: "warning",
  },
  // RCM Fleet — Phase 5
  encounterIntelligence: {
    key: "encounterIntelligence",
    displayName: "Charge Capture",
    role: "Encounter Intelligence",
    blurb:
      "Extracts billable services from clinical documentation. Creates charges from encounter notes so nothing gets missed.",
    glyph: "E",
    tone: "warning",
  },
  codingOptimization: {
    key: "codingOptimization",
    displayName: "Code Optimizer",
    role: "Coding Optimization",
    blurb:
      "Reviews and optimizes CPT/ICD-10 codes for compliant reimbursement. The highest code the documentation supports — no more, no less.",
    glyph: "Cx",
    tone: "warning",
  },
  claimConstruction: {
    key: "claimConstruction",
    displayName: "Claim Builder",
    role: "Claim Construction",
    blurb:
      "Assembles coded charges into a valid professional claim with patient, provider, and coverage data. The claim factory.",
    glyph: "CB",
    tone: "warning",
  },
  // RCM Fleet — Phase 7
  adjudicationInterpretation: {
    key: "adjudicationInterpretation",
    displayName: "ERA Reader",
    role: "Adjudication Interpretation",
    blurb:
      "Parses payer decisions from ERA/835 responses. Matches payments to claims, detects denials, and routes everything downstream.",
    glyph: "AR",
    tone: "warning",
  },
  priorAuthVerification: {
    key: "priorAuthVerification",
    displayName: "Prior Auth",
    role: "Authorization Verification",
    blurb:
      "Tracks prior authorization status for services that require it. Attaches auth numbers to claims before submission.",
    glyph: "PA",
    tone: "info",
  },
  clearinghouseSubmission: {
    key: "clearinghouseSubmission",
    displayName: "Submission",
    role: "Clearinghouse Submission",
    blurb:
      "Formats claims as 837P transactions and submits to the clearinghouse. Parses acceptance and rejection responses.",
    glyph: "TX",
    tone: "info",
  },
  eligibilityBenefits: {
    key: "eligibilityBenefits",
    displayName: "Eligibility Check",
    role: "Eligibility & Benefits",
    blurb:
      "Verifies patient insurance coverage before claims enter the pipeline. Catches eligibility-based denials at the source.",
    glyph: "EB",
    tone: "info",
  },
  complianceAudit: {
    key: "complianceAudit",
    displayName: "Compliance",
    role: "Compliance & Audit",
    blurb:
      "Monitors billing patterns for upcoding, modifier abuse, and frequency anomalies. Flags risks for human review — never blocks claims alone.",
    glyph: "CA",
    tone: "warning",
  },
  denialResolution: {
    key: "denialResolution",
    displayName: "Denial Resolver",
    role: "Denial Resolution",
    blurb:
      "Classifies denials by CARC code and routes to the right action: auto-correct + resubmit, appeal, contractual adjustment, or human escalation. Learns payer patterns over time.",
    glyph: "DR",
    tone: "warning",
  },
  appealsGeneration: {
    key: "appealsGeneration",
    displayName: "Appeals",
    role: "Appeals Generation",
    blurb:
      "Drafts appeal letters for denied claims worth pursuing. Attaches supporting clinical documentation and routes for review when the stakes are high.",
    glyph: "AP",
    tone: "warning",
  },
};

/** Fallback metadata when an agent appears in the UI but isn't registered. */
export const UNKNOWN_AGENT: AgentUIMeta = {
  key: "unknown",
  displayName: "AI Assistant",
  role: "Automated",
  blurb:
    "An AI agent produced this output. Every action is logged and can be reviewed.",
  glyph: "·",
  tone: "accent",
};

/**
 * Look up agent UI metadata from a `senderAgent` string in the format
 * "agentName:version" (e.g. "correspondenceNurse:1.0.0") OR a bare agent name.
 */
export function resolveAgentMeta(
  senderAgent: string | null | undefined,
): AgentUIMeta {
  if (!senderAgent) return UNKNOWN_AGENT;
  const key = senderAgent.split(":")[0] ?? senderAgent;
  return AGENT_UI[key] ?? { ...UNKNOWN_AGENT, key };
}

/** Tailwind class fragments for the agent tone system. Keep in one place. */
export const AGENT_TONE: Record<
  AgentUIMeta["tone"],
  {
    /** Background of the agent's avatar circle */
    avatarBg: string;
    /** Text color of the glyph */
    avatarText: string;
    /** Subtle background used behind the signal chip */
    chipBg: string;
    /** Text color used for the chip */
    chipText: string;
    /** Border color */
    border: string;
    /** Faint tint used for the review card */
    cardTint: string;
  }
> = {
  accent: {
    avatarBg: "bg-accent",
    avatarText: "text-white",
    chipBg: "bg-accent-soft",
    chipText: "text-accent",
    border: "border-accent/30",
    cardTint: "bg-accent/[0.03]",
  },
  highlight: {
    avatarBg: "bg-highlight",
    avatarText: "text-white",
    chipBg: "bg-highlight-soft",
    chipText: "text-[color:var(--highlight-hover)]",
    border: "border-highlight/30",
    cardTint: "bg-highlight/[0.04]",
  },
  info: {
    avatarBg: "bg-info",
    avatarText: "text-white",
    chipBg: "bg-blue-50",
    chipText: "text-info",
    border: "border-blue-200",
    cardTint: "bg-blue-50/40",
  },
  success: {
    avatarBg: "bg-success",
    avatarText: "text-white",
    chipBg: "bg-[color:var(--accent-soft)]",
    chipText: "text-success",
    border: "border-[color:var(--success)]/25",
    cardTint: "bg-[color:var(--success)]/[0.03]",
  },
  warning: {
    avatarBg: "bg-[color:var(--warning)]",
    avatarText: "text-white",
    chipBg: "bg-highlight-soft",
    chipText: "text-[color:var(--highlight-hover)]",
    border: "border-highlight/30",
    cardTint: "bg-highlight/[0.04]",
  },
};

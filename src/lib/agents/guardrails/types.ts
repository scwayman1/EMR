// ---------------------------------------------------------------------------
// EMR-304 — AI agent differentiation guardrails: shared types
// ---------------------------------------------------------------------------
// Leafjourney runs many AI surfaces against the same patient population.
// A clinician asking about dose titration in the chart needs a very
// different voice and scope than a consumer asking "what's CBD?" on the
// public Education page. Shipping every agent against a single system
// prompt has burned us twice: consumer chat answered with PHI-shaped
// phrasing, and the clinician scribe answered like a marketing FAQ.
//
// These types are the contract every agent imports so the differentiation
// is *enforced at the type level* — an agent declaring `audience: "consumer"`
// can never silently consume a `ClinicalContext`, and the refusal builder
// always knows which voice to use.
// ---------------------------------------------------------------------------

/** Who the agent is talking to. Drives voice, scope, and refusal copy. */
export type AgentAudience = "clinician" | "consumer" | "patient" | "operator";

/** What surface the agent lives on. Lets us scope refusals more precisely. */
export type AgentSurface =
  | "ask-cindy" // public landing-page chatbot
  | "chatcb" // public ChatCB cannabis search
  | "scribe" // clinical documentation
  | "messaging" // patient↔clinic messaging assistant
  | "education-tutor" // curriculum tutor for clinicians
  | "ops-copilot"; // operator console

/** Topical buckets the rules engine reasons about. */
export type GuardrailTopic =
  | "diagnosis"
  | "dose-recommendation"
  | "medication-change"
  | "phi-lookup"
  | "general-cannabis-education"
  | "product-recommendation"
  | "legal-status"
  | "self-harm"
  | "pediatric"
  | "pregnancy"
  | "drug-interaction"
  | "billing"
  | "operational";

/** Structured context the rules engine evaluates against. */
export interface GuardrailContext {
  audience: AgentAudience;
  surface: AgentSurface;
  /** Lower-cased free text from the user. Optional — some checks are surface-only. */
  utterance?: string;
  /** True if the request originated from an authenticated session. */
  authenticated?: boolean;
  /** True if there is a clinician in the loop reviewing the agent's output. */
  hasClinicianReview?: boolean;
}

/** The result of evaluating a request against the guardrail rules. */
export interface GuardrailDecision {
  /** Allow → answer normally. Refuse → emit a refusal. Defer → hand off. */
  action: "allow" | "refuse" | "defer";
  /** Topics the rule engine matched, for telemetry + UI badges. */
  topics: GuardrailTopic[];
  /** Stable id of the rule that produced the decision (or "default-allow"). */
  ruleId: string;
  /** One-line explanation, safe to surface to operators (not patients). */
  reason: string;
  /** When `action !== "allow"`, the audience-appropriate copy to surface. */
  refusal?: { en: string; es: string };
  /** When `action === "defer"`, who to hand off to. */
  handoffTo?: "clinician" | "human-ops" | "emergency";
}

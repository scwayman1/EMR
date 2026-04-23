// BYOK — Bring Your Own Key / Model Selection
// Let practices configure their AI model provider and API key, plus pick a
// model per agent in the 50+ agent fleet. Pricing logic baked in:
// Leafjourney keystones — patients/practices pay MAX($20/mo, 2x raw cost).

export type ModelProvider = "openrouter" | "openai" | "anthropic" | "local" | "stub";

/** Tiers help the UI group models and default assignments per agent. */
export type ModelTier = "budget" | "balanced" | "premium" | "open-source";

export interface ModelOption {
  id: string;
  name: string;
  /** Blended cost in USD per 1k tokens (input + output averaged). */
  costPer1kTokens: number;
  tier: ModelTier;
  recommended?: boolean;
  /** One-line "what this model is good at" — rendered in the picker. */
  blurb?: string;
}

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  apiKeySet: boolean;
  isDefault: boolean;
  costPer1kTokens?: number;
  maxTokens: number;
  temperature: number;
}

export interface ProviderOption {
  provider: ModelProvider;
  label: string;
  description: string;
  models: ModelOption[];
  requiresApiKey: boolean;
}

// ── Available providers ────────────────────────────────
// OpenRouter gets the widest catalog (budget → premium + open source)
// so practices can mix cost and quality per agent.

export const PROVIDERS: ProviderOption[] = [
  {
    provider: "openrouter",
    label: "OpenRouter",
    description: "Access 100+ models through a single API. Recommended — one key, every model.",
    requiresApiKey: true,
    models: [
      // Budget
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", costPer1kTokens: 0.0001, tier: "budget", recommended: true, blurb: "Fast, cheap, very capable. Default for most agents." },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", costPer1kTokens: 0.00015, tier: "budget", blurb: "OpenAI's cost-efficient workhorse." },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", costPer1kTokens: 0.00019, tier: "budget", blurb: "Newer flash tier with stronger reasoning." },

      // Balanced
      { id: "anthropic/claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", costPer1kTokens: 0.0008, tier: "balanced", blurb: "Fast Claude — great for messaging, drafting, triage." },
      { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", costPer1kTokens: 0.0012, tier: "balanced", blurb: "Balanced OpenAI model — strong clinical reasoning." },
      { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", costPer1kTokens: 0.003, tier: "balanced", recommended: true, blurb: "The Leafjourney clinical workhorse." },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", costPer1kTokens: 0.004, tier: "balanced", blurb: "Strong long-context and multimodal reasoning." },

      // Premium
      { id: "openai/gpt-4o", name: "GPT-4o", costPer1kTokens: 0.005, tier: "premium", blurb: "Flagship multimodal." },
      { id: "openai/gpt-4.1", name: "GPT-4.1", costPer1kTokens: 0.008, tier: "premium", blurb: "High-quality OpenAI — use for dense coding + scribe." },
      { id: "anthropic/claude-opus-4-7", name: "Claude Opus 4.7", costPer1kTokens: 0.018, tier: "premium", blurb: "Highest-quality Claude. Best for nuanced cases + safety." },
      { id: "openai/o3", name: "o3 Reasoning", costPer1kTokens: 0.02, tier: "premium", blurb: "Deep reasoning for edge-case decision support." },

      // Open source
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", costPer1kTokens: 0.0004, tier: "open-source", blurb: "Meta's flagship open model — privacy-friendly deployments." },
      { id: "mistralai/mistral-large-2411", name: "Mistral Large 2411", costPer1kTokens: 0.002, tier: "open-source", blurb: "Strong European open-weights alternative." },
      { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", costPer1kTokens: 0.0004, tier: "open-source", blurb: "Alibaba's open model — strong at structured output." },
      { id: "deepseek/deepseek-v3", name: "DeepSeek V3", costPer1kTokens: 0.00028, tier: "open-source", blurb: "Cost-efficient frontier-grade open model." },
      { id: "google/gemma-2-27b-it", name: "Gemma 2 27B", costPer1kTokens: 0.00027, tier: "open-source", blurb: "Google's small but capable open weights." },
      { id: "microsoft/phi-4", name: "Phi-4", costPer1kTokens: 0.00014, tier: "open-source", blurb: "Tiny and mighty — great for lightweight agents." },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic (Direct)",
    description: "Direct Claude access. Best quality for clinical documentation and safety-critical agents.",
    requiresApiKey: true,
    models: [
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", costPer1kTokens: 0.0008, tier: "balanced" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", costPer1kTokens: 0.003, tier: "balanced", recommended: true },
      { id: "claude-opus-4-7", name: "Claude Opus 4.7", costPer1kTokens: 0.018, tier: "premium" },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI (Direct)",
    description: "Direct access to GPT and o-series models.",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini", costPer1kTokens: 0.00015, tier: "budget" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", costPer1kTokens: 0.0012, tier: "balanced" },
      { id: "gpt-4o", name: "GPT-4o", costPer1kTokens: 0.005, tier: "premium", recommended: true },
      { id: "gpt-4.1", name: "GPT-4.1", costPer1kTokens: 0.008, tier: "premium" },
      { id: "o3", name: "o3 Reasoning", costPer1kTokens: 0.02, tier: "premium" },
    ],
  },
  {
    provider: "local",
    label: "Local / Self-Hosted",
    description: "Ollama, vLLM, or any OpenAI-compatible endpoint. Data never leaves your network.",
    requiresApiKey: false,
    models: [
      { id: "local/llama-3.3-70b", name: "Llama 3.3 70B (local)", costPer1kTokens: 0, tier: "open-source" },
      { id: "local/mistral-large", name: "Mistral Large (local)", costPer1kTokens: 0, tier: "open-source" },
      { id: "local/default", name: "Local model", costPer1kTokens: 0, tier: "open-source" },
    ],
  },
  {
    provider: "stub",
    label: "Demo Mode (No AI)",
    description: "Deterministic responses for testing. No API key required.",
    requiresApiKey: false,
    models: [
      { id: "stub", name: "Stub model", costPer1kTokens: 0, tier: "budget" },
    ],
  },
];

export function getDefaultConfig(): ModelConfig {
  return {
    provider: "openrouter",
    modelId: "google/gemini-2.0-flash-001",
    displayName: "Gemini 2.0 Flash (via OpenRouter)",
    apiKeySet: false,
    isDefault: true,
    costPer1kTokens: 0.0001,
    maxTokens: 1024,
    temperature: 0.3,
  };
}

// ── Pricing ─────────────────────────────────────────────
// Leafjourney keystones: the practice-facing price is always the greater of
// our $20/mo platform floor or 2x the raw model cost. We pass through cost +
// double it as margin. Below $10 raw → floor wins. Above $10 raw → 2x wins.

export const LEAFJOURNEY_PRICE_FLOOR_USD = 20;
export const LEAFJOURNEY_PRICE_MULTIPLIER = 2;

/** Turn a raw monthly model cost (USD) into the Leafjourney-billed price. */
export function leafjourneyMonthlyPrice(rawMonthlyCostUsd: number): number {
  const doubled = rawMonthlyCostUsd * LEAFJOURNEY_PRICE_MULTIPLIER;
  return Math.max(LEAFJOURNEY_PRICE_FLOOR_USD, doubled);
}

/** Which side of the keystone/floor the price is on (for UI explanation). */
export function leafjourneyPriceBasis(rawMonthlyCostUsd: number): "floor" | "keystone" {
  return rawMonthlyCostUsd * LEAFJOURNEY_PRICE_MULTIPLIER >= LEAFJOURNEY_PRICE_FLOOR_USD
    ? "keystone"
    : "floor";
}

// ── Agent fleet catalog ─────────────────────────────────
// Used by the per-agent configurator. Categories drive UI grouping; default
// tier drives the sensible starting assignment when a practice hasn't set
// an override. Token estimates are calibrated from observed traffic.

export type AgentCategory =
  | "clinical"
  | "patient"
  | "billing"
  | "operations"
  | "safety"
  | "commerce"
  | "research";

export interface AgentCatalogEntry {
  /** Must match a key in agentRegistry (src/lib/agents/index.ts). */
  id: string;
  displayName: string;
  description: string;
  category: AgentCategory;
  /** Default model tier — used when no per-agent override is set. */
  defaultTier: ModelTier;
  /** Rough tokens per month at typical small-practice volume. */
  estimatedTokensPerMonth: number;
  /** True → this agent meaningfully benefits from a premium model. */
  qualitySensitive?: boolean;
}

export const AGENT_CATALOG: AgentCatalogEntry[] = [
  // Clinical
  { id: "scribe", displayName: "Scribe", description: "Drafts APSO visit notes from encounter context.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 600_000, qualitySensitive: true },
  { id: "preVisitIntelligence", displayName: "Pre-Visit Intelligence", description: "Synthesizes chart + cohort into a briefing before every visit.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 400_000, qualitySensitive: true },
  { id: "codingReadiness", displayName: "Coding Readiness", description: "ICD-10, CPT, E&M suggestions on finalized notes.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 250_000, qualitySensitive: true },
  { id: "dosingRecommendation", displayName: "Dosing Recommendation", description: "Cannabinoid ratios + starting doses from the research corpus.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 180_000, qualitySensitive: true },
  { id: "researchSynthesizer", displayName: "Research Synthesizer", description: "Point-of-care evidence across 50+ studies.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 220_000 },
  { id: "intake", displayName: "Intake", description: "Structures patient intake answers into chart data.", category: "clinical", defaultTier: "budget", estimatedTokensPerMonth: 150_000 },
  { id: "documentOrganizer", displayName: "Document Organizer", description: "Classifies and files uploaded documents.", category: "clinical", defaultTier: "budget", estimatedTokensPerMonth: 120_000 },
  { id: "outcomeTracker", displayName: "Outcome Tracker", description: "Detects trends in check-ins; flags worsening scores.", category: "clinical", defaultTier: "budget", estimatedTokensPerMonth: 180_000 },
  { id: "visitDiscoveryWhisperer", displayName: "Visit Discovery", description: "Ambient signals before and during the visit.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 160_000 },
  { id: "labSummarizer", displayName: "Lab Summarizer", description: "Plain-language summaries of lab panels.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 140_000 },
  { id: "refillCopilot", displayName: "Refill Copilot", description: "Triage + one-click refill drafts for the care team.", category: "clinical", defaultTier: "budget", estimatedTokensPerMonth: 130_000 },
  { id: "fairytaleSummary", displayName: "Fairytale Summary", description: "Storybook-style chart summary for patients.", category: "clinical", defaultTier: "balanced", estimatedTokensPerMonth: 90_000 },

  // Patient-facing
  { id: "correspondenceNurse", displayName: "Nurse Nora (correspondence)", description: "Warm patient message drafts, memory-aware.", category: "patient", defaultTier: "balanced", estimatedTokensPerMonth: 500_000, qualitySensitive: true },
  { id: "messagingAssistant", displayName: "Messaging Assistant", description: "Generic messaging drafts, approval-gated.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 260_000 },
  { id: "patientOutreach", displayName: "Patient Outreach", description: "Post-encounter follow-up messages.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 200_000 },
  { id: "patientSimplifier", displayName: "Patient Simplifier", description: "3rd-grade reading-level explainers.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 180_000 },
  { id: "patientEducation", displayName: "Patient Education", description: "Personalized cannabis education content.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 150_000 },
  { id: "wellnessCoach", displayName: "Wellness Coach", description: "Lifestyle nudges tuned to the patient's voice.", category: "patient", defaultTier: "balanced", estimatedTokensPerMonth: 220_000 },
  { id: "refillReminder", displayName: "Refill Reminder", description: "Proactive refill check-ins.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 80_000 },
  { id: "appointmentReminder", displayName: "Appointment Reminder", description: "Scheduling reminders with warm tone.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 70_000 },
  { id: "labFollowup", displayName: "Lab Follow-up", description: "Explains labs + next steps to the patient.", category: "patient", defaultTier: "budget", estimatedTokensPerMonth: 110_000 },

  // Safety / clinical guardrails
  { id: "prescriptionSafety", displayName: "Prescription Safety", description: "Dose + interaction guardrails at prescribe time.", category: "safety", defaultTier: "premium", estimatedTokensPerMonth: 120_000, qualitySensitive: true },
  { id: "diagnosisSafety", displayName: "Diagnosis Safety", description: "Secondary check on differential + cannabis contraindications.", category: "safety", defaultTier: "premium", estimatedTokensPerMonth: 100_000, qualitySensitive: true },
  { id: "adherenceDriftDetector", displayName: "Adherence Drift", description: "Catches silent non-adherence.", category: "safety", defaultTier: "balanced", estimatedTokensPerMonth: 140_000 },
  { id: "messageUrgencyObserver", displayName: "Message Urgency", description: "Red-flag routing on patient messages.", category: "safety", defaultTier: "balanced", estimatedTokensPerMonth: 160_000, qualitySensitive: true },
  { id: "trendAlert", displayName: "Trend Alert", description: "Longitudinal symptom + regimen deterioration.", category: "safety", defaultTier: "balanced", estimatedTokensPerMonth: 130_000 },
  { id: "titration", displayName: "Titration", description: "Guided dose adjustment recommendations.", category: "safety", defaultTier: "balanced", estimatedTokensPerMonth: 110_000 },
  { id: "complianceAudit", displayName: "Compliance Audit", description: "Chart-wide compliance + documentation review.", category: "safety", defaultTier: "balanced", estimatedTokensPerMonth: 180_000 },

  // Billing (RCM fleet)
  { id: "encounterIntelligence", displayName: "Encounter Intelligence", description: "Pre-submission pipeline entry point.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 200_000 },
  { id: "codingOptimization", displayName: "Coding Optimization", description: "Maximizes defensible code capture.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 180_000, qualitySensitive: true },
  { id: "claimConstruction", displayName: "Claim Construction", description: "Builds clean 837 claims.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 150_000 },
  { id: "chargeIntegrity", displayName: "Charge Integrity", description: "Pre-bill scrub + missed charges.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 140_000 },
  { id: "eligibilityBenefits", displayName: "Eligibility & Benefits", description: "Real-time payer verification.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 100_000 },
  { id: "priorAuthVerification", displayName: "Prior Auth", description: "AI-drafted prior auth packets.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 90_000 },
  { id: "clearinghouseSubmission", displayName: "Clearinghouse Submission", description: "Submits + polls for 277/835.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 60_000 },
  { id: "adjudicationInterpretation", displayName: "Adjudication Interpretation", description: "Reads 835s into actionable state.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 130_000 },
  { id: "appealsGeneration", displayName: "Appeals Generation", description: "Drafts appeal packets with evidence.", category: "billing", defaultTier: "premium", estimatedTokensPerMonth: 140_000, qualitySensitive: true },
  { id: "denialResolution", displayName: "Denial Resolution", description: "Root-cause playbook per denial.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 160_000 },
  { id: "denialTriage", displayName: "Denial Triage", description: "Fast sort of incoming denials.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 110_000 },
  { id: "reconciliation", displayName: "Reconciliation", description: "Posts payments + reconciles exceptions.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 100_000 },
  { id: "aging", displayName: "Aging", description: "Follow-up queue over A/R buckets.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 80_000 },
  { id: "underpaymentDetection", displayName: "Underpayment Detection", description: "Spots payer underpayments vs. contracted rate.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 90_000 },
  { id: "refundCredit", displayName: "Refund / Credit", description: "Credit balance detection + routing.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 70_000 },
  { id: "revenueCommand", displayName: "Revenue Command", description: "Daily CFO briefing with anomaly detection.", category: "billing", defaultTier: "balanced", estimatedTokensPerMonth: 90_000, qualitySensitive: true },
  { id: "patientExplanation", displayName: "Patient Explanation (EOB)", description: "Explains statements + EOBs to the patient.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 110_000 },
  { id: "patientCollections", displayName: "Patient Collections", description: "Empathic outreach for balances.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 90_000 },
  { id: "billingReconEnhancement", displayName: "Recon Enhancement", description: "Enhanced ERA parsing + adjustments.", category: "billing", defaultTier: "budget", estimatedTokensPerMonth: 60_000 },

  // Operations
  { id: "practiceLaunch", displayName: "Practice Launch", description: "Onboarding checklist copilot.", category: "operations", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "physicianNudge", displayName: "Physician Nudge", description: "Follow-up tasks from note content.", category: "operations", defaultTier: "budget", estimatedTokensPerMonth: 100_000 },
  { id: "scheduling", displayName: "Scheduling", description: "Auto-creates reminder workflows.", category: "operations", defaultTier: "budget", estimatedTokensPerMonth: 80_000 },
  { id: "registry", displayName: "Registry / Qualification", description: "State-specific qualification rules.", category: "operations", defaultTier: "budget", estimatedTokensPerMonth: 50_000 },
  { id: "retentionRisk", displayName: "Retention Risk", description: "Flags patients at risk of churn.", category: "operations", defaultTier: "balanced", estimatedTokensPerMonth: 90_000 },
  { id: "satisfactionAnalysis", displayName: "Satisfaction Analysis", description: "Thematic rollup of feedback.", category: "operations", defaultTier: "balanced", estimatedTokensPerMonth: 70_000 },
  { id: "contentCreation", displayName: "Content Creation", description: "Marketing + education content drafts.", category: "operations", defaultTier: "balanced", estimatedTokensPerMonth: 80_000 },
  { id: "inventoryAlert", displayName: "Inventory Alert", description: "Supplies + consumables low-stock.", category: "operations", defaultTier: "budget", estimatedTokensPerMonth: 20_000 },
  { id: "qualityImprovement", displayName: "Quality Improvement", description: "QI projects + MIPS readiness.", category: "operations", defaultTier: "balanced", estimatedTokensPerMonth: 80_000 },

  // Commerce (EMR-17 marketplace fleet — 20 agents shipped as stubs on
  // 2026-04-23; full logic rolls out ticket-by-ticket)
  { id: "productRecommender", displayName: "Product Recommender", description: "Per-patient marketplace recommendations, outcome-weighted (EMR-230).", category: "commerce", defaultTier: "balanced", estimatedTokensPerMonth: 180_000, qualitySensitive: true },
  { id: "bundleSuggester", displayName: "Bundle Suggester", description: "Suggests themed product bundles from co-consumption.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 60_000 },
  { id: "crossSellRanker", displayName: "Cross-Sell Ranker", description: "Frequently-bought-with ranking from OrderItem co-occurrence.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 50_000 },
  { id: "searchPersonalizer", displayName: "Search Personalizer", description: "Reranks search results against patient context.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 90_000 },
  { id: "reviewModerator", displayName: "Review Moderator", description: "Flags product reviews for spam, fake content, or harmful claims.", category: "commerce", defaultTier: "balanced", estimatedTokensPerMonth: 60_000, qualitySensitive: true },
  { id: "productQC", displayName: "Product QC", description: "Audits product catalog rows for missing or stale metadata.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "seoMetadata", displayName: "SEO Metadata", description: "Generates meta-title, meta-description, and alt text per product.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 80_000 },
  { id: "categoryCurator", displayName: "Category Curator", description: "Suggests marketplace category additions and removals.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "pricingAnomaly", displayName: "Pricing Anomaly", description: "Flags inverted compareAt, zero price, deep-markdown outliers.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 30_000 },
  { id: "restockPredictor", displayName: "Restock Predictor", description: "Forecasts per-variant stock-out dates from velocity.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "waitlistNotifier", displayName: "Waitlist Notifier", description: "Notifies patients waitlisted on a variant when it returns to stock.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 30_000 },
  { id: "abandonedCartRescuer", displayName: "Abandoned Cart Rescuer", description: "Surfaces idle carts for follow-up outreach.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 50_000 },
  { id: "orderFraudDetector", displayName: "Order Fraud Detector", description: "Scores new orders for fraud risk before fulfillment.", category: "commerce", defaultTier: "balanced", estimatedTokensPerMonth: 70_000, qualitySensitive: true },
  { id: "returnRiskScorer", displayName: "Return Risk Scorer", description: "Predicts return probability for an order before fulfillment.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "pricingOptimizer", displayName: "Pricing Optimizer", description: "Suggests price adjustments from demand + inventory signals.", category: "commerce", defaultTier: "balanced", estimatedTokensPerMonth: 80_000 },
  { id: "promoGenerator", displayName: "Promo Generator", description: "Generates targeted marketplace promos per patient intent.", category: "commerce", defaultTier: "balanced", estimatedTokensPerMonth: 70_000 },
  { id: "cannabisComplianceGate", displayName: "Cannabis Compliance Gate", description: "Verifies medical auth, state caps, and age before fulfillment.", category: "commerce", defaultTier: "premium", estimatedTokensPerMonth: 100_000, qualitySensitive: true },
  { id: "cannabisTaxCalculator", displayName: "Cannabis Tax Calculator", description: "Computes cannabis excise + retail tax per order destination.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 50_000 },
  { id: "shippingRouter", displayName: "Shipping Router", description: "Picks a fulfillment carrier per order destination + product profile.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },
  { id: "vendorPerformanceScorer", displayName: "Vendor Performance Scorer", description: "Scores marketplace brands on fulfillment + review performance.", category: "commerce", defaultTier: "budget", estimatedTokensPerMonth: 40_000 },

  // Research & Insights (EMR-269 — 10-agent fleet mining outcome + regimen
  // data for cohort analytics, RWE, reimbursement, and publication)
  { id: "cohortBuilder", displayName: "Cohort Builder", description: "Filters patients into research cohorts with baseline metric summaries.", category: "research", defaultTier: "budget", estimatedTokensPerMonth: 30_000 },
  { id: "efficacyComparator", displayName: "Efficacy Comparator", description: "Head-to-head outcome comparison across two cohorts.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 40_000, qualitySensitive: true },
  { id: "outcomeDigester", displayName: "Outcome Digester", description: "Narrative cohort rollup for partner + investor updates.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 90_000, qualitySensitive: true },
  { id: "rweBundler", displayName: "RWE Bundler", description: "Real-world-evidence dossier for pharma partnerships.", category: "research", defaultTier: "premium", estimatedTokensPerMonth: 80_000, qualitySensitive: true },
  { id: "deidentifier", displayName: "De-identifier", description: "HIPAA Safe-Harbor de-identified dataset reference.", category: "research", defaultTier: "budget", estimatedTokensPerMonth: 20_000 },
  { id: "adverseEventScanner", displayName: "Adverse Event Scanner", description: "Flags unusual AE clusters across a cohort or product.", category: "research", defaultTier: "premium", estimatedTokensPerMonth: 60_000, qualitySensitive: true },
  { id: "protocolRecommender", displayName: "Protocol Recommender", description: "Suggests regimen protocols per condition from outcome clusters.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 70_000, qualitySensitive: true },
  { id: "insuranceEvidenceBundler", displayName: "Insurance Evidence Bundler", description: "Assembles patient evidence for insurance submissions.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 50_000 },
  { id: "publicationReadinessScorer", displayName: "Publication Readiness", description: "Scores a cohort for academic publication readiness.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 40_000 },
  { id: "researchPartnerMatcher", displayName: "Research Partner Matcher", description: "Matches cohorts to academic, pharma, and regulator RFPs.", category: "research", defaultTier: "balanced", estimatedTokensPerMonth: 30_000 },
];

/** Per-agent override. Undefined modelId → use the practice default. */
export interface AgentModelOverride {
  agentId: string;
  enabled: boolean;
  /** If set, overrides the practice default model for this agent. */
  modelId?: string;
}

/** Flatten every ModelOption across providers for quick id→model lookup. */
export function allModels(): Array<ModelOption & { provider: ModelProvider; providerLabel: string }> {
  return PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({ ...m, provider: p.provider, providerLabel: p.label }))
  );
}

export function findModel(modelId: string): (ModelOption & { provider: ModelProvider; providerLabel: string }) | undefined {
  return allModels().find((m) => m.id === modelId);
}

/** Monthly raw cost for one agent at its estimated token volume. */
export function monthlyCostForAgent(agent: AgentCatalogEntry, model: ModelOption): number {
  return (agent.estimatedTokensPerMonth / 1000) * model.costPer1kTokens;
}

export const TIER_LABELS: Record<ModelTier, string> = {
  "budget": "Budget",
  "balanced": "Balanced",
  "premium": "Premium",
  "open-source": "Open source",
};

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  clinical: "Clinical",
  patient: "Patient experience",
  safety: "Safety & guardrails",
  billing: "Revenue cycle",
  operations: "Operations",
  commerce: "Marketplace",
  research: "Research & insights",
};

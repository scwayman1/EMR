/**
 * Module catalog — single source of truth for the modular, licensable
 * Leafjourney EMR (EMR-044). Every product surface, agent fleet and
 * integration boundary registers here so we can:
 *
 *  - Sell modules à la carte (EMR-147 licensing menu)
 *  - Gate runtime features per organization (`hasModule()`)
 *  - Compare our SKU mix against EPIC/Cerner/Practice Fusion (EMR-156)
 *  - Surface licensing materials as a PDF/JSON feed
 *
 * The data is intentionally code-resident; ops can edit it via PR until the
 * platform admin UI lands. The shape is stable so PDF generation, the
 * pricing page, and the API feed all read from one source.
 */
import { z } from "zod";

export type ModulePillar =
  | "clinical"
  | "patient_engagement"
  | "billing"
  | "research"
  | "commerce"
  | "operations"
  | "platform";

export type ModuleTier = "starter" | "professional" | "canopy" | "enterprise";

export type ModuleStatus =
  | "ga"
  | "beta"
  | "preview"
  | "in_development"
  | "roadmap";

export interface PlatformModule {
  /** Stable id used in licensing entitlements + URL slugs */
  id: string;
  pillar: ModulePillar;
  name: string;
  /** Short Michelin-style tagline used on the public licensing menu */
  tagline: string;
  description: string;
  /** Tiers that include this module by default */
  includedIn: ModuleTier[];
  /** Per-month list price when purchased à la carte (USD) */
  alaCarteMonthly: number | null;
  /** Status — drives the badge on the licensing menu */
  status: ModuleStatus;
  /** AI agent names from agentRegistry that this module owns */
  agents: string[];
  /** API surfaces (route prefixes) this module exposes */
  apiSurfaces: string[];
  /** Internal route prefixes the module renders */
  routes: string[];
  /** External integrations / standards (HL7, FHIR, X12, etc.) */
  integrations: string[];
  /** Tickets that contributed to the module (for traceability) */
  tickets: string[];
}

export const MODULE_TIERS: Record<ModuleTier, {
  label: string;
  blurb: string;
  monthlyList: number | null;
  monthlyLabel: string;
  bestFor: string;
  ordering: number;
}> = {
  starter: {
    label: "Starter",
    blurb: "Solo clinician kicking the tires.",
    monthlyList: 0,
    monthlyLabel: "Free trial",
    bestFor: "1 provider, 25 patients, basic AI scribe.",
    ordering: 0,
  },
  professional: {
    label: "Professional",
    blurb: "A modern cannabis clinic running end-to-end.",
    monthlyList: 199,
    monthlyLabel: "$199 / provider / month",
    bestFor: "Unlimited patients, full AI fleet, compliance.",
    ordering: 1,
  },
  canopy: {
    label: "Canopy",
    blurb: "Multi-site practices with research + commerce layered in.",
    monthlyList: 499,
    monthlyLabel: "$499 / provider / month",
    bestFor: "Cannabis-first practices needing research export and a marketplace.",
    ordering: 2,
  },
  enterprise: {
    label: "Enterprise",
    blurb: "Health systems, pharma partners, and white-label deployments.",
    monthlyList: null,
    monthlyLabel: "Contact us",
    bestFor: "Multi-state, BAA, custom integrations, dedicated CSM.",
    ordering: 3,
  },
};

export const MODULE_CATALOG: PlatformModule[] = [
  // ─── Clinical pillar ──────────────────────────────────────────
  {
    id: "ehr-core",
    pillar: "clinical",
    name: "Cannabis EHR Core",
    tagline: "Charts, notes, and orders that feel like an Apple product.",
    description:
      "Patient demographics, encounter notes (APSO + SOAP), e-prescribing with cannabis dosing primitives, and the clinician shell.",
    includedIn: ["starter", "professional", "canopy", "enterprise"],
    alaCarteMonthly: null,
    status: "ga",
    agents: ["scribe", "intake"],
    apiSurfaces: ["/api/agents/scribe", "/api/agents/intake"],
    routes: ["/clinic", "/portal"],
    integrations: ["HL7 v2 ADT", "FHIR R4 Patient/Encounter/Observation"],
    tickets: ["EMR-006", "EMR-019", "EMR-020", "EMR-044"],
  },
  {
    id: "scribe-agent",
    pillar: "clinical",
    name: "AI Clinical Scribe",
    tagline: "From mumbled visit to APSO note in under a minute.",
    description:
      "Real-time scribe with APSO formatting, evidence citations, and physician sign-off gating.",
    includedIn: ["professional", "canopy", "enterprise"],
    alaCarteMonthly: 79,
    status: "ga",
    agents: ["scribe", "preVisitIntelligence", "visitDiscoveryWhisperer"],
    apiSurfaces: ["/api/agents/scribe", "/api/transcribe"],
    routes: ["/clinic/encounters/[id]"],
    integrations: ["Whisper", "OpenRouter"],
    tickets: ["EMR-020", "EMR-021", "EMR-077"],
  },
  {
    id: "ehr-bridge",
    pillar: "clinical",
    name: "Conventional EMR Bridge",
    tagline: "Sit alongside Epic, Cerner and Practice Fusion — not replace them.",
    description:
      "HL7 FHIR R4 read/write adapter for Patient, Encounter, MedicationStatement, Observation and DocumentReference. Includes CCD/CDA import and medication reconciliation.",
    includedIn: ["canopy", "enterprise"],
    alaCarteMonthly: 249,
    status: "preview",
    agents: [],
    apiSurfaces: [
      "/api/integrations/fhir/Patient",
      "/api/integrations/fhir/Encounter",
      "/api/integrations/fhir/MedicationStatement",
      "/api/integrations/fhir/Observation",
      "/api/integrations/fhir/DocumentReference",
    ],
    routes: ["/ops/fhir-bridge"],
    integrations: ["HL7 FHIR R4", "HL7 v2.5", "CCD/CDA", "X-12 270/271"],
    tickets: ["EMR-013", "EMR-082"],
  },

  // ─── Patient engagement pillar ───────────────────────────────
  {
    id: "patient-portal",
    pillar: "patient_engagement",
    name: "Patient Portal & Garden",
    tagline: "A garden you tend, not a chart you fight.",
    description:
      "Apple-grade patient portal with the cannabis combo wheel, plant-health gamification, daily check-ins, and storybook visit summary.",
    includedIn: ["starter", "professional", "canopy", "enterprise"],
    alaCarteMonthly: null,
    status: "ga",
    agents: ["patientEducation", "fairytaleSummary", "wellnessCoach"],
    apiSurfaces: ["/api/agents/patient-education"],
    routes: ["/portal"],
    integrations: ["Apple Health", "Whoop", "Oura"],
    tickets: ["EMR-001", "EMR-022", "EMR-023", "EMR-069"],
  },

  // ─── Billing pillar ──────────────────────────────────────────
  {
    id: "revenue-cycle",
    pillar: "billing",
    name: "Revenue Cycle Fleet",
    tagline: "Nineteen agents that file every claim and chase every dollar.",
    description:
      "Coding optimization, claim construction, EDI 837P + 835, payer rules, denials and appeals — orchestrated by the insurance billing AI orchestrator.",
    includedIn: ["professional", "canopy", "enterprise"],
    alaCarteMonthly: 299,
    status: "ga",
    agents: [
      "encounterIntelligence",
      "codingOptimization",
      "claimConstruction",
      "clearinghouseSubmission",
      "adjudicationInterpretation",
      "appealsGeneration",
      "denialResolution",
      "eligibilityBenefits",
      "complianceAudit",
      "priorAuthVerification",
      "staleClaimMonitor",
      "chargeIntegrity",
      "denialTriage",
      "patientExplanation",
      "patientCollections",
      "reconciliation",
      "aging",
      "underpaymentDetection",
      "refundCredit",
      "revenueCommand",
    ],
    apiSurfaces: ["/api/agents/billing"],
    routes: ["/ops/billing", "/ops/billing-agents", "/ops/billing-orchestrator"],
    integrations: ["X12 837P", "X12 835", "Availity", "Waystar", "Change Healthcare"],
    tickets: ["EMR-005", "EMR-045", "EMR-216", "EMR-217", "EMR-218"],
  },
  {
    id: "mips-extrapolator",
    pillar: "billing",
    name: "MIPS / MACRA Extrapolator",
    tagline: "Quality measures pulled out of your charts, automatically.",
    description:
      "AI-driven extrapolation of MIPS quality, promoting interoperability, improvement activity, and cost categories from notes, vitals, labs and dose logs. CMS submission packets shipped quarterly.",
    includedIn: ["canopy", "enterprise"],
    alaCarteMonthly: 149,
    status: "preview",
    agents: ["mipsExtrapolator"],
    apiSurfaces: ["/api/agents/mips"],
    routes: ["/ops/mips"],
    integrations: ["CMS QPP", "QRDA III"],
    tickets: ["EMR-042"],
  },
  {
    id: "fda-rx-bank",
    pillar: "billing",
    name: "FDA Rx + Supplement Bank",
    tagline: "Every approved drug, every cannabinoid, every supplement — one search.",
    description:
      "Curated database of FDA-approved Rx, cannabis-specific dosing primitives, and evidence-rated supplements. Powers prescribing, recommendations, and drug-cannabis interaction checks.",
    includedIn: ["professional", "canopy", "enterprise"],
    alaCarteMonthly: 59,
    status: "preview",
    agents: ["drugCannabisInteractionChecker", "cannabinoidInteractionChecker"],
    apiSurfaces: ["/api/platform/fda-rx"],
    routes: ["/ops/fda-rx", "/clinic/prescribe"],
    integrations: ["openFDA", "RxNorm", "DSLD"],
    tickets: ["EMR-016", "EMR-088", "EMR-154"],
  },

  // ─── Research pillar ─────────────────────────────────────────
  {
    id: "research-portal",
    pillar: "research",
    name: "Research & RWE Console",
    tagline: "Real-world evidence the FDA will actually accept.",
    description:
      "De-identified cohort builder, efficacy comparator, RWE bundler. Powers IRB packets, journal submissions, and pharma partnership exports.",
    includedIn: ["canopy", "enterprise"],
    alaCarteMonthly: 199,
    status: "beta",
    agents: [
      "cohortBuilder",
      "efficacyComparator",
      "outcomeDigester",
      "rweBundler",
      "deidentifier",
      "adverseEventScanner",
      "publicationReadinessScorer",
    ],
    apiSurfaces: ["/api/agents/research"],
    routes: ["/ops/research-exports"],
    integrations: ["PubMed", "ClinicalTrials.gov", "Medical Cannabis Library"],
    tickets: ["EMR-035", "EMR-080", "EMR-097"],
  },

  // ─── Commerce pillar ─────────────────────────────────────────
  {
    id: "marketplace",
    pillar: "commerce",
    name: "Seed Trove Marketplace",
    tagline: "Amazon-style discovery — clinically gated.",
    description:
      "Vendor portal, product Q&A, AI-moderated reviews, age + state compliance gates, and 20-agent commerce fleet.",
    includedIn: ["canopy", "enterprise"],
    alaCarteMonthly: 249,
    status: "beta",
    agents: [
      "productRecommender",
      "bundleSuggester",
      "crossSellRanker",
      "searchPersonalizer",
      "reviewModerator",
      "productQC",
      "seoMetadata",
      "categoryCurator",
      "pricingAnomaly",
      "restockPredictor",
      "waitlistNotifier",
      "abandonedCartRescuer",
      "orderFraudDetector",
      "returnRiskScorer",
      "pricingOptimizer",
      "promoGenerator",
      "cannabisComplianceGate",
      "cannabisTaxCalculator",
      "shippingRouter",
      "vendorPerformanceScorer",
    ],
    apiSurfaces: ["/api/marketplace", "/api/leafmart"],
    routes: ["/leafmart", "/store", "/vendor-portal"],
    integrations: ["Stripe", "Payabli", "Metrc", "BioTrack"],
    tickets: ["EMR-007", "EMR-039", "EMR-188"],
  },

  // ─── Operations pillar ───────────────────────────────────────
  {
    id: "cfo-controller",
    pillar: "operations",
    name: "Office of the CFO",
    tagline: "P&L, cash flow, and balance sheet — narrated by an agent.",
    description:
      "Autonomous controller producing P&L, cash flow, balance sheet, and ad-hoc explanations from your live ledger.",
    includedIn: ["professional", "canopy", "enterprise"],
    alaCarteMonthly: 149,
    status: "ga",
    agents: ["cfo"],
    apiSurfaces: ["/api/cfo"],
    routes: ["/ops/cfo"],
    integrations: ["Plaid", "QuickBooks Online"],
    tickets: ["EMR-103", "EMR-108"],
  },
  {
    id: "scheduler",
    pillar: "operations",
    name: "Scheduling Command Center",
    tagline: "OpenTable for cannabis care.",
    description:
      "Self-serve booking, no-show prediction, smart slot recommender, multi-channel reminders, and intake-gate pipeline.",
    includedIn: ["professional", "canopy", "enterprise"],
    alaCarteMonthly: 99,
    status: "beta",
    agents: ["scheduling", "appointmentReminder", "patientOutreach"],
    apiSurfaces: ["/api/appointments"],
    routes: ["/ops/schedule"],
    integrations: ["Twilio", "SendGrid", "Apple Calendar", "Google Calendar"],
    tickets: ["EMR-012", "EMR-206", "EMR-207", "EMR-208"],
  },

  // ─── Platform pillar ─────────────────────────────────────────
  {
    id: "platform-bedrock",
    pillar: "platform",
    name: "Platform Bedrock",
    tagline: "The orchestration layer every other module rides on.",
    description:
      "Agent harness, audit log, RBAC, encryption, BAA, and observability. Cannot be deselected.",
    includedIn: ["starter", "professional", "canopy", "enterprise"],
    alaCarteMonthly: null,
    status: "ga",
    agents: ["registry", "complianceAudit"],
    apiSurfaces: ["/api/health", "/api/cron"],
    routes: ["/ops/feature-flags", "/ops/api-keys", "/ops/backups"],
    integrations: ["SOC 2", "HIPAA BAA", "FedRAMP Moderate"],
    tickets: ["EMR-044", "EMR-055", "EMR-084"],
  },
  {
    id: "white-label",
    pillar: "platform",
    name: "White-Label & Modular Licensing",
    tagline: "Your name on the door, our agents under the hood.",
    description:
      "Custom domain, custom logo + palette, modular feature toggles per organization, and OEM revenue-share agreement.",
    includedIn: ["enterprise"],
    alaCarteMonthly: 999,
    status: "ga",
    agents: [],
    apiSurfaces: ["/api/platform/modules"],
    routes: ["/ops/branding"],
    integrations: [],
    tickets: ["EMR-044", "EMR-147"],
  },
];

export const MODULE_PILLAR_LABELS: Record<ModulePillar, string> = {
  clinical: "Clinical",
  patient_engagement: "Patient engagement",
  billing: "Revenue cycle",
  research: "Research",
  commerce: "Commerce",
  operations: "Operations",
  platform: "Platform",
};

// ---------------------------------------------------------------------------
// Entitlement schema — written to Organization.metadata when we wire it up.
// ---------------------------------------------------------------------------

export const moduleEntitlementSchema = z.object({
  organizationId: z.string(),
  tier: z.enum(["starter", "professional", "canopy", "enterprise"]),
  /** Module ids the org has access to BEYOND what tier grants. */
  addOns: z.array(z.string()).default([]),
  /** Module ids the org has explicitly disabled. */
  disabled: z.array(z.string()).default([]),
});

export type ModuleEntitlement = z.infer<typeof moduleEntitlementSchema>;

/** Pure check — does the entitlement grant access to a module? */
export function hasModule(
  entitlement: ModuleEntitlement,
  moduleId: string,
): boolean {
  if (entitlement.disabled.includes(moduleId)) return false;
  if (entitlement.addOns.includes(moduleId)) return true;
  const mod = MODULE_CATALOG.find((m) => m.id === moduleId);
  if (!mod) return false;
  return mod.includedIn.includes(entitlement.tier);
}

/** All modules an entitlement currently grants. */
export function activeModules(entitlement: ModuleEntitlement): PlatformModule[] {
  return MODULE_CATALOG.filter((m) => hasModule(entitlement, m.id));
}

/** Group modules by pillar — used by the licensing menu and UI. */
export function modulesByPillar(): Record<ModulePillar, PlatformModule[]> {
  const out: Record<ModulePillar, PlatformModule[]> = {
    clinical: [],
    patient_engagement: [],
    billing: [],
    research: [],
    commerce: [],
    operations: [],
    platform: [],
  };
  for (const m of MODULE_CATALOG) out[m.pillar].push(m);
  return out;
}

/** Sum the à-la-carte sticker price for a list of module ids. */
export function alaCarteTotalMonthly(moduleIds: string[]): number {
  return MODULE_CATALOG
    .filter((m) => moduleIds.includes(m.id) && m.alaCarteMonthly != null)
    .reduce((acc, m) => acc + (m.alaCarteMonthly ?? 0), 0);
}

/** Default tier-1 entitlement for a brand-new organization. */
export function defaultEntitlement(organizationId: string): ModuleEntitlement {
  return { organizationId, tier: "starter", addOns: [], disabled: [] };
}

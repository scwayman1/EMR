/**
 * EMR-156 — Subscription pricing comparison + ROI math.
 * -----------------------------------------------------
 * Operator pricing surface compares Leafjourney's tiered pricing against
 * the per-bed/per-provider models EPIC and Cerner license under, then
 * runs an ROI calculator the practice can show to a board.
 *
 * Everything here is pure: tier definitions are a code-resident registry,
 * the ROI math is a closed form, and the Stripe integration is a stub
 * (the real one ships in EMR-225 once the Stripe Connect account is
 * reviewed). The page wires server actions in.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Tier registry
// ---------------------------------------------------------------------------

export type TierId = "starter" | "growth" | "scale" | "enterprise";

export interface SubscriptionTier {
  id: TierId;
  name: string;
  /** Headline — short, tweetable. */
  tagline: string;
  /** Sticker price in USD per provider per month. */
  monthlyUsdPerProvider: number;
  /** Annual price in USD per provider — typically 10× monthly (2-month discount). */
  annualUsdPerProvider: number;
  /** Hard provider count this tier is sized for. Null = unlimited. */
  maxProviders: number | null;
  /** Bullet-list of features included at this tier. */
  features: string[];
  /** True if a customer should be steered upmarket from this tier. */
  recommendUpgrade?: boolean;
}

export const TIERS: SubscriptionTier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo practitioners and 1–2 provider clinics.",
    monthlyUsdPerProvider: 199,
    annualUsdPerProvider: 1990,
    maxProviders: 2,
    features: [
      "Charting + scheduling + e-Rx",
      "Patient portal + secure messaging",
      "Basic billing (claims + statements)",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Multi-provider cannabis clinics with their own dispensary.",
    monthlyUsdPerProvider: 349,
    annualUsdPerProvider: 3490,
    maxProviders: 10,
    features: [
      "Everything in Starter",
      "Dispensary POS + inventory + gross/net rollups",
      "RCM agents (eligibility, scrubbing, denial triage)",
      "Cannabis-aware contraindication + interaction checks",
      "ChatCB for staff",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "Established practices doing >$2M ARR in cannabis revenue.",
    monthlyUsdPerProvider: 599,
    annualUsdPerProvider: 5990,
    maxProviders: 50,
    features: [
      "Everything in Growth",
      "Multi-location consolidation + financial cockpit",
      "Research export pipeline (de-identified cohorts)",
      "Custom payer-rule editor + appeal automation",
      "Telehealth + group visits",
      "Dedicated success manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Hospital systems, MSOs, multi-state operators.",
    monthlyUsdPerProvider: 0,
    annualUsdPerProvider: 0,
    maxProviders: null,
    features: [
      "Everything in Scale",
      "Custom SLA + 99.99% uptime",
      "On-prem or VPC deployment option",
      "Custom integrations (HL7, FHIR, EDI 837/835)",
      "Dedicated CSM + onboarding engineer",
      "Volume pricing — contact sales",
    ],
  },
];

// ---------------------------------------------------------------------------
// Competitor pricing — anchor numbers for the ROI calculator. These are
// rough public-domain estimates (KLAS surveys, RFP filings, vendor case
// studies) since EPIC/Cerner don't publish list prices.
// ---------------------------------------------------------------------------

export interface CompetitorTier {
  id: "epic" | "cerner" | "athenahealth" | "drchrono";
  name: string;
  /** Per-provider per-month USD price. */
  monthlyUsdPerProvider: number;
  /** One-time implementation USD. */
  implementationUsd: number;
  notes: string;
}

export const COMPETITORS: CompetitorTier[] = [
  {
    id: "epic",
    name: "Epic",
    monthlyUsdPerProvider: 1200,
    implementationUsd: 250_000,
    notes:
      "List based on KLAS small-clinic deployments; large-system contracts run higher. No cannabis-specific workflows.",
  },
  {
    id: "cerner",
    name: "Oracle Health (Cerner)",
    monthlyUsdPerProvider: 950,
    implementationUsd: 175_000,
    notes:
      "Per-provider rate from Oracle PowerChart Ambulatory; implementation typically 6–9 months.",
  },
  {
    id: "athenahealth",
    name: "athenahealth",
    monthlyUsdPerProvider: 700,
    implementationUsd: 25_000,
    notes:
      "Percent-of-collections model averages out near $700/provider once volume normalizes.",
  },
  {
    id: "drchrono",
    name: "DrChrono / EverHealth",
    monthlyUsdPerProvider: 449,
    implementationUsd: 5_000,
    notes:
      "Closest direct competitor in the SMB space; lacks cannabis dispensary integration.",
  },
];

// ---------------------------------------------------------------------------
// ROI calculator
// ---------------------------------------------------------------------------

export const RoiInputSchema = z
  .object({
    providerCount: z.number().int().min(1).max(500),
    /** Tier id the practice is pricing for. */
    tierId: z.enum(["starter", "growth", "scale", "enterprise"]),
    /** Compare against this competitor's list price. */
    competitorId: z.enum(["epic", "cerner", "athenahealth", "drchrono"]),
    billingCycle: z.enum(["monthly", "annual"]),
    /** Annual hours of staff time the operator estimates the agents save. */
    estimatedHoursSavedPerYear: z.number().min(0).max(50_000).default(0),
    /** Average loaded labor rate, in USD per hour. */
    laborRateUsdPerHour: z.number().min(15).max(500).default(45),
  })
  .strict();

export type RoiInput = z.infer<typeof RoiInputSchema>;

export interface RoiResult {
  leafjourneyAnnualUsd: number;
  competitorAnnualUsd: number;
  competitorImplementationUsd: number;
  /** Year-1 savings: competitor (subscription + impl) − leafjourney subscription. */
  yearOneSavingsUsd: number;
  /** Steady-state annual savings (no implementation drag). */
  steadyStateSavingsUsd: number;
  laborSavingsUsd: number;
  /** All-in 3-year delta vs the chosen competitor. */
  threeYearDeltaUsd: number;
  paybackMonths: number;
}

export function calculateRoi(rawInput: unknown): RoiResult {
  const input = RoiInputSchema.parse(rawInput);
  const tier = TIERS.find((t) => t.id === input.tierId)!;
  const competitor = COMPETITORS.find((c) => c.id === input.competitorId)!;

  const ljPerProvider =
    input.billingCycle === "annual" ? tier.annualUsdPerProvider : tier.monthlyUsdPerProvider * 12;
  const ljAnnual = ljPerProvider * input.providerCount;

  const compAnnual = competitor.monthlyUsdPerProvider * 12 * input.providerCount;
  const compImpl = competitor.implementationUsd;

  const labor = input.estimatedHoursSavedPerYear * input.laborRateUsdPerHour;

  const yearOneSavings = compAnnual + compImpl - ljAnnual + labor;
  const steadyState = compAnnual - ljAnnual + labor;
  const threeYear = (compAnnual + labor) * 3 + compImpl - ljAnnual * 3;

  // Payback in months for the implementation delta. If LJ is already cheaper
  // monthly, payback is 0 — implementation savings are immediate.
  const monthlyDeltaUsd =
    (compAnnual - ljAnnual + labor) / 12;
  const paybackMonths =
    monthlyDeltaUsd > 0 ? Math.max(0, Math.round(compImpl / monthlyDeltaUsd)) : 0;

  return {
    leafjourneyAnnualUsd: ljAnnual,
    competitorAnnualUsd: compAnnual,
    competitorImplementationUsd: compImpl,
    yearOneSavingsUsd: yearOneSavings,
    steadyStateSavingsUsd: steadyState,
    laborSavingsUsd: labor,
    threeYearDeltaUsd: threeYear,
    paybackMonths,
  };
}

// ---------------------------------------------------------------------------
// Stripe integration — stub. The real client lives behind STRIPE_SECRET_KEY
// and ships when Stripe Connect onboarding is approved.
// ---------------------------------------------------------------------------

export interface SubscribeIntent {
  organizationId: string;
  tierId: TierId;
  billingCycle: "monthly" | "annual";
  providerCount: number;
}

export interface SubscribeStubResult {
  ok: true;
  /** Synthetic checkout URL the page can redirect to in dev. */
  checkoutUrl: string;
  expectedAnnualUsd: number;
  message: string;
}

/**
 * Build a stub Stripe checkout intent. The real implementation creates
 * a Stripe Subscription with the right Price ID and returns the live
 * checkout URL; this version stays pure so unit tests + the marketing
 * site can render the price math without a Stripe key.
 */
export function buildSubscribeStub(intent: SubscribeIntent): SubscribeStubResult {
  const tier = TIERS.find((t) => t.id === intent.tierId)!;
  const perProvider =
    intent.billingCycle === "annual"
      ? tier.annualUsdPerProvider
      : tier.monthlyUsdPerProvider * 12;
  const expected = perProvider * intent.providerCount;
  return {
    ok: true,
    checkoutUrl: `/ops/pricing/checkout?tier=${intent.tierId}&cycle=${intent.billingCycle}&n=${intent.providerCount}&org=${intent.organizationId}`,
    expectedAnnualUsd: expected,
    message:
      "Stripe checkout session is stubbed in dev — wire STRIPE_SECRET_KEY + the Price IDs in lib/payments to ship.",
  };
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

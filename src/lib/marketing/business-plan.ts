/**
 * EMR-153 — Marketing-facing business plan, target groups, competitive
 * analysis, and go-to-market timeline.
 *
 * This module is paired with the operator-facing financial plan in
 * `src/lib/platform/business-plan.ts` (segments, marketing channels,
 * revenue model, funding ask). The marketing surface is narrower: it's
 * what we hand a sales prospect, an investor on a first call, or a
 * journalist asking what we do — without exposing burn or cap-table
 * detail.
 */

import {
  TARGET_SEGMENTS as PLATFORM_SEGMENTS,
  type TargetSegment,
} from "@/lib/platform/business-plan";

// ---------------------------------------------------------------------------
// Target market segments — public shape (no ACV / TAM noise).
// ---------------------------------------------------------------------------

export type SegmentKind =
  | "solo_practitioner"
  | "group_practice"
  | "cannabis_clinic"
  | "integrative_medicine"
  | "telehealth"
  | "research_academic"
  | "specialty_pain";

export interface MarketingSegment {
  id: string;
  kind: SegmentKind;
  /** Display name for marketing site. */
  name: string;
  /** One-line description. */
  who: string;
  /** Their #1 pain. */
  pain: string;
  /** What we offer them. */
  promise: string;
  /** Three concrete value propositions. */
  valueProps: string[];
  /** Modules they care about. */
  flagshipModules: string[];
}

export const MARKETING_SEGMENTS: MarketingSegment[] = [
  {
    id: "solo-practitioner",
    kind: "solo_practitioner",
    name: "Solo practitioners",
    who: "Independent physicians, DOs, NPs, and PAs running a single-provider practice.",
    pain: "Generic EMRs cost too much and bury cannabis-specific workflows three menus deep.",
    promise: "An EMR that ships ready for cannabis medicine on day one — at a price one provider can carry.",
    valueProps: [
      "$199/month all-in — no per-seat tax, no setup fee, no 18-month contract",
      "Built-in scribe agent drafts SOAP and APSO notes from the visit audio",
      "Combo Wheel + dosing primitives + outcome scales in the patient portal",
    ],
    flagshipModules: ["ehr-core", "scribe-agent", "patient-portal", "revenue-cycle"],
  },
  {
    id: "group-practice",
    kind: "group_practice",
    name: "Group practices",
    who: "Multi-provider practices (2 - 25 clinicians) running a shared schedule and shared billing.",
    pain: "Most EMRs nickel-and-dime per seat; the back-office tooling never catches up to the clinical side.",
    promise: "Volume pricing with one shared billing fleet, one shared scheduler, one shared compliance shelf.",
    valueProps: [
      "Per-clinic flat rate — providers add/remove without billing department drama",
      "Operations dashboard rolls up KPIs across providers without exporting to a spreadsheet",
      "Centralized credentialing + license tracking across the practice",
    ],
    flagshipModules: ["ehr-core", "scheduler", "revenue-cycle", "ops-dashboard"],
  },
  {
    id: "cannabis-clinic",
    kind: "cannabis_clinic",
    name: "Cannabis clinics",
    who: "MMJ certification clinics, cannabis-focused medical practices, and dispensary-affiliated clinics.",
    pain: "Their existing EMR doesn't know what a Combo Wheel is, doesn't track per-product outcomes, and exports to PDF when the state needs structured data.",
    promise: "The first EMR built for cannabis medicine instead of bolted on after the fact.",
    valueProps: [
      "Cannabis-native data model — strain, terpene profile, dose, form factor, batch",
      "State-by-state compliance forms pre-loaded; recertification cadence enforced",
      "Marketplace integration so the patient leaves the visit knowing where to fill",
    ],
    flagshipModules: ["ehr-core", "patient-portal", "marketplace", "compliance-shelf"],
  },
  {
    id: "integrative-medicine",
    kind: "integrative_medicine",
    name: "Integrative medicine practices",
    who: "Functional medicine + supplement-forward practices that have started integrating cannabis as a third leg.",
    pain: "Their EMR can't model supplements, can't model cannabis, and can't reason about interactions across the three.",
    promise: "FDA Rx + cannabis + supplement bank in one prescribing surface with cross-class interaction checking.",
    valueProps: [
      "Unified prescribing surface — one search, three formulary classes",
      "Drug-supplement-cannabis interaction agent built on top of NIH ODS + DailyMed",
      "Per-supplement outcome scales feed the same cohort analytics as Rx outcomes",
    ],
    flagshipModules: ["fda-rx-bank", "scribe-agent", "research-portal", "ehr-core"],
  },
  {
    id: "telehealth",
    kind: "telehealth",
    name: "Cannabis telehealth networks",
    who: "Multi-state telehealth platforms running 50+ providers across a panel of states.",
    pain: "The stack is a CRM bolted to a video call. They've outgrown it. Building a real EMR in-house is a 12-month detour they can't afford.",
    promise: "White-label deployment — their brand, our agents — go live in 15 business days.",
    valueProps: [
      "Modular licensing menu — run only the modules they want",
      "White-label theme, domain, and email — no Leafjourney logo on patient surfaces",
      "API-first: BYO booking, BYO payments, plug into the EMR core",
    ],
    flagshipModules: ["white-label", "ehr-core", "scheduler", "revenue-cycle"],
  },
];

// ---------------------------------------------------------------------------
// Value propositions — short copy for the marketing site.
// ---------------------------------------------------------------------------

export interface ValueProposition {
  segmentId: MarketingSegment["id"];
  headline: string;
  subhead: string;
  /** Three measurable outcomes prospects can quote internally. */
  outcomes: string[];
}

export const VALUE_PROPOSITIONS: ValueProposition[] = [
  {
    segmentId: "solo-practitioner",
    headline: "Run your practice on one tab.",
    subhead: "Schedule, chart, prescribe, bill, and track outcomes — without the per-seat tax.",
    outcomes: [
      "First chart closed on day 3 of onboarding",
      "Avg. claim from visit to submission: 90 minutes",
      "70% of solo practitioners cancel a competing EMR within 6 months",
    ],
  },
  {
    segmentId: "group-practice",
    headline: "One EMR. Every clinician. No per-seat math.",
    subhead: "Add providers without renegotiating your contract — or your spreadsheet.",
    outcomes: [
      "Operations dashboard rolls up across providers in under 200ms",
      "Shared scribe agent stays consistent on phrasing across the team",
      "Group billing fleet handles 4x the claim volume without back-office hires",
    ],
  },
  {
    segmentId: "cannabis-clinic",
    headline: "The first EMR that knows what a Combo Wheel is.",
    subhead: "Cannabis-native data model, compliance forms pre-loaded, marketplace one click away.",
    outcomes: [
      "State recertification reminders sent automatically — no front-desk audit",
      "Per-product outcome scales surface every product trend over time",
      "Patient leaves the visit with a verified product list and a dispensary",
    ],
  },
  {
    segmentId: "integrative-medicine",
    headline: "Rx, cannabis, and supplements — one prescribing surface.",
    subhead: "Cross-class interaction checking and outcomes the EMR you have can't model.",
    outcomes: [
      "Single-search prescribing across FDA, cannabis, and supplements",
      "Interaction agent flags ~12% of orders for review — most missed by single-class checkers",
      "Outcome scales attribute change to the right modality, not the kitchen sink",
    ],
  },
  {
    segmentId: "telehealth",
    headline: "Your brand. Our EMR. 15 days to go-live.",
    subhead: "White-label modules with the EMR core, agents, and compliance shelf intact.",
    outcomes: [
      "Day-15 go-live with a real first patient charted end-to-end",
      "API-first integration with existing booking + payments stacks",
      "Per-module licensing keeps spend tied to product surface, not headcount",
    ],
  },
];

// ---------------------------------------------------------------------------
// Competitive analysis — how we line up vs the EMRs prospects already know.
// ---------------------------------------------------------------------------

export type CompetitorTier = "incumbent" | "cannabis_niche" | "integrative" | "in_house";

export interface Competitor {
  id: string;
  name: string;
  tier: CompetitorTier;
  /** What they're known for. */
  positioning: string;
  /** Where they win. */
  strengths: string[];
  /** Where we win. */
  gaps: string[];
  /** Our talking point against them in one line. */
  ourAngle: string;
}

export const COMPETITORS: Competitor[] = [
  {
    id: "epic",
    name: "Epic / MyChart",
    tier: "incumbent",
    positioning: "The default for hospital systems and large multi-specialty groups.",
    strengths: [
      "Universal interoperability via Care Everywhere + FHIR",
      "Deep clinical depth in oncology, cardiology, ED",
      "Brand trust with payers and health systems",
    ],
    gaps: [
      "Six-figure implementation; multi-month onboarding",
      "Cannabis appears as free-text — no structured data, no outcome scales",
      "Patient portal feels like a 2014 web app",
    ],
    ourAngle: "Epic for the giants, Leafjourney for the practice that doesn't have a 60-person IT team.",
  },
  {
    id: "athena",
    name: "athenahealth",
    tier: "incumbent",
    positioning: "Cloud EMR for ambulatory practices with strong RCM.",
    strengths: [
      "Strong revenue cycle management + clearinghouse coverage",
      "Reasonable practice-management workflows",
      "Recognized brand in ambulatory care",
    ],
    gaps: [
      "Cannabis-specific workflows are absent",
      "Per-encounter pricing penalizes volume",
      "Patient portal missing modern dose log + outcome surfaces",
    ],
    ourAngle: "athena is good at the bill. We're good at the visit and the bill.",
  },
  {
    id: "elation",
    name: "Elation Health",
    tier: "incumbent",
    positioning: "Independent-practice EMR popular with primary care.",
    strengths: [
      "Clean UI compared to Epic / Athena",
      "Solid for primary care and pediatrics",
      "Reasonable per-provider pricing",
    ],
    gaps: [
      "No cannabis data model — clinicians fall back to PDFs",
      "No supplement modeling for integrative practices",
      "No marketplace integration",
    ],
    ourAngle: "Elation is fine for primary care. We're built for cannabis-medicine practices.",
  },
  {
    id: "heally",
    name: "Heally / Veriheal stack",
    tier: "cannabis_niche",
    positioning: "Cannabis telehealth platforms with light EMR features.",
    strengths: [
      "Direct-to-consumer brand recognition",
      "Multi-state provider network in place",
      "Good at MMJ certification flow specifically",
    ],
    gaps: [
      "Not a real EMR — minimal charting, no APSO templates",
      "No revenue-cycle / payer-side billing fleet",
      "No outcome tracking beyond completion of the cert visit",
    ],
    ourAngle: "They have the demand. We're the EMR they should have built.",
  },
  {
    id: "lifefile",
    name: "LifeFile / Cerbo",
    tier: "integrative",
    positioning: "Integrative medicine EMRs with supplement-aware features.",
    strengths: [
      "Supplement formularies built in",
      "Reasonable for functional medicine practices",
      "Familiar workflow for practices coming from Cerbo specifically",
    ],
    gaps: [
      "Cannabis modeling is bolt-on, not native",
      "Patient outcome data is unstructured",
      "Limited research-cohort tooling",
    ],
    ourAngle: "Cerbo handles the supplements. We handle supplements + cannabis + Rx as one prescribing surface.",
  },
  {
    id: "in-house",
    name: "Spreadsheets + paper Combo Wheel",
    tier: "in_house",
    positioning: "What 60% of cannabis-only clinics actually use today.",
    strengths: [
      "Free / low cost",
      "Clinician knows where everything is",
    ],
    gaps: [
      "Loses data, loses claims, loses compliance",
      "Cannot answer the question 'which strain helps anxiety best for our cohort'",
      "Cannot scale beyond ~150 active patients per provider",
    ],
    ourAngle: "We replace the binder, the spreadsheet, and the wall poster with one surface.",
  },
];

// ---------------------------------------------------------------------------
// Go-to-market timeline — quarter-by-quarter, what ships and what we sell.
// ---------------------------------------------------------------------------

export type GtmStatus = "shipped" | "in_progress" | "planned";

export interface GtmMilestone {
  quarter: string;
  status: GtmStatus;
  theme: string;
  /** What capability ships in product. */
  productMoves: string[];
  /** What sales / marketing pushes that quarter. */
  salesMoves: string[];
  /** Quantitative target for the quarter. */
  target: string;
}

export const GTM_TIMELINE: GtmMilestone[] = [
  {
    quarter: "Q4 2025",
    status: "shipped",
    theme: "Foundations",
    productMoves: [
      "EMR core, scribe agent, Combo Wheel, patient portal",
      "Revenue cycle v1 with eligibility + claim submission",
      "First three states' compliance forms",
    ],
    salesMoves: [
      "Founder-led sales to cannabis-only clinic design partners",
      "Booth at Society of Cannabis Clinicians annual",
      "Justin Kander partner program announced",
    ],
    target: "10 design-partner clinics live, 1 telehealth network in pilot.",
  },
  {
    quarter: "Q1 2026",
    status: "in_progress",
    theme: "Cannabis-clinic GA",
    productMoves: [
      "FHIR bridge for patient migration",
      "Marketplace + Seed Trove storefront for clinics",
      "MIPS extrapolator firing for first measure set",
    ],
    salesMoves: [
      "First two AEs hired — territories: West, Northeast",
      "Conference circuit: ASA, NORML state chapters, MJBizCon",
      "PubMed-citing content marketing engine live",
    ],
    target: "60 paying clinics, $40K MRR.",
  },
  {
    quarter: "Q2 2026",
    status: "planned",
    theme: "Integrative medicine + group practice",
    productMoves: [
      "Supplement bank + interaction agent across Rx + cannabis + supplements",
      "Group-practice ops dashboard with cross-provider rollups",
      "iOS/Android patient app",
    ],
    salesMoves: [
      "IFM, ACAM, A4M conference push",
      "Group-practice case studies from design partners",
      "Podcast sponsorships in functional medicine",
    ],
    target: "180 clinics, $130K MRR, first 5 group practices.",
  },
  {
    quarter: "Q3 2026",
    status: "planned",
    theme: "Telehealth + white-label",
    productMoves: [
      "White-label theming + domain hosting",
      "API-first booking + payments adapters",
      "Multi-state license registry + auto-routing",
    ],
    salesMoves: [
      "Direct outreach to top 12 cannabis telehealth platforms",
      "Licensing menu published with public price book",
      "First white-label customer go-live",
    ],
    target: "420 clinics, $310K MRR, 2 white-label partners live.",
  },
  {
    quarter: "Q4 2026",
    status: "planned",
    theme: "Research + scale",
    productMoves: [
      "Cohort builder + RWE bundler GA",
      "De-identification + IRB workflow",
      "Cross-tenant analytics for partner studies",
    ],
    salesMoves: [
      "AMA cannabis SIG sponsorship + journal placement",
      "Three university research-group partnerships announced",
      "Series A close",
    ],
    target: "750 clinics, $580K MRR, $10M Series A closed.",
  },
];

// ---------------------------------------------------------------------------
// Helpers — these power summary tiles on the public page.
// ---------------------------------------------------------------------------

export function totalAddressableProviders(): number {
  return PLATFORM_SEGMENTS.reduce((acc: number, s: TargetSegment) => acc + s.tam, 0);
}

export function shippedQuarters(): GtmMilestone[] {
  return GTM_TIMELINE.filter((q) => q.status === "shipped");
}

export function valuePropFor(segmentId: string): ValueProposition | undefined {
  return VALUE_PROPOSITIONS.find((v) => v.segmentId === segmentId);
}

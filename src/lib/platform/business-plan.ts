/**
 * EMR-153 — Marketing plan, business plan, and target groups.
 *
 * The shape here is what feeds the operator-facing business-plan tab and
 * the public-facing investor + sales decks. Keeping it as code (instead
 * of static markdown) lets us:
 *   - Render the plan inline in the EMR
 *   - Recompute totals/percentages without copy-paste drift
 *   - Run sanity tests on the funding math
 *   - Share single chunks (e.g. just the segment table) into other surfaces
 */

export type SegmentTier = "primary" | "secondary" | "tertiary";

export interface TargetSegment {
  id: string;
  tier: SegmentTier;
  name: string;
  /** Who they are in one sentence — this lands on the marketing site. */
  who: string;
  /** Their pain, in their own words. */
  pain: string;
  /** What we do for them, in one sentence. */
  promise: string;
  /** TAM in the US (number of clinicians). */
  tam: number;
  /** Average annual contract value once converted. */
  acvUsd: number;
  /** Channels we acquire them through. */
  acquisitionChannels: string[];
  /** Which modules they care about most (module ids). */
  flagshipModules: string[];
}

export const TARGET_SEGMENTS: TargetSegment[] = [
  {
    id: "cannabis-only-md",
    tier: "primary",
    name: "Cannabis-only MD / DO",
    who: "Independent physician running a cannabis-medicine clinic.",
    pain: "Patched together MyChart + spreadsheets + Twilio + a paper Combo Wheel taped to the wall.",
    promise: "One Apple-grade EMR built around the cannabis visit, with a billing fleet that actually files claims.",
    tam: 4_500,
    acvUsd: 199 * 12,
    acquisitionChannels: ["Cannabis medicine conferences", "Justin Kander referrals", "Reddit /r/medicalmarijuana"],
    flagshipModules: ["ehr-core", "scribe-agent", "patient-portal", "fda-rx-bank", "revenue-cycle"],
  },
  {
    id: "integrative-medicine",
    tier: "primary",
    name: "Integrative / functional medicine practice",
    who: "Practice doing functional med + supplements + cannabis as a third leg.",
    pain: "EHR doesn't model supplements; supplement recommendations live in PDFs.",
    promise: "FDA Rx + cannabis + supplement bank in one prescribing surface.",
    tam: 7_200,
    acvUsd: 199 * 12,
    acquisitionChannels: ["IFM conference", "ACAM", "podcast sponsorships"],
    flagshipModules: ["ehr-core", "fda-rx-bank", "scribe-agent", "research-portal"],
  },
  {
    id: "dispensary-clinic",
    tier: "secondary",
    name: "Dispensary-affiliated clinic",
    who: "MMJ certification clinic co-located with a dispensary.",
    pain: "Workflow split between certification, dispensary rec, and follow-up — nothing connects.",
    promise: "Combined certification + Combo Wheel + Seed Trove marketplace under one roof.",
    tam: 1_800,
    acvUsd: 499 * 12,
    acquisitionChannels: ["State cannabis associations", "Direct outreach to dispensary chains"],
    flagshipModules: ["ehr-core", "patient-portal", "marketplace", "scheduler"],
  },
  {
    id: "telemed-cannabis",
    tier: "secondary",
    name: "Cannabis telehealth networks",
    who: "Multi-state cannabis telehealth platforms (Heally, Veriheal-style).",
    pain: "Their stack is a CRM bolted to a video call. No real EMR.",
    promise: "White-label + modular deployment — their brand, our agents.",
    tam: 60,
    acvUsd: 999 * 12 * 30,
    acquisitionChannels: ["Direct sales", "Inbound from licensing menu"],
    flagshipModules: ["white-label", "ehr-core", "scheduler", "revenue-cycle"],
  },
  {
    id: "research-academic",
    tier: "tertiary",
    name: "Academic cannabis research groups",
    who: "University medical centers running cannabis trials.",
    pain: "REDCap + Excel + manual de-identification.",
    promise: "Cohort builder + RWE bundler + de-identifier in one console.",
    tam: 120,
    acvUsd: 999 * 12,
    acquisitionChannels: ["AMA cannabis SIG", "Cannabis research journals", "DOI cross-refs"],
    flagshipModules: ["research-portal", "ehr-core"],
  },
  {
    id: "specialty-pain",
    tier: "tertiary",
    name: "Specialty pain / palliative practices",
    who: "Pain medicine and palliative care clinics adopting cannabis.",
    pain: "DEA-heavy workflow; want cannabis as an opioid-sparing option but lack tooling.",
    promise: "Combo Wheel + opioid taper tracker + structured outcomes.",
    tam: 3_400,
    acvUsd: 499 * 12,
    acquisitionChannels: ["AAPM annual meeting", "Hospice & palliative care networks"],
    flagshipModules: ["ehr-core", "patient-portal", "fda-rx-bank"],
  },
];

// ---------------------------------------------------------------------------
// Marketing channels — where we show up + budget mix.
// ---------------------------------------------------------------------------

export interface MarketingChannel {
  id: string;
  name: string;
  category: "owned" | "earned" | "paid" | "partner";
  description: string;
  /** Quarterly spend allocation (USD). */
  quarterlyBudget: number;
  /** Demo expected per quarter. */
  expectedDemos: number;
  /** Conversion to paid in % (0..1). */
  expectedCloseRate: number;
}

export const MARKETING_CHANNELS: MarketingChannel[] = [
  {
    id: "content-pubmed",
    name: "PubMed-citing content marketing",
    category: "owned",
    description: "Long-form articles and ChatCB query digests — every claim cited.",
    quarterlyBudget: 18_000,
    expectedDemos: 90,
    expectedCloseRate: 0.18,
  },
  {
    id: "conference-cannabis",
    name: "Cannabis medicine conferences (booth + talks)",
    category: "paid",
    description: "Society of Cannabis Clinicians, ASA, NORML, state medical associations.",
    quarterlyBudget: 35_000,
    expectedDemos: 60,
    expectedCloseRate: 0.25,
  },
  {
    id: "kol-justin",
    name: "Justin Kander partner program",
    category: "partner",
    description: "Featured as the EMR Justin recommends to clinicians joining cannabis medicine.",
    quarterlyBudget: 12_000,
    expectedDemos: 35,
    expectedCloseRate: 0.4,
  },
  {
    id: "podcast-sponsorship",
    name: "Cannabis podcast sponsorships",
    category: "paid",
    description: "Periodic Effects, Cannabis Reliable, Curious About Cannabis.",
    quarterlyBudget: 9_000,
    expectedDemos: 45,
    expectedCloseRate: 0.1,
  },
  {
    id: "search-google",
    name: "Search ads — long-tail cannabis EHR terms",
    category: "paid",
    description: "Targets 'cannabis EMR', 'medical marijuana EHR', 'EMR with combo wheel'.",
    quarterlyBudget: 14_000,
    expectedDemos: 60,
    expectedCloseRate: 0.12,
  },
  {
    id: "directory-listings",
    name: "Industry directories",
    category: "owned",
    description: "Listed on Cannabis Industry Journal directory, MJBizDaily directory, ASA tools page.",
    quarterlyBudget: 3_000,
    expectedDemos: 15,
    expectedCloseRate: 0.15,
  },
  {
    id: "referrals-existing",
    name: "Existing customer referrals",
    category: "earned",
    description: "Two-month credit per converted referral.",
    quarterlyBudget: 6_000,
    expectedDemos: 25,
    expectedCloseRate: 0.4,
  },
];

export function totalQuarterlySpend(): number {
  return MARKETING_CHANNELS.reduce((acc, c) => acc + c.quarterlyBudget, 0);
}

export function expectedQuarterlyCloses(): number {
  return MARKETING_CHANNELS.reduce(
    (acc, c) => acc + c.expectedDemos * c.expectedCloseRate,
    0,
  );
}

// ---------------------------------------------------------------------------
// Three-year revenue model — sanity-checked numbers sales can quote.
// ---------------------------------------------------------------------------

export interface RevenueYear {
  year: 1 | 2 | 3;
  customers: number;
  arpa: number;
  arr: number;
  netNewMrrAdds: number;
  grossMargin: number; // 0..1
  burnUsd: number;
  cashEoy: number;
}

export const REVENUE_PLAN: RevenueYear[] = [
  {
    year: 1,
    customers: 120,
    arpa: 4_200,
    arr: 504_000,
    netNewMrrAdds: 10,
    grossMargin: 0.62,
    burnUsd: 1_900_000,
    cashEoy: 2_100_000,
  },
  {
    year: 2,
    customers: 540,
    arpa: 5_100,
    arr: 2_754_000,
    netNewMrrAdds: 35,
    grossMargin: 0.71,
    burnUsd: 1_400_000,
    cashEoy: 1_950_000,
  },
  {
    year: 3,
    customers: 1_650,
    arpa: 6_300,
    arr: 10_395_000,
    netNewMrrAdds: 92,
    grossMargin: 0.78,
    burnUsd: 800_000,
    cashEoy: 4_300_000,
  },
];

// ---------------------------------------------------------------------------
// Funding ask — what we tell investors.
// ---------------------------------------------------------------------------

export interface FundingRound {
  name: string;
  raiseUsd: number;
  preMoneyUsd: number;
  status: "closed" | "active" | "planned";
  use: Array<{ category: string; allocationUsd: number; rationale: string }>;
}

export const FUNDING: FundingRound = {
  name: "Series Seed",
  raiseUsd: 4_000_000,
  preMoneyUsd: 18_000_000,
  status: "active",
  use: [
    {
      category: "Engineering hires (4 sr engineers, 1 ML)",
      allocationUsd: 1_800_000,
      rationale:
        "Ship the FHIR bridge, MIPS submission, and Seed Trove marketplace before Q4.",
    },
    {
      category: "Sales + customer success (3 AEs, 2 CSMs)",
      allocationUsd: 900_000,
      rationale:
        "Convert the 200-clinic pipeline that's already raised their hand.",
    },
    {
      category: "Compliance + legal (BAA, SOC 2 Type 2, state-by-state)",
      allocationUsd: 350_000,
      rationale:
        "Unlock the multi-state telehealth segment (Series A gate).",
    },
    {
      category: "Marketing — content + conferences + KOL",
      allocationUsd: 600_000,
      rationale: "Justin Kander partner program + 6 conferences + paid search.",
    },
    {
      category: "Operating runway (18 months @ ~$200K/mo).",
      allocationUsd: 350_000,
      rationale:
        "Cushion for the Series A close in Q1 of year 2 — no fire sale.",
    },
  ],
};

export function fundingSanityCheck(): {
  totalAllocation: number;
  matchesRaise: boolean;
} {
  const total = FUNDING.use.reduce((acc, u) => acc + u.allocationUsd, 0);
  return {
    totalAllocation: total,
    matchesRaise: total === FUNDING.raiseUsd,
  };
}

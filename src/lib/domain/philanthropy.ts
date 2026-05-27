/**
 * Philanthropy / donations module — EMR-105
 *
 * Patient-facing giving surface. Patients can:
 *   - browse curated, mission-aligned charities
 *   - earmark a recurring monthly donation amount
 *   - track lifetime giving and "matched-by-Leafjourney" amounts
 *
 * Pure types + curated catalog. The runtime persistence path uses the
 * existing patient/user models via a dedicated client component, so we
 * don't need to touch prisma/schema.prisma.
 */

export type CharityCategory =
  | "patient-access"
  | "mental-health"
  | "research"
  | "veterans"
  | "harm-reduction"
  | "social-equity";

export interface CharityDef {
  id: string;
  name: string;
  category: CharityCategory;
  blurb: string;
  /** Public homepage. Always external. */
  url: string;
  /** Optional EIN — populated where we've vetted the org. */
  ein?: string;
  /** A short reason this charity is on our list. */
  whyOnList: string;
}

export const CHARITIES: CharityDef[] = [
  {
    id: "patients-out-of-time",
    name: "Patients Out of Time",
    category: "patient-access",
    blurb:
      "Educates clinicians and the public on the therapeutic use of cannabis.",
    url: "https://patientsoutoftime.org",
    whyOnList:
      "Direct alignment with Leafjourney's clinician-education mission.",
  },
  {
    id: "americans-for-safe-access",
    name: "Americans for Safe Access",
    category: "patient-access",
    blurb:
      "Advocates legal, safe access to cannabis for therapeutic use and research.",
    url: "https://www.safeaccessnow.org",
    whyOnList: "Front-line patient-access policy work.",
  },
  {
    id: "veterans-cannabis-project",
    name: "Veterans Cannabis Project",
    category: "veterans",
    blurb:
      "Improves veterans' quality of life by removing barriers to cannabis access.",
    url: "https://www.vetscp.org",
    whyOnList: "Cannabis access for those who served.",
  },
  {
    id: "drug-policy-alliance",
    name: "Drug Policy Alliance",
    category: "harm-reduction",
    blurb:
      "Advances policies grounded in science, compassion, health, and human rights.",
    url: "https://drugpolicy.org",
    whyOnList: "Harm-reduction and decriminalization advocacy.",
  },
  {
    id: "marijuana-policy-project",
    name: "Marijuana Policy Project",
    category: "patient-access",
    blurb:
      "Drives state-level legalization and patient-protection legislation.",
    url: "https://www.mpp.org",
    whyOnList: "State-level policy work that opens medical access.",
  },
  {
    id: "last-prisoner-project",
    name: "Last Prisoner Project",
    category: "social-equity",
    blurb:
      "Works to free those incarcerated for cannabis-related offenses.",
    url: "https://www.lastprisonerproject.org",
    whyOnList: "Repairs the harm of the war on drugs.",
  },
  {
    id: "namI",
    name: "NAMI — National Alliance on Mental Illness",
    category: "mental-health",
    blurb: "Largest grassroots mental-health organization in the US.",
    url: "https://www.nami.org",
    whyOnList: "Cannabis and mental health intersect — patients deserve both.",
  },
  {
    id: "realm-of-caring",
    name: "Realm of Caring",
    category: "research",
    blurb:
      "Research, education, and support for cannabinoid therapeutics.",
    url: "https://www.realmofcaring.org",
    whyOnList: "Patient-centered research aligned with our outcomes data.",
  },
];

export interface DonationPledge {
  patientId: string;
  /** Charity id from the curated list. */
  charityId: string;
  /** Monthly amount in USD cents. */
  monthlyCents: number;
  /** True if Leafjourney is matching the donation. */
  matched: boolean;
  /** ISO timestamp the pledge was created or last updated. */
  updatedAt: string;
}

export interface DonationLedgerEntry {
  date: string; // ISO date
  charityId: string;
  amountCents: number;
  matched: boolean;
}

export interface PhilanthropySummary {
  totalGivenCents: number;
  totalMatchedCents: number;
  charitiesSupported: number;
  /** ISO date of the most recent gift, if any. */
  lastGiftAt: string | null;
}

export function summarizeLedger(
  ledger: DonationLedgerEntry[],
): PhilanthropySummary {
  const totals = ledger.reduce(
    (acc, e) => {
      acc.totalGivenCents += e.amountCents;
      if (e.matched) acc.totalMatchedCents += e.amountCents;
      return acc;
    },
    { totalGivenCents: 0, totalMatchedCents: 0 },
  );
  const charities = new Set(ledger.map((e) => e.charityId));
  const lastGiftAt = ledger
    .map((e) => e.date)
    .sort()
    .reverse()[0] ?? null;
  return {
    ...totals,
    charitiesSupported: charities.size,
    lastGiftAt,
  };
}

export function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Default suggested amounts shown next to the input. */
export const SUGGESTED_AMOUNTS_CENTS = [500, 1000, 2500, 5000];

export function findCharity(id: string): CharityDef | undefined {
  return CHARITIES.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// EMR-311 — Directory data store + seed listings
// ---------------------------------------------------------------------------
// V1: in-memory listings keyed by slug. The shape mirrors a future
// `clinician_listing` table; Prisma swap-in is mechanical.
// ---------------------------------------------------------------------------

import type {
  ClinicianApplication,
  ClinicianListing,
} from "./types";

/** Sample listings — replaced with DB rows once persistence lands. */
export const SEED_LISTINGS: ClinicianListing[] = [
  {
    slug: "amelia-rivera-md",
    displayName: "Dr. Amelia Rivera",
    credentials: "MD",
    bio:
      "Internal medicine and medical cannabis certification. Twelve years in primary care, focused on opioid-sparing pain management.",
    services: ["primary-care", "medical-cannabis-cert", "pain-management"],
    licensedStates: ["NY", "NJ", "CT"],
    cannabisProgramStates: ["NY", "NJ"],
    acceptsInsurance: true,
    cashRateCents: 22500,
  },
  {
    slug: "marcus-okafor-do",
    displayName: "Dr. Marcus Okafor",
    credentials: "DO",
    bio:
      "Psychiatry with a focus on PTSD and treatment-resistant anxiety. Cannabis as adjunct, not first-line.",
    services: ["psychiatry", "medical-cannabis-cert"],
    licensedStates: ["CA", "OR", "WA"],
    cannabisProgramStates: ["CA", "OR", "WA"],
    acceptsInsurance: false,
    cashRateCents: 35000,
  },
  {
    slug: "priya-sharma-np",
    displayName: "Priya Sharma, NP",
    credentials: "NP",
    bio:
      "Geriatric medicine and polypharmacy review. Specializes in tapering benzodiazepines using cannabinoid-supported protocols.",
    services: ["geriatrics", "medical-cannabis-cert", "pain-management"],
    licensedStates: ["FL", "GA", "TX"],
    cannabisProgramStates: ["FL"],
    acceptsInsurance: true,
    cashRateCents: 18000,
  },
];

const LISTINGS = new Map<string, ClinicianListing>(
  SEED_LISTINGS.map((l) => [l.slug, l]),
);

const APPLICATIONS = new Map<string, ClinicianApplication>();

export function listListings(): ClinicianListing[] {
  return Array.from(LISTINGS.values());
}

export function getListingBySlug(slug: string): ClinicianListing | undefined {
  return LISTINGS.get(slug);
}

export function recordApplication(app: ClinicianApplication): void {
  APPLICATIONS.set(app.id, app);
}

export function listApplications(): ClinicianApplication[] {
  return Array.from(APPLICATIONS.values());
}

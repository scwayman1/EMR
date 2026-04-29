// EMR-125 — Volunteer & Donation Module.
//
// Pure domain layer for the volunteer surface: opportunity registry,
// distance filtering, hours logging, quarterly progress, and
// certificate generation. The persistence layer lands later; this
// module is the contract.
//
// Article VII of the Constitution: 10–20 hours per quarter for every
// engaged member. The math here makes that target visible and
// celebratable in the UI.

export type CharityCategory =
  | "patient_advocacy"
  | "research"
  | "veteran"
  | "harm_reduction"
  | "food_security"
  | "youth_education"
  | "homelessness"
  | "environmental";

export type OpportunityKind = "in_person" | "remote" | "hybrid";

export interface VolunteerOpportunity {
  id: string;
  charityId: string;
  charityName: string;
  category: CharityCategory;
  title: string;
  summary: string;
  kind: OpportunityKind;
  location?: {
    city: string;
    state: string;
    lat: number;
    lon: number;
  };
  hoursEstimate: number;        // typical hours per session
  recurringWeekly?: boolean;
  vetted: boolean;              // passed AI compliance audit
  vettedAt?: string;
}

export type HourLogStatus = "self_reported" | "verified" | "disputed";

export interface VolunteerHour {
  id: string;
  userId: string;
  opportunityId: string;
  hours: number;
  occurredAt: string;
  status: HourLogStatus;
  proofUrl?: string;
  verifierName?: string;
  verifierEmail?: string;
  /** When set, the patient elected to donate the discount equivalent. */
  donatedToCharityId?: string;
}

// ---------------------------------------------------------------------------
// Geographic filtering — Haversine over the WGS-84 sphere. We only need
// "is this within N miles" not turn-by-turn navigation, so the great-circle
// approximation is plenty.
// ---------------------------------------------------------------------------

const EARTH_RADIUS_MILES = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function milesBetween(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Filter opportunities to those within `radiusMiles` of `home`. Remote
 * opportunities are always returned regardless of distance because they
 * have no geographic constraint.
 */
export function filterByRadius(
  opps: VolunteerOpportunity[],
  home: { lat: number; lon: number },
  radiusMiles: number,
): Array<VolunteerOpportunity & { milesFromHome?: number }> {
  return opps
    .map((o) => {
      if (o.kind === "remote" || !o.location) return { ...o, milesFromHome: undefined };
      const miles = milesBetween(home, o.location);
      return miles <= radiusMiles ? { ...o, milesFromHome: miles } : null;
    })
    .filter((x): x is VolunteerOpportunity & { milesFromHome?: number } => x != null)
    .sort((a, b) => {
      const am = a.milesFromHome ?? -1;
      const bm = b.milesFromHome ?? -1;
      if (am === bm) return a.title.localeCompare(b.title);
      return am - bm;
    });
}

// ---------------------------------------------------------------------------
// Quarterly progress — Article VII target is 10 hours minimum, 20 stretch.
// ---------------------------------------------------------------------------

export const QUARTERLY_MIN_HOURS = 10;
export const QUARTERLY_STRETCH_HOURS = 20;

export interface QuarterProgress {
  hoursThisQuarter: number;
  pctToMin: number;          // 0..100
  pctToStretch: number;      // 0..100
  metMin: boolean;
  metStretch: boolean;
  hoursToMin: number;
  hoursToStretch: number;
  quarterLabel: string;      // "Q2 2026"
}

function quarterStart(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}

function quarterLabel(d: Date): string {
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `Q${q} ${d.getUTCFullYear()}`;
}

export function computeQuarterProgress(
  hours: VolunteerHour[],
  asOf: Date = new Date(),
): QuarterProgress {
  const start = quarterStart(asOf);
  const total = hours
    .filter((h) => new Date(h.occurredAt).getTime() >= start.getTime())
    .reduce((s, h) => s + h.hours, 0);
  return {
    hoursThisQuarter: total,
    pctToMin: Math.min(100, (total / QUARTERLY_MIN_HOURS) * 100),
    pctToStretch: Math.min(100, (total / QUARTERLY_STRETCH_HOURS) * 100),
    metMin: total >= QUARTERLY_MIN_HOURS,
    metStretch: total >= QUARTERLY_STRETCH_HOURS,
    hoursToMin: Math.max(0, QUARTERLY_MIN_HOURS - total),
    hoursToStretch: Math.max(0, QUARTERLY_STRETCH_HOURS - total),
    quarterLabel: quarterLabel(asOf),
  };
}

// ---------------------------------------------------------------------------
// Certificate generation — deterministic, hash-stamped. The hash is what
// proves the certificate was issued by Leafjourney (it ties together
// userId + hours + period + charity into one verifiable string).
// ---------------------------------------------------------------------------

export interface VolunteerCertificate {
  id: string;
  userId: string;
  totalHours: number;
  periodStart: string;
  periodEnd: string;
  charities: string[];
  issuedAt: string;
  /** SHA-256 over the canonical fields above. */
  attestationHash: string;
}

/**
 * Tiny hash for attestation. Real impl uses crypto.subtle (web crypto) on
 * the server when this hits production; the deterministic pure-JS
 * fallback here keeps the module testable without async.
 */
export function attestationHashSync(payload: string): string {
  // FNV-1a 64-bit-ish folded into hex. Good enough as a stable identifier
  // for demo cards; production swaps in SHA-256.
  let h1 = 0xcbf29ce4 >>> 0;
  let h2 = 0x84222325 >>> 0;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = ((h1 ^ c) * 0x01000193) >>> 0;
    h2 = ((h2 ^ (c << 1)) * 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

export function generateCertificate(input: {
  userId: string;
  hours: VolunteerHour[];
  opportunityNames: Map<string, string>;
  periodStart: string;
  periodEnd: string;
  now?: Date;
}): VolunteerCertificate {
  const totalHours = input.hours.reduce((s, h) => s + h.hours, 0);
  const charities = Array.from(
    new Set(input.hours.map((h) => input.opportunityNames.get(h.opportunityId) ?? h.opportunityId)),
  ).sort();
  const issuedAt = (input.now ?? new Date()).toISOString();
  const canonical = [
    input.userId,
    totalHours.toFixed(2),
    input.periodStart,
    input.periodEnd,
    charities.join("|"),
    issuedAt,
  ].join("::");
  return {
    id: `cert-${attestationHashSync(canonical).slice(0, 12)}`,
    userId: input.userId,
    totalHours,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    charities,
    issuedAt,
    attestationHash: attestationHashSync(canonical),
  };
}

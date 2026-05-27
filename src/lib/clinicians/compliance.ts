// ---------------------------------------------------------------------------
// EMR-311 — Compliance matching engine
// ---------------------------------------------------------------------------
// Pure-function matcher. Inputs:
//   - the patient's physical-presence state at visit time
//   - whether they have a medical cannabis card / are eligible
//   - the service they need
// Outputs: per-listing match decisions with human-readable reasons.
//
// The deliberate non-feature here: we do NOT trust caller-provided
// "license is fine, ship it" booleans. Every match goes through this
// function. Rule changes happen in one place.
// ---------------------------------------------------------------------------

import type {
  ClinicianListing,
  ComplianceMatchInput,
  ComplianceMatchResult,
  UsState,
} from "./types";

/**
 * States where a *separate* state-level cannabis-program enrollment is
 * required (in addition to a medical license) to certify patients.
 *
 * Conservative list — everywhere outside this set we still require
 * patient eligibility, but we don't require the clinician to carry an
 * additional state-program enrollment beyond their license.
 */
const STATES_REQUIRING_PROGRAM_ENROLLMENT: ReadonlySet<UsState> = new Set<UsState>([
  "AZ", "CA", "CO", "CT", "DE", "FL", "IL", "MD", "MA", "MI",
  "MN", "MO", "MT", "NV", "NH", "NJ", "NM", "NY", "ND", "OH",
  "OK", "OR", "PA", "RI", "UT", "VT", "VA", "WA", "WV",
]);

/** States where adult-use is legal — informational only, not a match rule. */
const ADULT_USE_STATES: ReadonlySet<UsState> = new Set<UsState>([
  "AK", "AZ", "CA", "CO", "CT", "DE", "IL", "ME", "MD", "MA",
  "MI", "MN", "MO", "MT", "NV", "NJ", "NM", "NY", "OH", "OR",
  "RI", "VT", "VA", "WA", "DC",
]);

export function isAdultUseState(state: UsState): boolean {
  return ADULT_USE_STATES.has(state);
}

/**
 * Decide whether a single listing can legally see a single patient for
 * the requested service. Returns a result with reasons either way.
 */
export function matchListing(
  listing: ClinicianListing,
  input: ComplianceMatchInput,
): ComplianceMatchResult {
  const reasons: string[] = [];
  let isMatch = true;

  // Rule 1: clinician must be licensed in the patient's state of physical presence.
  if (!listing.licensedStates.includes(input.patientState)) {
    isMatch = false;
    reasons.push(
      `Not licensed in ${input.patientState}. Telehealth and cannabis certification both require an active license in the patient's state of physical presence.`,
    );
  } else {
    reasons.push(`Licensed in ${input.patientState}.`);
  }

  // Rule 2: clinician must offer the requested service.
  if (!listing.services.includes(input.service)) {
    isMatch = false;
    reasons.push(`Does not offer ${input.service}.`);
  }

  // Rule 3: cannabis-cert service has additional state-specific rules.
  if (input.service === "medical-cannabis-cert") {
    if (!input.patientHasCannabisCard) {
      reasons.push(
        "Patient is not yet enrolled in their state's medical cannabis program. The clinician can certify if eligible, otherwise this is informational.",
      );
    }
    if (STATES_REQUIRING_PROGRAM_ENROLLMENT.has(input.patientState)) {
      if (!listing.cannabisProgramStates.includes(input.patientState)) {
        isMatch = false;
        reasons.push(
          `${input.patientState} requires the clinician to be enrolled in the state's cannabis program before certifying patients. This clinician is not enrolled.`,
        );
      } else {
        reasons.push(
          `Enrolled in the ${input.patientState} medical cannabis program.`,
        );
      }
    }
  }

  return { listing, isMatch, reasons };
}

/**
 * Match a list of listings, return matches first then non-matches
 * (for the "show alternatives" pattern in the directory UI).
 */
export function matchDirectory(
  listings: ClinicianListing[],
  input: ComplianceMatchInput,
): ComplianceMatchResult[] {
  const results = listings.map((l) => matchListing(l, input));
  return results.sort((a, b) => Number(b.isMatch) - Number(a.isMatch));
}

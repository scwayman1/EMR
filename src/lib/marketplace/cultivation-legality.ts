// EMR-282 — per-state cannabis cultivation legality lookup.
//
// This data is curated, not authoritative. It maps each US state/territory
// to a short status descriptor and a plain-language summary that the PDP
// shows to patients alongside grow-accessory products.
//
// Patients are ALWAYS told to verify with their state's regulator before
// purchasing — the disclaimer is mandatory, this lookup is convenience.
//
// Status levels:
//   - allowed_recreational: adult-use home cultivation allowed
//   - allowed_medical: medical patients only
//   - registered_caregiver: only by registered caregivers/patients
//   - prohibited: home cultivation not allowed (medical or recreational)
//   - unknown: no data on file — fall back to "verify with your state"
//
// Dates and plant counts encoded here should be reviewed periodically;
// states amend cultivation laws frequently.

export type CultivationStatus =
  | "allowed_recreational"
  | "allowed_medical"
  | "registered_caregiver"
  | "prohibited"
  | "unknown";

export interface StateCultivationRule {
  state: string; // 2-letter postal code
  stateName: string;
  status: CultivationStatus;
  /** Plain-language summary safe to interpolate into the PDP banner. */
  summary: string;
  /** Plant count limit if applicable, otherwise null. */
  plantLimit?: number | null;
  /** URL of the state regulator's cultivation guidance, if public. */
  regulatorUrl?: string | null;
}

// Curated state-by-state status. Personal-cultivation laws as of early 2026.
// Where a state has multiple thresholds (e.g., per household vs per adult),
// the summary uses the more permissive number and notes the household cap.
const RULES: StateCultivationRule[] = [
  { state: "AK", stateName: "Alaska", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants (3 mature) per household.", plantLimit: 6 },
  { state: "AL", stateName: "Alabama", status: "prohibited", summary: "Home cultivation is prohibited, including for medical patients." },
  { state: "AR", stateName: "Arkansas", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use licensed dispensaries." },
  { state: "AZ", stateName: "Arizona", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants per adult, capped at 12 per household.", plantLimit: 12 },
  { state: "CA", stateName: "California", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants per residence indoors; outdoor cultivation may be restricted locally.", plantLimit: 6 },
  { state: "CO", stateName: "Colorado", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants (3 flowering), capped at 12 per residence.", plantLimit: 12 },
  { state: "CT", stateName: "Connecticut", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants per person, 12 per household.", plantLimit: 12 },
  { state: "DC", stateName: "District of Columbia", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants (3 mature) per household.", plantLimit: 6 },
  { state: "DE", stateName: "Delaware", status: "prohibited", summary: "Home cultivation is prohibited under current state law." },
  { state: "FL", stateName: "Florida", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use licensed dispensaries." },
  { state: "GA", stateName: "Georgia", status: "prohibited", summary: "Home cultivation is prohibited; only low-THC oil is legal for qualified medical patients." },
  { state: "HI", stateName: "Hawaii", status: "allowed_medical", summary: "Registered medical patients may cultivate up to 10 plants at one site.", plantLimit: 10 },
  { state: "IA", stateName: "Iowa", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "ID", stateName: "Idaho", status: "prohibited", summary: "Cannabis cultivation is prohibited under any circumstance." },
  { state: "IL", stateName: "Illinois", status: "allowed_medical", summary: "Medical patients may cultivate up to 5 plants; recreational home grow is not legal.", plantLimit: 5 },
  { state: "IN", stateName: "Indiana", status: "prohibited", summary: "Home cultivation is prohibited under state law." },
  { state: "KS", stateName: "Kansas", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "KY", stateName: "Kentucky", status: "prohibited", summary: "Home cultivation is prohibited; medical program limits use to non-smokable forms." },
  { state: "LA", stateName: "Louisiana", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use authorized pharmacies." },
  { state: "MA", stateName: "Massachusetts", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants per person, 12 per household.", plantLimit: 12 },
  { state: "MD", stateName: "Maryland", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 2 plants per household.", plantLimit: 2 },
  { state: "ME", stateName: "Maine", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 3 mature, 12 immature, and unlimited seedlings.", plantLimit: 3 },
  { state: "MI", stateName: "Michigan", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 12 plants per household.", plantLimit: 12 },
  { state: "MN", stateName: "Minnesota", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 8 plants (4 mature) per residence.", plantLimit: 8 },
  { state: "MO", stateName: "Missouri", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 flowering plants, 6 nonflowering, and 6 clones.", plantLimit: 18 },
  { state: "MS", stateName: "Mississippi", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "MT", stateName: "Montana", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 4 mature and 4 seedlings per household.", plantLimit: 8 },
  { state: "NC", stateName: "North Carolina", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "ND", stateName: "North Dakota", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "NE", stateName: "Nebraska", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "NH", stateName: "New Hampshire", status: "registered_caregiver", summary: "Cultivation is restricted to therapeutic alternative treatment centers." },
  { state: "NJ", stateName: "New Jersey", status: "prohibited", summary: "Home cultivation remains prohibited even under recreational legalization." },
  { state: "NM", stateName: "New Mexico", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 mature and 6 immature plants per person, 12 mature per household.", plantLimit: 12 },
  { state: "NV", stateName: "Nevada", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants, 12 per household — only if 25+ miles from a dispensary.", plantLimit: 12 },
  { state: "NY", stateName: "New York", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 3 mature and 3 immature plants per person, 12 per household.", plantLimit: 12 },
  { state: "OH", stateName: "Ohio", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 6 plants per adult, 12 per household.", plantLimit: 12 },
  { state: "OK", stateName: "Oklahoma", status: "allowed_medical", summary: "Medical patients may cultivate up to 6 mature plants and 6 seedlings.", plantLimit: 12 },
  { state: "OR", stateName: "Oregon", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 4 plants per household regardless of number of adults.", plantLimit: 4 },
  { state: "PA", stateName: "Pennsylvania", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use dispensaries." },
  { state: "RI", stateName: "Rhode Island", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 3 mature and 3 immature plants.", plantLimit: 6 },
  { state: "SC", stateName: "South Carolina", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "SD", stateName: "South Dakota", status: "allowed_medical", summary: "Medical patients without nearby dispensary access may cultivate up to 3 plants.", plantLimit: 3 },
  { state: "TN", stateName: "Tennessee", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "TX", stateName: "Texas", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "UT", stateName: "Utah", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use licensed pharmacies." },
  { state: "VA", stateName: "Virginia", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 4 plants per household.", plantLimit: 4 },
  { state: "VT", stateName: "Vermont", status: "allowed_recreational", summary: "Adults 21+ may cultivate up to 2 mature and 4 immature plants per household.", plantLimit: 6 },
  { state: "WA", stateName: "Washington", status: "allowed_medical", summary: "Medical patients may cultivate up to 6 plants (15 with extra authorization); recreational home grow is not legal.", plantLimit: 6 },
  { state: "WI", stateName: "Wisconsin", status: "prohibited", summary: "Home cultivation is prohibited." },
  { state: "WV", stateName: "West Virginia", status: "prohibited", summary: "Home cultivation is prohibited; medical patients must use dispensaries." },
  { state: "WY", stateName: "Wyoming", status: "prohibited", summary: "Cannabis cultivation is prohibited." },
];

const BY_CODE: Record<string, StateCultivationRule> = Object.fromEntries(
  RULES.map((r) => [r.state, r]),
);

/** Look up a state's cultivation rule by 2-letter postal code (case-insensitive).
 *  Unknown / non-US states return null so callers can fall back to the
 *  generic "verify with your state" disclaimer. */
export function getCultivationRule(state: string | null | undefined): StateCultivationRule | null {
  if (!state) return null;
  const key = state.trim().toUpperCase();
  return BY_CODE[key] ?? null;
}

export function statusLabel(status: CultivationStatus): string {
  switch (status) {
    case "allowed_recreational":
      return "Permitted (adults 21+)";
    case "allowed_medical":
      return "Permitted for medical patients";
    case "registered_caregiver":
      return "Restricted to caregivers";
    case "prohibited":
      return "Prohibited";
    case "unknown":
      return "Verify with your state";
  }
}

export function statusTone(status: CultivationStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "allowed_recreational":
      return "success";
    case "allowed_medical":
    case "registered_caregiver":
      return "warning";
    case "prohibited":
      return "danger";
    case "unknown":
      return "neutral";
  }
}

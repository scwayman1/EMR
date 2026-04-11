/**
 * Denial Triage — taxonomy + next-action recommendations.
 *
 * Per PRD section 12.10, denials must be:
 *   - Classified by reason category
 *   - Routed to a work item with a suggested next action
 *   - Tracked for root-cause trends by payer + code + rule type
 *
 * This module is the rules engine. The Denial Triage Agent (future)
 * wraps it and adds LLM-powered free-text classification for messy
 * payer denial messages that don't match known patterns.
 */

export type DenialCategory =
  | "registration"          // wrong demographic / coverage info
  | "eligibility"           // patient not covered on date of service
  | "authorization"         // missing or invalid prior auth
  | "coding"                // CPT/ICD coding error
  | "modifier"              // missing or wrong modifier
  | "medical_necessity"    // payer questioned necessity
  | "timely_filing"        // submitted past filing window
  | "coordination_of_benefits" // wrong primary/secondary order
  | "duplicate"             // claim already on file
  | "bundling"              // included in another billed code
  | "non_covered_service"  // service not covered by plan
  | "credentialing"        // provider not credentialed with payer
  | "other";

export interface DenialTaxonomyEntry {
  category: DenialCategory;
  label: string;
  /** Common payer denial-message keywords that map to this category */
  keywords: string[];
  /** Recommended next action for the biller */
  suggestedAction: NextAction;
  /** Plain language description shown to billers */
  description: string;
  /** How urgent — drives queue priority */
  urgency: "high" | "medium" | "low";
}

export type NextAction =
  | "correct_and_resubmit"
  | "submit_appeal"
  | "request_records"
  | "obtain_authorization"
  | "verify_eligibility"
  | "update_coding"
  | "transfer_to_patient"
  | "write_off"
  | "contact_payer";

export const DENIAL_TAXONOMY: DenialTaxonomyEntry[] = [
  {
    category: "authorization",
    label: "Missing prior authorization",
    keywords: ["prior auth", "no authorization", "authorization required", "auth not on file"],
    suggestedAction: "obtain_authorization",
    description:
      "Payer requires prior authorization for this service and none was obtained or referenced.",
    urgency: "high",
  },
  {
    category: "eligibility",
    label: "Patient not eligible",
    keywords: ["not eligible", "no coverage", "policy termed", "termination"],
    suggestedAction: "verify_eligibility",
    description:
      "Payer says the patient was not actively covered on the date of service.",
    urgency: "high",
  },
  {
    category: "registration",
    label: "Incorrect demographic data",
    keywords: ["member id", "subscriber", "wrong dob", "name mismatch"],
    suggestedAction: "correct_and_resubmit",
    description:
      "Payer rejected because patient identification fields don't match their records.",
    urgency: "medium",
  },
  {
    category: "coding",
    label: "Coding error",
    keywords: ["invalid code", "deleted code", "coding error", "unbundling", "wrong code"],
    suggestedAction: "update_coding",
    description:
      "The CPT, ICD-10, or modifier on the claim doesn't satisfy the payer's coding rules.",
    urgency: "medium",
  },
  {
    category: "modifier",
    label: "Missing or invalid modifier",
    keywords: ["modifier", "modifier 25", "modifier 59", "missing modifier"],
    suggestedAction: "update_coding",
    description:
      "A required modifier is missing, or the modifier on file is wrong for the procedure.",
    urgency: "medium",
  },
  {
    category: "medical_necessity",
    label: "Medical necessity",
    keywords: ["medical necessity", "not medically necessary", "ncd", "lcd"],
    suggestedAction: "submit_appeal",
    description:
      "Payer is questioning whether the service was medically necessary. Usually requires records + appeal letter.",
    urgency: "high",
  },
  {
    category: "timely_filing",
    label: "Past timely filing",
    keywords: ["timely filing", "filing limit", "past deadline"],
    suggestedAction: "submit_appeal",
    description:
      "Submitted past the payer's filing window. Appeal requires proof of timely intent (delivery confirmation, etc.).",
    urgency: "low",
  },
  {
    category: "coordination_of_benefits",
    label: "COB issue",
    keywords: ["cob", "coordination of benefits", "primary payer", "other insurance"],
    suggestedAction: "verify_eligibility",
    description:
      "Payer wants you to bill another payer first, or update the COB order.",
    urgency: "medium",
  },
  {
    category: "duplicate",
    label: "Duplicate claim",
    keywords: ["duplicate", "already paid", "previously processed"],
    suggestedAction: "contact_payer",
    description:
      "Payer says this claim has already been processed. Verify against ERA history.",
    urgency: "low",
  },
  {
    category: "bundling",
    label: "Bundled into another service",
    keywords: ["bundled", "incidental", "included in another", "ncci"],
    suggestedAction: "update_coding",
    description:
      "Payer bundled this code into another service on the same day. May need a modifier or write-off.",
    urgency: "medium",
  },
  {
    category: "non_covered_service",
    label: "Non-covered service",
    keywords: ["not covered", "non-covered", "exclusion", "benefit exclusion"],
    suggestedAction: "transfer_to_patient",
    description:
      "Patient's plan does not cover this service. Bill the patient directly with an ABN if applicable.",
    urgency: "low",
  },
  {
    category: "credentialing",
    label: "Provider not credentialed",
    keywords: ["not credentialed", "out of network", "provider not on file"],
    suggestedAction: "contact_payer",
    description:
      "Rendering provider is not credentialed with this payer. Verify enrollment status.",
    urgency: "high",
  },
];

export function classifyDenial(reasonText: string | null | undefined): DenialTaxonomyEntry {
  if (!reasonText) return UNKNOWN_DENIAL;
  const text = reasonText.toLowerCase();
  for (const entry of DENIAL_TAXONOMY) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return entry;
    }
  }
  return UNKNOWN_DENIAL;
}

const UNKNOWN_DENIAL: DenialTaxonomyEntry = {
  category: "other",
  label: "Other / unclassified",
  keywords: [],
  suggestedAction: "contact_payer",
  description:
    "This denial reason doesn't match a known pattern. Review the full payer message and route to a senior biller.",
  urgency: "medium",
};

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  correct_and_resubmit: "Correct & resubmit",
  submit_appeal: "Submit appeal",
  request_records: "Request records",
  obtain_authorization: "Obtain auth",
  verify_eligibility: "Verify eligibility",
  update_coding: "Update coding",
  transfer_to_patient: "Transfer to patient",
  write_off: "Write off",
  contact_payer: "Contact payer",
};

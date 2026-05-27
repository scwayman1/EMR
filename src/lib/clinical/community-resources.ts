/**
 * EMR-086 — Community resource connector
 *
 * A focused matcher built on top of the curated resource list in
 * `@/lib/domain/community-resources`. Given a patient's conditions,
 * geography, and preferences, return ranked resources the clinician
 * can hand off — and shape the message that goes to the patient.
 *
 * The heavy data lives in domain/. This file is the *clinical* glue:
 * matching logic, condition→category mapping, and patient-facing
 * blurb generation.
 */

import {
  COMMUNITY_RESOURCES,
  type CommunityResource,
  type ConditionCategory,
} from "@/lib/domain/community-resources";

export interface MatchInput {
  /** Free-text or ICD-10 codes describing the patient's situation */
  conditions: string[];
  patientCity?: string;
  patientState?: string;
  patientRegion?: string;
  /** "free" preference filters out fee-based unless it's the only match. */
  preferFree?: boolean;
  /** Cap on returned resources */
  limit?: number;
}

export interface ResourceMatch {
  resource: CommunityResource;
  score: number;
  reasons: string[];
}

const ICD10_CATEGORY_MAP: Array<{ pattern: RegExp; category: ConditionCategory }> = [
  { pattern: /^F0[0-3]/i, category: "dementia" },
  { pattern: /^G30/i, category: "dementia" },
  { pattern: /^C\d{2}/i, category: "cancer" },
  { pattern: /^G35/i, category: "ms" },
  { pattern: /^G40/i, category: "epilepsy" },
  { pattern: /^F4(0|1|3)/i, category: "mental_health" },
  { pattern: /^F43\.1/i, category: "ptsd" },
  { pattern: /^F1[01]/i, category: "addiction" },
  { pattern: /^M(54|79)/i, category: "chronic_pain" },
  { pattern: /^G89/i, category: "chronic_pain" },
];

const KEYWORD_CATEGORY_MAP: Array<{ pattern: RegExp; category: ConditionCategory }> = [
  { pattern: /alzheimer|dementia|memory loss|cognitive decline/i, category: "dementia" },
  { pattern: /cancer|oncology|chemo|tumor|malignan/i, category: "cancer" },
  { pattern: /chronic pain|fibromyalgia|low back pain|neuropath/i, category: "chronic_pain" },
  { pattern: /depress|anxiet|bipolar|mental health/i, category: "mental_health" },
  { pattern: /multiple sclerosis|\bms\b/i, category: "ms" },
  { pattern: /epilep|seizure/i, category: "epilepsy" },
  { pattern: /ptsd|post.?traumatic|trauma/i, category: "ptsd" },
  { pattern: /addict|substance use|opioid use|alcohol use/i, category: "addiction" },
];

export function inferCategories(conditions: string[]): ConditionCategory[] {
  const found = new Set<ConditionCategory>();
  for (const raw of conditions) {
    const c = raw.trim();
    if (!c) continue;
    for (const m of ICD10_CATEGORY_MAP) {
      if (m.pattern.test(c)) found.add(m.category);
    }
    for (const m of KEYWORD_CATEGORY_MAP) {
      if (m.pattern.test(c)) found.add(m.category);
    }
  }
  if (found.size === 0) found.add("general");
  return Array.from(found);
}

export function matchResources(input: MatchInput): ResourceMatch[] {
  const categories = inferCategories(input.conditions);
  const limit = input.limit ?? 8;

  const scored: ResourceMatch[] = [];

  for (const resource of COMMUNITY_RESOURCES) {
    const reasons: string[] = [];
    let score = 0;

    const categoryHit = resource.category.find((c) => categories.includes(c));
    if (categoryHit) {
      score += 5;
      reasons.push(`Matches ${categoryHit.replace("_", " ")}`);
    } else if (resource.category.includes("general")) {
      score += 1;
    } else {
      // Skip resources outside the patient's category set unless general
      continue;
    }

    if (input.patientRegion && resource.region === input.patientRegion) {
      score += 4;
      reasons.push(`Local to ${resource.region}`);
    } else if (input.patientCity && resource.city === input.patientCity) {
      score += 4;
      reasons.push(`In ${resource.city}`);
    } else if (input.patientState && resource.state === input.patientState) {
      score += 2;
      reasons.push(`In ${resource.state}`);
    } else if (resource.national) {
      score += 1;
      reasons.push("National program");
    }

    if (input.preferFree) {
      if (resource.feeStructure === "free") {
        score += 2;
        reasons.push("Free program");
      } else if (resource.feeStructure === "sliding_scale") {
        score += 1;
        reasons.push("Sliding scale fees");
      } else if (resource.feeStructure === "fee_based") {
        score -= 1;
      }
    }

    // Free-text tag boost
    const haystack = input.conditions.join(" ").toLowerCase();
    const tagHits = resource.tags.filter((t) => haystack.includes(t.toLowerCase()));
    if (tagHits.length > 0) {
      score += Math.min(3, tagHits.length);
      reasons.push(`Tag match: ${tagHits.slice(0, 3).join(", ")}`);
    }

    scored.push({ resource, score, reasons });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Patient-facing handoff message — clinician edits before sending. */
export function buildPatientHandoff(
  patientFirstName: string,
  match: ResourceMatch
): string {
  const { resource } = match;
  const lines = [
    `Hi ${patientFirstName},`,
    "",
    `As we discussed, I'd like to connect you with **${resource.name}**.`,
    "",
    resource.description,
    "",
    `**What to expect:** ${resource.whatToExpect}`,
    "",
    `**How to reach them:**`,
  ];
  if (resource.phone) lines.push(`📞 ${resource.phone}`);
  lines.push(`🌐 ${resource.website}`);
  if (resource.email) lines.push(`✉️  ${resource.email}`);
  lines.push("");
  if (resource.feeStructure === "free") {
    lines.push("This program is free.");
  } else if (resource.feeStructure === "sliding_scale") {
    lines.push("Fees are on a sliding scale based on income.");
  }
  lines.push("");
  lines.push("Let me know how it goes — your care team is here to support you.");
  return lines.join("\n");
}

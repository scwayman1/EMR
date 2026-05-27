/**
 * EMR-154 — FDA Rx Database + Cannabis Rx + Supplement Recommendations
 *
 * Three databases bundled into one module because they share lookups:
 *
 *   1. FDA reference — NDC, generic name, brand, route, schedule, and
 *      black-box warnings for the drugs that matter most in our
 *      population. Real openFDA integration plugs into `lookupNdc`.
 *
 *   2. Cannabis cross-reference — for any FDA drug, find the cannabis
 *      products in our internal catalog that are commonly used together
 *      (or dangerous to combine).
 *
 *   3. Supplement recommendation engine — given a patient's condition
 *      list and current medications, suggest evidence-tagged
 *      supplements (with rationale + interaction caveats).
 *
 * The module is import-safe on both server and client (no node-only
 * imports). Real network access is gated behind `lookupNdc` so the UI
 * can stub it during testing.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* FDA reference                                                              */
/* -------------------------------------------------------------------------- */

export const fdaDrugSchema = z.object({
  ndc: z.string(),
  generic: z.string(),
  brand: z.string().optional(),
  route: z.string(),
  /** DEA schedule. "NS" = not scheduled. */
  schedule: z.enum(["NS", "I", "II", "III", "IV", "V"]).default("NS"),
  /** Highest-priority black-box warnings, plain language. */
  blackBox: z.array(z.string()).default([]),
  /** Pregnancy category (legacy A/B/C/D/X). */
  pregnancyCategory: z.enum(["A", "B", "C", "D", "X", "N"]).default("N"),
  /** Common indications. */
  indications: z.array(z.string()).default([]),
});

export type FdaDrug = z.infer<typeof fdaDrugSchema>;

const FDA_LOCAL: FdaDrug[] = [
  {
    ndc: "0093-1077-01",
    generic: "metformin hydrochloride",
    brand: "Glucophage",
    route: "oral",
    schedule: "NS",
    blackBox: ["Lactic acidosis with renal impairment or contrast exposure."],
    pregnancyCategory: "B",
    indications: ["type 2 diabetes mellitus"],
  },
  {
    ndc: "0071-0222-23",
    generic: "atorvastatin calcium",
    brand: "Lipitor",
    route: "oral",
    schedule: "NS",
    blackBox: [],
    pregnancyCategory: "X",
    indications: ["hyperlipidemia", "ASCVD risk reduction"],
  },
  {
    ndc: "0093-1041-01",
    generic: "lisinopril",
    brand: "Prinivil",
    route: "oral",
    schedule: "NS",
    blackBox: ["Fetal toxicity — discontinue when pregnancy is detected."],
    pregnancyCategory: "D",
    indications: ["hypertension", "heart failure"],
  },
  {
    ndc: "0049-4900-66",
    generic: "sertraline hydrochloride",
    brand: "Zoloft",
    route: "oral",
    schedule: "NS",
    blackBox: [
      "Suicidal thinking and behavior in children, adolescents, and young adults.",
    ],
    pregnancyCategory: "C",
    indications: ["major depressive disorder", "PTSD", "OCD"],
  },
  {
    ndc: "59390-0006-1",
    generic: "cannabidiol",
    brand: "Epidiolex",
    route: "oral",
    schedule: "V",
    blackBox: [],
    pregnancyCategory: "C",
    indications: ["Lennox-Gastaut", "Dravet syndrome", "tuberous sclerosis"],
  },
  {
    ndc: "0173-0682-00",
    generic: "warfarin sodium",
    brand: "Coumadin",
    route: "oral",
    schedule: "NS",
    blackBox: ["Major or fatal bleeding. Regular INR monitoring required."],
    pregnancyCategory: "X",
    indications: ["AFib stroke prophylaxis", "DVT/PE", "valve replacement"],
  },
  {
    ndc: "00378-0212-01",
    generic: "albuterol sulfate",
    brand: "ProAir HFA",
    route: "inhalation",
    schedule: "NS",
    blackBox: [],
    pregnancyCategory: "C",
    indications: ["asthma", "COPD"],
  },
  {
    ndc: "00781-1506-01",
    generic: "metoprolol tartrate",
    brand: "Lopressor",
    route: "oral",
    schedule: "NS",
    blackBox: ["Do not abruptly discontinue — risk of ischemia or arrhythmia."],
    pregnancyCategory: "C",
    indications: ["hypertension", "angina", "MI"],
  },
];

const NDC_INDEX = new Map<string, FdaDrug>(FDA_LOCAL.map((d) => [d.ndc, d]));
const GENERIC_INDEX = new Map<string, FdaDrug>();
const BRAND_INDEX = new Map<string, FdaDrug>();
for (const d of FDA_LOCAL) {
  GENERIC_INDEX.set(d.generic.toLowerCase(), d);
  if (d.brand) BRAND_INDEX.set(d.brand.toLowerCase(), d);
}

/** Look up an FDA drug by NDC. Returns null if unknown. */
export function lookupNdc(ndc: string): FdaDrug | null {
  return NDC_INDEX.get(ndc) ?? null;
}

/** Look up by generic or brand name (case-insensitive). */
export function lookupByName(name: string): FdaDrug | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return (
    GENERIC_INDEX.get(q) ??
    BRAND_INDEX.get(q) ??
    FDA_LOCAL.find(
      (d) =>
        d.generic.toLowerCase().includes(q) ||
        d.brand?.toLowerCase().includes(q),
    ) ??
    null
  );
}

/** Returns true if any black-box warning is present. */
export function hasBlackBox(drug: FdaDrug): boolean {
  return drug.blackBox.length > 0;
}

export function searchFdaDatabase(query: string, limit = 10): FdaDrug[] {
  const q = query.trim().toLowerCase();
  if (!q) return FDA_LOCAL.slice(0, limit);
  return FDA_LOCAL.filter((d) => {
    return (
      d.ndc.includes(q) ||
      d.generic.toLowerCase().includes(q) ||
      (d.brand?.toLowerCase().includes(q) ?? false) ||
      d.indications.some((i) => i.toLowerCase().includes(q))
    );
  }).slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Cannabis cross-reference                                                   */
/* -------------------------------------------------------------------------- */

export interface CannabisProduct {
  id: string;
  name: string;
  type: "flower" | "tincture" | "edible" | "topical" | "vape" | "capsule";
  cannabinoidProfile: { thc: number; cbd: number; cbg?: number; cbn?: number };
  /** Conditions where the product has been used in our catalog. */
  conditions: string[];
}

const CANNABIS_CATALOG: CannabisProduct[] = [
  { id: "cbd-tincture-30", name: "Full-spectrum CBD tincture 30mg/mL", type: "tincture", cannabinoidProfile: { thc: 0.3, cbd: 30 }, conditions: ["anxiety", "chronic pain", "insomnia"] },
  { id: "cbn-sleep", name: "CBN sleep capsule 5mg", type: "capsule", cannabinoidProfile: { thc: 0, cbd: 5, cbn: 5 }, conditions: ["insomnia"] },
  { id: "thc-cbd-1-1", name: "THC:CBD 1:1 tincture", type: "tincture", cannabinoidProfile: { thc: 10, cbd: 10 }, conditions: ["chronic pain", "muscle spasm"] },
  { id: "topical-cbd", name: "CBD topical balm 200mg", type: "topical", cannabinoidProfile: { thc: 0, cbd: 200 }, conditions: ["arthritis", "neuropathy", "muscle pain"] },
  { id: "cbg-day", name: "CBG daytime tincture", type: "tincture", cannabinoidProfile: { thc: 0, cbd: 5, cbg: 15 }, conditions: ["focus", "IBS", "inflammation"] },
];

export interface CannabisCrossRef {
  drug: FdaDrug;
  /** Cannabis products commonly co-used for the same indication. */
  commonCoUse: CannabisProduct[];
  /** Plain-language combination caution, if relevant. */
  caution?: string;
}

const CANNABIS_CAUTIONS: Array<{ pattern: RegExp; caution: string }> = [
  { pattern: /warfarin|coumadin/i, caution: "CBD inhibits CYP2C9 — can prolong warfarin's effect. Monitor INR if combining." },
  { pattern: /sertraline|fluoxetine|escitalopram/i, caution: "Cannabis may amplify SSRI sedation. Start low and go slow." },
  { pattern: /clobazam/i, caution: "CBD can boost clobazam levels. Check serum levels if combining." },
  { pattern: /metoprolol|atenolol/i, caution: "Cannabis can lower BP and HR — additive effect with beta-blockers." },
];

export function cannabisCrossReference(drugName: string): CannabisCrossRef | null {
  const drug = lookupByName(drugName);
  if (!drug) return null;

  // Map FDA indications to cannabis-catalog conditions by keyword.
  const indicationKeywords = drug.indications.flatMap((i) =>
    i.toLowerCase().split(/[\s,]+/),
  );
  const commonCoUse = CANNABIS_CATALOG.filter((p) =>
    p.conditions.some((c) =>
      indicationKeywords.some((k) => c.includes(k) || k.includes(c)),
    ),
  );

  const cautionMatch = CANNABIS_CAUTIONS.find((c) => c.pattern.test(drug.generic));

  return { drug, commonCoUse, caution: cautionMatch?.caution };
}

/* -------------------------------------------------------------------------- */
/* Supplement recommendation engine                                           */
/* -------------------------------------------------------------------------- */

export type EvidenceLevel = "strong" | "moderate" | "emerging" | "anecdotal";

export interface SupplementRecommendation {
  id: string;
  name: string;
  dose: string;
  rationale: string;
  evidence: EvidenceLevel;
  /** Conditions this supplement is targeting in this profile. */
  forConditions: string[];
  /** Drug interactions worth flagging if the patient is taking related meds. */
  cautions: string[];
}

export interface SupplementProfile {
  /** ICD-10 codes or condition keywords. */
  conditions: string[];
  /** Generic names of current medications. */
  medications: string[];
  /** Optional patient prefs. */
  vegetarian?: boolean;
}

interface SupplementRule {
  conditionMatch: RegExp;
  rec: Omit<SupplementRecommendation, "forConditions">;
  /** Skip the rec if any of these meds are present. */
  avoidWith?: RegExp[];
}

const SUPPLEMENT_RULES: SupplementRule[] = [
  {
    conditionMatch: /vitamin d|osteopor|E55|M81/i,
    rec: {
      id: "vitamin-d3",
      name: "Vitamin D3",
      dose: "1000–2000 IU daily",
      rationale: "Improves bone health and immune function. Most clinic patients run low.",
      evidence: "strong",
      cautions: ["Avoid mega-doses with thiazide diuretics — hypercalcemia risk."],
    },
  },
  {
    conditionMatch: /diabet|E11/i,
    rec: {
      id: "magnesium-glycinate",
      name: "Magnesium glycinate",
      dose: "200–400 mg at bedtime",
      rationale: "Supports glucose regulation and sleep in type-2 diabetes.",
      evidence: "moderate",
      cautions: ["Reduce dose with renal impairment."],
    },
  },
  {
    conditionMatch: /lipid|hyperlip|E78/i,
    rec: {
      id: "omega-3",
      name: "Omega-3 (EPA/DHA)",
      dose: "1000 mg EPA+DHA daily",
      rationale: "Lowers triglycerides and cardiovascular risk.",
      evidence: "strong",
      cautions: ["Bleed risk if combined with warfarin or DOACs."],
    },
    avoidWith: [/warfarin/i],
  },
  {
    conditionMatch: /anxiety|F41/i,
    rec: {
      id: "l-theanine",
      name: "L-theanine",
      dose: "200 mg as needed",
      rationale: "Smooths daytime anxiety without sedation.",
      evidence: "emerging",
      cautions: [],
    },
  },
  {
    conditionMatch: /insomnia|G47/i,
    rec: {
      id: "magnesium-threonate",
      name: "Magnesium L-threonate",
      dose: "144 mg at bedtime",
      rationale: "Crosses the blood-brain barrier; supports sleep onset.",
      evidence: "emerging",
      cautions: [],
    },
  },
  {
    conditionMatch: /depress|F32|F33/i,
    rec: {
      id: "b-complex",
      name: "Active B-complex (methylated)",
      dose: "Once daily with food",
      rationale: "Cofactor support for monoamine synthesis.",
      evidence: "moderate",
      cautions: [],
    },
  },
  {
    conditionMatch: /pain|arthri|fibromyalgia|M79|M19/i,
    rec: {
      id: "turmeric",
      name: "Turmeric (curcumin)",
      dose: "500 mg twice daily with black pepper extract",
      rationale: "Anti-inflammatory; useful for OA/RA pain.",
      evidence: "moderate",
      cautions: ["Bleed risk with anticoagulants. Pause before surgery."],
    },
    avoidWith: [/warfarin|apixaban|rivaroxaban/i],
  },
];

export function recommendSupplements(
  profile: SupplementProfile,
): SupplementRecommendation[] {
  const meds = profile.medications.join(" ");
  const out: Map<string, SupplementRecommendation> = new Map();

  for (const condition of profile.conditions) {
    for (const rule of SUPPLEMENT_RULES) {
      if (!rule.conditionMatch.test(condition)) continue;
      if (rule.avoidWith?.some((re) => re.test(meds))) continue;
      const existing = out.get(rule.rec.id);
      if (existing) {
        existing.forConditions = Array.from(
          new Set([...existing.forConditions, condition]),
        );
      } else {
        out.set(rule.rec.id, { ...rule.rec, forConditions: [condition] });
      }
    }
  }

  return [...out.values()].sort((a, b) => evidenceRank(b.evidence) - evidenceRank(a.evidence));
}

function evidenceRank(e: EvidenceLevel): number {
  return e === "strong" ? 4 : e === "moderate" ? 3 : e === "emerging" ? 2 : 1;
}

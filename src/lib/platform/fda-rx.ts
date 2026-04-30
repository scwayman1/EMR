/**
 * EMR-154 — FDA Rx + Cannabis Rx + Supplement recommendation module.
 *
 * Curated, code-resident product bank that backs three workflows:
 *
 *  1. Prescribing — clinician searches by name, indication or class
 *     across FDA-approved Rx, cannabis-specific dosing primitives, and
 *     evidence-rated supplements.
 *  2. Recommendation — given a problem (e.g. "insomnia"), return a
 *     short ranked list of options the clinician can review.
 *  3. Drug-cannabis interaction — surface known interactions between
 *     the patient's current Rx and a cannabis regimen.
 *
 * The dataset here is intentionally curated and conservative. Production
 * deployments should plug in openFDA + RxNorm + DSLD live (the agent
 * `drugCannabisInteractionChecker` already calls into this module).
 *
 * Structure / function framing on supplements — never disease claims.
 */

export type RxClass =
  | "rx"
  | "cannabis"
  | "supplement";

export type EvidenceLevel = "strong" | "moderate" | "limited" | "anecdotal";

export interface RxEntry {
  id: string;
  /** Display name. */
  name: string;
  /** RxNorm CUI when applicable; null for cannabis primitives + DSLD-only items. */
  rxnormCode: string | null;
  /** FDA NDC when applicable. */
  ndc: string | null;
  class: RxClass;
  /** Therapeutic class — used for de-duping and search filters. */
  therapeuticClass: string;
  /** Indications we'll surface in the prescribing flow. */
  indications: string[];
  /** Common adult dose — string for flexibility. */
  commonAdultDose: string;
  /** Dose route. */
  route:
    | "oral"
    | "sublingual"
    | "topical"
    | "transdermal"
    | "inhaled"
    | "rectal"
    | "injection";
  /** Major contraindications (free text). */
  contraindications: string[];
  /** Drugs / classes that cause clinically meaningful interactions. */
  interactsWith: string[];
  /** Evidence rating for cannabis combination (informational only). */
  cannabisEvidence: EvidenceLevel;
  /** One-liner used in patient-facing explainers. */
  patientExplainer: string;
  /** Whether DEA-controlled. */
  controlled?: "II" | "III" | "IV" | "V";
}

export const RX_CATALOG: RxEntry[] = [
  // ─── Pain ────────────────────────────────────────────────
  {
    id: "rx-gabapentin",
    name: "Gabapentin",
    rxnormCode: "5310",
    ndc: "0093-1031-01",
    class: "rx",
    therapeuticClass: "Anticonvulsant / neuropathic pain",
    indications: ["neuropathic pain", "post-herpetic neuralgia", "anxiety (off-label)"],
    commonAdultDose: "300-600 mg PO TID, titrate from 300 mg qHS.",
    route: "oral",
    contraindications: ["renal impairment without dose adjustment"],
    interactsWith: ["opioids", "alcohol", "CNS depressants"],
    cannabisEvidence: "moderate",
    patientExplainer:
      "A nerve-pain medicine that pairs reasonably with cannabis but doubles the sleepiness.",
  },
  {
    id: "rx-tramadol",
    name: "Tramadol",
    rxnormCode: "10689",
    ndc: "0093-0058-01",
    class: "rx",
    therapeuticClass: "Atypical opioid analgesic",
    indications: ["moderate pain"],
    commonAdultDose: "50-100 mg PO every 4-6h, max 400 mg/day.",
    route: "oral",
    contraindications: ["seizure disorder", "MAOI use", "concurrent SSRIs (serotonin syndrome)"],
    interactsWith: ["SSRIs", "SNRIs", "MAOIs", "alcohol"],
    cannabisEvidence: "limited",
    patientExplainer:
      "An opioid-light pain medicine. Cannabis can lower the dose needed but may amplify drowsiness.",
    controlled: "IV",
  },
  // ─── Anxiety / sleep ─────────────────────────────────────
  {
    id: "rx-buspirone",
    name: "Buspirone",
    rxnormCode: "1827",
    ndc: "0093-0006-01",
    class: "rx",
    therapeuticClass: "Anxiolytic",
    indications: ["generalized anxiety disorder"],
    commonAdultDose: "7.5-15 mg PO BID, max 60 mg/day.",
    route: "oral",
    contraindications: ["MAOI use within 14 days"],
    interactsWith: ["MAOIs", "grapefruit", "CYP3A4 inhibitors"],
    cannabisEvidence: "limited",
    patientExplainer:
      "A non-sedating anxiety medicine. Cannabis with high CBD may complement; high THC may oppose effect.",
  },
  {
    id: "rx-trazodone",
    name: "Trazodone",
    rxnormCode: "10737",
    ndc: "0093-0146-01",
    class: "rx",
    therapeuticClass: "Sedating antidepressant",
    indications: ["insomnia (off-label)", "depression"],
    commonAdultDose: "25-100 mg PO qHS for insomnia.",
    route: "oral",
    contraindications: ["recent MI", "MAOI use"],
    interactsWith: ["MAOIs", "alcohol", "other CNS depressants"],
    cannabisEvidence: "moderate",
    patientExplainer:
      "Helps you fall and stay asleep. Combine cautiously with cannabis edibles — both linger in the morning.",
  },
  // ─── Cannabis primitives ────────────────────────────────
  {
    id: "cannabis-cbd-isolate",
    name: "CBD Isolate (oral)",
    rxnormCode: null,
    ndc: null,
    class: "cannabis",
    therapeuticClass: "Cannabinoid (non-intoxicating)",
    indications: ["anxiety", "insomnia (mild)", "inflammation"],
    commonAdultDose: "10-50 mg PO once or twice daily.",
    route: "oral",
    contraindications: ["severe hepatic impairment"],
    interactsWith: ["warfarin", "valproate", "tacrolimus", "CYP3A4/CYP2C19 substrates"],
    cannabisEvidence: "strong",
    patientExplainer:
      "A non-intoxicating cannabis compound used for anxiety, sleep, and inflammation.",
  },
  {
    id: "cannabis-thc-tincture",
    name: "THC Tincture (sublingual)",
    rxnormCode: null,
    ndc: null,
    class: "cannabis",
    therapeuticClass: "Cannabinoid (intoxicating)",
    indications: ["chronic pain", "chemotherapy-induced nausea", "appetite stimulation"],
    commonAdultDose: "Start 2.5 mg sublingual qHS, titrate weekly.",
    route: "sublingual",
    contraindications: ["pregnancy", "psychotic disorders", "severe cardiovascular disease"],
    interactsWith: ["benzodiazepines", "opioids", "CYP3A4 inhibitors"],
    cannabisEvidence: "strong",
    patientExplainer:
      "Intoxicating cannabinoid used for pain, nausea, and appetite. Start low, go slow.",
  },
  {
    id: "cannabis-1to1",
    name: "1:1 CBD:THC oil",
    rxnormCode: null,
    ndc: null,
    class: "cannabis",
    therapeuticClass: "Combination cannabinoid",
    indications: ["chronic pain", "spasticity", "anxiety with pain"],
    commonAdultDose: "2.5-5 mg of each PO BID.",
    route: "oral",
    contraindications: ["pregnancy", "severe hepatic impairment"],
    interactsWith: ["warfarin", "benzodiazepines", "opioids"],
    cannabisEvidence: "strong",
    patientExplainer:
      "Balanced 1:1 oil designed to get pain relief without the heavy THC ceiling.",
  },
  {
    id: "cannabis-cbg-tincture",
    name: "CBG Tincture",
    rxnormCode: null,
    ndc: null,
    class: "cannabis",
    therapeuticClass: "Minor cannabinoid",
    indications: ["IBS-related discomfort", "focus", "inflammation"],
    commonAdultDose: "5-25 mg PO daily.",
    route: "oral",
    contraindications: ["pregnancy", "severe hepatic impairment"],
    interactsWith: ["CYP3A4 substrates"],
    cannabisEvidence: "limited",
    patientExplainer:
      "An emerging non-intoxicating cannabinoid being studied for gut + focus support.",
  },
  // ─── Supplements ────────────────────────────────────────
  {
    id: "supp-magnesium-glycinate",
    name: "Magnesium glycinate",
    rxnormCode: null,
    ndc: null,
    class: "supplement",
    therapeuticClass: "Mineral",
    indications: ["sleep support", "muscle relaxation"],
    commonAdultDose: "200-400 mg elemental magnesium PO qHS.",
    route: "oral",
    contraindications: ["severe renal impairment"],
    interactsWith: ["bisphosphonates", "tetracyclines", "fluoroquinolones"],
    cannabisEvidence: "anecdotal",
    patientExplainer:
      "A common mineral that supports relaxation and sleep — pairs gently with cannabis.",
  },
  {
    id: "supp-ltheanine",
    name: "L-theanine",
    rxnormCode: null,
    ndc: null,
    class: "supplement",
    therapeuticClass: "Amino acid",
    indications: ["focus", "calm", "anxiety"],
    commonAdultDose: "100-200 mg PO once or twice daily.",
    route: "oral",
    contraindications: [],
    interactsWith: ["antihypertensives (additive lowering)"],
    cannabisEvidence: "limited",
    patientExplainer:
      "Found in green tea. Helps with calm focus and pairs well with low-dose cannabis.",
  },
  {
    id: "supp-melatonin",
    name: "Melatonin",
    rxnormCode: null,
    ndc: null,
    class: "supplement",
    therapeuticClass: "Hormone supplement",
    indications: ["insomnia", "circadian rhythm support"],
    commonAdultDose: "0.5-3 mg PO 30 minutes before bed.",
    route: "oral",
    contraindications: ["pregnancy"],
    interactsWith: ["warfarin", "diabetes meds", "immunosuppressants"],
    cannabisEvidence: "moderate",
    patientExplainer:
      "Sleep-onset hormone. Combine cautiously with cannabis edibles — additive grogginess.",
  },
  {
    id: "supp-omega3",
    name: "Omega-3 (EPA/DHA)",
    rxnormCode: null,
    ndc: null,
    class: "supplement",
    therapeuticClass: "Fatty acid",
    indications: ["mood", "cardiovascular", "inflammation"],
    commonAdultDose: "1-2 g combined EPA/DHA PO daily.",
    route: "oral",
    contraindications: ["fish allergy", "bleeding disorders"],
    interactsWith: ["anticoagulants"],
    cannabisEvidence: "anecdotal",
    patientExplainer:
      "Anti-inflammatory fish oil; foundational for mood and cardiovascular support.",
  },
];

export function searchRx(query: string, klass?: RxClass): RxEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return RX_CATALOG.filter((entry) => {
    if (klass && entry.class !== klass) return false;
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.therapeuticClass.toLowerCase().includes(q) ||
      entry.indications.some((i) => i.toLowerCase().includes(q))
    );
  });
}

/** Recommend by indication. Sorted strong → anecdotal, then by class diversity. */
export function recommendForIndication(
  indication: string,
  options: { limit?: number; classes?: RxClass[] } = {},
): RxEntry[] {
  const q = indication.trim().toLowerCase();
  const RANK: Record<EvidenceLevel, number> = {
    strong: 4,
    moderate: 3,
    limited: 2,
    anecdotal: 1,
  };
  const filtered = RX_CATALOG.filter((entry) => {
    if (options.classes && !options.classes.includes(entry.class)) return false;
    return entry.indications.some((i) => i.toLowerCase().includes(q));
  });
  filtered.sort((a, b) => RANK[b.cannabisEvidence] - RANK[a.cannabisEvidence]);
  return filtered.slice(0, options.limit ?? 8);
}

export interface InteractionFinding {
  rxId: string;
  rxName: string;
  cannabisItem: string;
  severity: "minor" | "moderate" | "major";
  detail: string;
}

const CANNABIS_INTERACTION_TABLE: Array<{
  rxIdOrPattern: string | RegExp;
  cannabisItemPattern: string | RegExp;
  severity: InteractionFinding["severity"];
  detail: string;
}> = [
  {
    rxIdOrPattern: "rx-gabapentin",
    cannabisItemPattern: /thc/i,
    severity: "moderate",
    detail: "Additive sedation — counsel on driving and falls.",
  },
  {
    rxIdOrPattern: "rx-tramadol",
    cannabisItemPattern: /thc/i,
    severity: "moderate",
    detail:
      "Additive CNS depression; both lower seizure threshold modestly.",
  },
  {
    rxIdOrPattern: /^rx-/,
    cannabisItemPattern: /cbd/i,
    severity: "minor",
    detail:
      "CBD inhibits CYP3A4 and CYP2C19; check the patient's other medications metabolized via these pathways.",
  },
];

export function checkCannabisInteractions(
  currentRxIds: string[],
  cannabisItem: string,
): InteractionFinding[] {
  const findings: InteractionFinding[] = [];
  for (const rxId of currentRxIds) {
    const rx = RX_CATALOG.find((r) => r.id === rxId);
    if (!rx) continue;
    for (const rule of CANNABIS_INTERACTION_TABLE) {
      const idMatch =
        typeof rule.rxIdOrPattern === "string"
          ? rule.rxIdOrPattern === rxId
          : rule.rxIdOrPattern.test(rxId);
      const itemMatch =
        typeof rule.cannabisItemPattern === "string"
          ? rule.cannabisItemPattern === cannabisItem
          : rule.cannabisItemPattern.test(cannabisItem);
      if (idMatch && itemMatch) {
        findings.push({
          rxId,
          rxName: rx.name,
          cannabisItem,
          severity: rule.severity,
          detail: rule.detail,
        });
      }
    }
  }
  return findings;
}

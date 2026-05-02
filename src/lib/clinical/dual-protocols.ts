/**
 * EMR-092 — Dual treatment protocols (Western + Eastern)
 *
 * Some Leafjourney conditions are managed with parallel arms:
 *   - A "Western" arm — pharmacotherapy, procedural, lab-driven
 *   - An "Eastern" arm — cannabis dosing, herbal adjuncts, lifestyle,
 *     acupuncture / TCM, yoga, meditation, breathwork
 *
 * The clinician picks a protocol pair, the system tracks both arms
 * on a shared timeline, and we surface conflicts (e.g., warfarin +
 * full-spectrum CBD) as the regimens evolve.
 */

export type ProtocolArm = "western" | "eastern";

export type ProtocolStepKind =
  | "medication"
  | "procedure"
  | "lab"
  | "cannabis"
  | "herbal"
  | "lifestyle"
  | "acupuncture"
  | "movement"
  | "mindbody"
  | "diet"
  | "follow_up";

export interface ProtocolStep {
  id: string;
  arm: ProtocolArm;
  kind: ProtocolStepKind;
  label: string;
  details?: string;
  /** When the step starts relative to protocol day 0 */
  startDay: number;
  /** Duration in days; undefined = open-ended */
  durationDays?: number;
  /** Cadence for repeating steps */
  cadence?: "once" | "daily" | "weekly" | "monthly" | "as_needed";
  /** Free-text dosage for medication/cannabis/herbal */
  dosage?: string;
}

export interface DualProtocol {
  id: string;
  condition: string;
  /** ICD-10 codes this protocol is appropriate for */
  icd10: string[];
  description: string;
  westernSteps: ProtocolStep[];
  easternSteps: ProtocolStep[];
  /** Combined goals, ordered most → least important */
  goals: string[];
  /** Steps the clinician must explicitly approve before activation */
  consentGated: ProtocolStep["id"][];
}

export interface ProtocolConflict {
  westernStep: ProtocolStep;
  easternStep: ProtocolStep;
  severity: "info" | "caution" | "danger";
  explanation: string;
}

export const DUAL_PROTOCOLS: DualProtocol[] = [
  {
    id: "chronic-low-back-pain",
    condition: "Chronic low back pain",
    icd10: ["M54.5", "M54.50", "M54.51", "M54.59"],
    description:
      "Layered approach pairing conservative pharmacotherapy + PT with low-dose cannabis, acupuncture, and mind-body work. Goal is to keep opioid exposure to a minimum while restoring function.",
    westernSteps: [
      {
        id: "wbp-1",
        arm: "western",
        kind: "medication",
        label: "Acetaminophen 1g TID + topical diclofenac",
        startDay: 0,
        cadence: "daily",
        durationDays: 28,
        dosage: "APAP 1g PO TID; diclofenac 1% gel QID to lumbar region",
      },
      {
        id: "wbp-2",
        arm: "western",
        kind: "procedure",
        label: "PT — McKenzie protocol, 2x weekly x 6 weeks",
        startDay: 3,
        cadence: "weekly",
        durationDays: 42,
      },
      {
        id: "wbp-3",
        arm: "western",
        kind: "lab",
        label: "Renal panel before NSAID escalation",
        startDay: 14,
        cadence: "once",
      },
      {
        id: "wbp-4",
        arm: "western",
        kind: "follow_up",
        label: "Functional assessment (Oswestry) at week 6",
        startDay: 42,
        cadence: "once",
      },
    ],
    easternSteps: [
      {
        id: "ebp-1",
        arm: "eastern",
        kind: "cannabis",
        label: "1:1 CBD:THC tincture, low-and-slow titration",
        startDay: 0,
        cadence: "daily",
        durationDays: 90,
        dosage: "Start 2.5mg + 2.5mg HS; titrate by 2.5mg q3 days as tolerated",
      },
      {
        id: "ebp-2",
        arm: "eastern",
        kind: "acupuncture",
        label: "Acupuncture — Bladder & Du meridian focus, 1x weekly x 8 weeks",
        startDay: 0,
        cadence: "weekly",
        durationDays: 56,
      },
      {
        id: "ebp-3",
        arm: "eastern",
        kind: "movement",
        label: "Daily yoga: cat-cow, child's pose, supine twist (15 min)",
        startDay: 0,
        cadence: "daily",
      },
      {
        id: "ebp-4",
        arm: "eastern",
        kind: "mindbody",
        label: "Body scan meditation 10 min before bed",
        startDay: 0,
        cadence: "daily",
      },
    ],
    goals: [
      "Oswestry score reduction ≥ 10 points in 12 weeks",
      "Avoid scheduled opioids",
      "Return to work / preferred activity",
      "Maintain sleep ≥ 7 hours per night",
    ],
    consentGated: ["ebp-1"],
  },
  {
    id: "ptsd-night-symptoms",
    condition: "PTSD with prominent night symptoms",
    icd10: ["F43.10", "F43.12"],
    description:
      "Trauma-focused therapy + targeted pharmacology for nightmares paired with low-THC nighttime cannabis dosing, breathwork, and yoga nidra. Treat both arousal and avoidance.",
    westernSteps: [
      {
        id: "wpt-1",
        arm: "western",
        kind: "medication",
        label: "Prazosin titration for nightmare suppression",
        startDay: 0,
        cadence: "daily",
        dosage: "Start 1mg HS, titrate to effect (max 10mg) over 4 weeks",
      },
      {
        id: "wpt-2",
        arm: "western",
        kind: "procedure",
        label: "CPT or EMDR — weekly with trauma-trained therapist",
        startDay: 7,
        cadence: "weekly",
        durationDays: 84,
      },
      {
        id: "wpt-3",
        arm: "western",
        kind: "follow_up",
        label: "PCL-5 at baseline, 6 wk, 12 wk",
        startDay: 0,
        cadence: "as_needed",
      },
    ],
    easternSteps: [
      {
        id: "ept-1",
        arm: "eastern",
        kind: "cannabis",
        label: "Indica-leaning, CBN-rich tincture for sleep",
        startDay: 0,
        cadence: "daily",
        durationDays: 90,
        dosage: "2.5mg THC + 5mg CBN, 30 min before bed",
      },
      {
        id: "ept-2",
        arm: "eastern",
        kind: "mindbody",
        label: "Box breathing 4-4-4-4, 5 min before sleep",
        startDay: 0,
        cadence: "daily",
      },
      {
        id: "ept-3",
        arm: "eastern",
        kind: "movement",
        label: "Yoga nidra audio practice nightly",
        startDay: 0,
        cadence: "daily",
      },
      {
        id: "ept-4",
        arm: "eastern",
        kind: "lifestyle",
        label: "Sleep hygiene contract — no screens after 21:30",
        startDay: 0,
        cadence: "daily",
      },
    ],
    goals: [
      "PCL-5 reduction ≥ 10 points by week 12",
      "≥ 5 nights/week without nightmare awakenings",
      "Return of REM sleep on actigraphy",
      "Reduced avoidance per CPT homework",
    ],
    consentGated: ["ept-1"],
  },
  {
    id: "chemo-induced-nausea",
    condition: "Chemotherapy-induced nausea and vomiting (CINV)",
    icd10: ["R11.0", "R11.10", "T45.1X5A"],
    description:
      "5-HT3 / NK1 backbone for acute and delayed phases, with cannabis adjunct for breakthrough nausea, ginger, acupressure at PC6, and a clear-fluid diet plan.",
    westernSteps: [
      {
        id: "wcn-1",
        arm: "western",
        kind: "medication",
        label: "Ondansetron 8mg PO q8h PRN",
        startDay: 0,
        cadence: "as_needed",
        dosage: "8mg PO up to TID",
      },
      {
        id: "wcn-2",
        arm: "western",
        kind: "medication",
        label: "Aprepitant on chemo day + 2 days post",
        startDay: 0,
        cadence: "daily",
        durationDays: 3,
        dosage: "125mg day 1, 80mg days 2-3",
      },
      {
        id: "wcn-3",
        arm: "western",
        kind: "follow_up",
        label: "Hydration / electrolyte check 48h post-infusion",
        startDay: 2,
        cadence: "once",
      },
    ],
    easternSteps: [
      {
        id: "ecn-1",
        arm: "eastern",
        kind: "cannabis",
        label: "THC-dominant lozenge for breakthrough nausea",
        startDay: 0,
        cadence: "as_needed",
        dosage: "2.5–5mg THC lozenge q4h PRN, max 20mg/day",
      },
      {
        id: "ecn-2",
        arm: "eastern",
        kind: "herbal",
        label: "Ginger capsules 250mg QID",
        startDay: 0,
        cadence: "daily",
        durationDays: 5,
      },
      {
        id: "ecn-3",
        arm: "eastern",
        kind: "acupuncture",
        label: "PC6 (Neiguan) acupressure wristbands",
        startDay: 0,
        cadence: "as_needed",
      },
      {
        id: "ecn-4",
        arm: "eastern",
        kind: "diet",
        label: "BRAT-progress diet for 48h post-infusion",
        startDay: 0,
        cadence: "daily",
        durationDays: 2,
      },
    ],
    goals: [
      "No emesis episodes on chemo day or day +1",
      "PO intake ≥ 1.5L/day by day +2",
      "No ER visits for dehydration during cycle",
    ],
    consentGated: ["ecn-1"],
  },
];

const KNOWN_INTERACTIONS: Array<{
  westernPattern: RegExp;
  easternPattern: RegExp;
  severity: ProtocolConflict["severity"];
  explanation: string;
}> = [
  {
    westernPattern: /warfarin|apixaban|rivaroxaban|dabigatran|coumadin/i,
    easternPattern: /cbd|cannabis|thc/i,
    severity: "danger",
    explanation:
      "CBD/THC inhibit CYP2C9 and CYP3A4 — anticoagulant levels can rise. Tighten INR / anti-Xa monitoring, consider dose reduction.",
  },
  {
    westernPattern: /ssri|sertraline|fluoxetine|paroxetine|mao/i,
    easternPattern: /st\.?\s*john|hypericum|kratom/i,
    severity: "danger",
    explanation:
      "Risk of serotonin syndrome with St. John's wort or kratom layered on serotonergic prescription.",
  },
  {
    westernPattern: /benzodiazepine|alprazolam|lorazepam|clonazepam|diazepam/i,
    easternPattern: /thc|cannabis|kava|valerian/i,
    severity: "caution",
    explanation:
      "Additive CNS depression. Counsel on driving, falls in elderly, and stacking sedating cannabis at HS with daytime BZD use.",
  },
  {
    westernPattern: /tacrolimus|cyclosporine|sirolimus/i,
    easternPattern: /cbd|grapefruit/i,
    severity: "danger",
    explanation:
      "CBD raises tacrolimus levels via CYP3A4 inhibition. Recheck trough within 7 days of any titration.",
  },
  {
    westernPattern: /clopidogrel|plavix/i,
    easternPattern: /ginkgo|garlic|ginger high dose/i,
    severity: "caution",
    explanation:
      "Additive antiplatelet effect — assess bleeding risk, hold herbal 7 days before any planned procedure.",
  },
];

export function findInteractions(protocol: DualProtocol): ProtocolConflict[] {
  const conflicts: ProtocolConflict[] = [];
  for (const w of protocol.westernSteps) {
    for (const e of protocol.easternSteps) {
      const wText = `${w.label} ${w.dosage ?? ""} ${w.details ?? ""}`;
      const eText = `${e.label} ${e.dosage ?? ""} ${e.details ?? ""}`;
      for (const rule of KNOWN_INTERACTIONS) {
        if (rule.westernPattern.test(wText) && rule.easternPattern.test(eText)) {
          conflicts.push({
            westernStep: w,
            easternStep: e,
            severity: rule.severity,
            explanation: rule.explanation,
          });
        }
      }
    }
  }
  return conflicts;
}

export interface TimelineEntry {
  day: number;
  step: ProtocolStep;
}

export function buildTimeline(protocol: DualProtocol): TimelineEntry[] {
  return [...protocol.westernSteps, ...protocol.easternSteps]
    .map((step) => ({ day: step.startDay, step }))
    .sort((a, b) => a.day - b.day || a.step.arm.localeCompare(b.step.arm));
}

export function findProtocolForIcd10(code: string): DualProtocol | null {
  const normalized = code.trim().toUpperCase();
  return (
    DUAL_PROTOCOLS.find((p) =>
      p.icd10.some((c) => normalized === c || normalized.startsWith(c.split(".")[0]))
    ) ?? null
  );
}

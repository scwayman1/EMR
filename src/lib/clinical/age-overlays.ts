/**
 * EMR-109 — Age-based chart overlay engine.
 *
 * Centralizes "what does this patient's age tell the chart to show?" so
 * every surface (clinician chart, patient portal, scribe agent, screening
 * engine) makes the same decisions:
 *
 *   • which overlay panels mount (pediatric / adolescent / adult /
 *     geriatric / unknown),
 *   • which assessment instruments auto-attach (PHQ-9 vs ASQ-3 vs MMSE),
 *   • which warnings render (Beers list, dose-by-weight, parental consent),
 *   • which dosing modifiers apply (mg/kg in pediatrics, renal/hepatic
 *     dose-reduction in geriatrics),
 *   • which education content surfaces.
 *
 * The age-band primitive lives in `lib/utils/patient-age` — this file
 * builds the *clinical* layer on top of it.
 */

import {
  type AgeBand,
  AGE_BAND_LABELS,
  getAge,
  getAgeBand,
  isPediatric,
  isGeriatric,
} from "@/lib/utils/patient-age";

export type OverlayPanelId =
  | "growth_chart"
  | "immunization_status"
  | "guardian_consent"
  | "school_accommodations"
  | "adolescent_confidentiality"
  | "puberty_screen"
  | "adult_health_maintenance"
  | "preventive_screenings"
  | "polypharmacy_review"
  | "falls_risk"
  | "cognitive_screen"
  | "advance_directives"
  | "demographics_prompt";

export interface OverlayPanel {
  id: OverlayPanelId;
  title: string;
  /** Plain-English why this panel is showing. */
  rationale: string;
  emoji: string;
  /** Render priority — lower = higher in the column. */
  priority: number;
}

export interface AssessmentRecommendation {
  id: string;
  label: string;
  /** Validated instrument abbreviation (PHQ-9, GAD-7, ASQ-3, MMSE, etc.). */
  instrument: string;
  /** Cadence (annually, every visit, once). */
  cadence: string;
  rationale: string;
}

export interface DosingModifier {
  /** UI label rendered in the prescribing surface. */
  label: string;
  /** When this modifier fires (always for pediatric, geriatric — sometimes adult). */
  trigger: "pediatric" | "geriatric" | "infant" | "adolescent";
  /** Concrete instruction for the prescribing surface. */
  instruction: string;
}

export interface AgeOverlay {
  band: AgeBand;
  age: number | null;
  bandLabel: string;
  panels: OverlayPanel[];
  assessments: AssessmentRecommendation[];
  dosingModifiers: DosingModifier[];
  warnings: string[];
  /** Patient-portal hero copy — Apple-iOS-aesthetic short greeting. */
  patientHero: { emoji: string; headline: string; subhead: string };
}

// ---------------------------------------------------------------------------
// Panel catalogues per band
// ---------------------------------------------------------------------------

const PEDIATRIC_PANELS: OverlayPanel[] = [
  {
    id: "growth_chart",
    title: "Growth chart",
    emoji: "📈",
    priority: 10,
    rationale: "Pediatric growth velocity is a primary visit-time check.",
  },
  {
    id: "immunization_status",
    title: "Immunization status",
    emoji: "💉",
    priority: 20,
    rationale: "CDC childhood immunization series tracking.",
  },
  {
    id: "guardian_consent",
    title: "Guardian / parental consent",
    emoji: "🪪",
    priority: 30,
    rationale: "Treatment, release, and portal access decisions need a guardian on file.",
  },
  {
    id: "school_accommodations",
    title: "School accommodations (IEP / 504)",
    emoji: "🏫",
    priority: 40,
    rationale: "Surfaces any school plan documented in intake.",
  },
];

const ADOLESCENT_PANELS: OverlayPanel[] = [
  {
    id: "adolescent_confidentiality",
    title: "Confidential adolescent care",
    emoji: "🤫",
    priority: 5,
    rationale: "State minor-consent law allows certain visits without parental disclosure.",
  },
  {
    id: "puberty_screen",
    title: "Tanner / puberty",
    emoji: "🌱",
    priority: 25,
    rationale: "Tanner staging and pubertal milestones tracked through age 17.",
  },
  ...PEDIATRIC_PANELS,
];

const ADULT_PANELS: OverlayPanel[] = [
  {
    id: "adult_health_maintenance",
    title: "Health maintenance",
    emoji: "🩺",
    priority: 10,
    rationale: "USPSTF Grade A / B preventive screening tracker.",
  },
  {
    id: "preventive_screenings",
    title: "Preventive screenings",
    emoji: "📋",
    priority: 20,
    rationale: "Due / overdue screening punch-list.",
  },
];

const GERIATRIC_PANELS: OverlayPanel[] = [
  {
    id: "polypharmacy_review",
    title: "Polypharmacy review",
    emoji: "💊",
    priority: 5,
    rationale: "Beers Criteria + 5+ medication review.",
  },
  {
    id: "falls_risk",
    title: "Falls risk",
    emoji: "🪜",
    priority: 10,
    rationale: "Annual falls assessment per USPSTF + AGS.",
  },
  {
    id: "cognitive_screen",
    title: "Cognitive screening",
    emoji: "🧠",
    priority: 15,
    rationale: "Mini-Cog / MMSE annual screen per Medicare AWV.",
  },
  {
    id: "advance_directives",
    title: "Advance directives",
    emoji: "📜",
    priority: 25,
    rationale: "POLST / advance directive on file?",
  },
  ...ADULT_PANELS,
];

const UNKNOWN_PANELS: OverlayPanel[] = [
  {
    id: "demographics_prompt",
    title: "Date of birth missing",
    emoji: "❓",
    priority: 1,
    rationale:
      "Many chart features are gated on age. Capture DOB in demographics to enable them.",
  },
];

const PANELS_BY_BAND: Record<AgeBand, OverlayPanel[]> = {
  infant: PEDIATRIC_PANELS,
  child: PEDIATRIC_PANELS,
  adolescent: ADOLESCENT_PANELS,
  adult: ADULT_PANELS,
  geriatric: GERIATRIC_PANELS,
  unknown: UNKNOWN_PANELS,
};

// ---------------------------------------------------------------------------
// Assessments per band
// ---------------------------------------------------------------------------

const ASSESSMENTS_BY_BAND: Record<AgeBand, AssessmentRecommendation[]> = {
  infant: [
    {
      id: "asq3",
      label: "Ages & Stages Questionnaire",
      instrument: "ASQ-3",
      cadence: "9, 18, 30 months",
      rationale: "Developmental screen per Bright Futures / AAP.",
    },
    {
      id: "mchat",
      label: "Modified Checklist for Autism in Toddlers",
      instrument: "M-CHAT-R",
      cadence: "18 + 24 months",
      rationale: "Universal autism screening per AAP / USPSTF.",
    },
  ],
  child: [
    {
      id: "asq3",
      label: "Ages & Stages Questionnaire",
      instrument: "ASQ-3",
      cadence: "60 months",
      rationale: "Final developmental screen before kindergarten.",
    },
    {
      id: "phq9-modified",
      label: "PHQ-9 (modified for adolescents)",
      instrument: "PHQ-9-A",
      cadence: "Annually 11+",
      rationale: "Depression screen starting at age 11 per USPSTF.",
    },
  ],
  adolescent: [
    {
      id: "phq9",
      label: "PHQ-9",
      instrument: "PHQ-9-A",
      cadence: "Annually",
      rationale: "Depression screen per USPSTF Grade B.",
    },
    {
      id: "crafft",
      label: "CRAFFT substance-use screen",
      instrument: "CRAFFT 2.1+N",
      cadence: "Annually",
      rationale: "Adolescent substance-use screen per AAP.",
    },
    {
      id: "homeess",
      label: "HEEADSSS psychosocial interview",
      instrument: "HEEADSSS",
      cadence: "Annually",
      rationale: "Comprehensive adolescent psychosocial screen.",
    },
  ],
  adult: [
    {
      id: "phq9",
      label: "PHQ-9 depression screen",
      instrument: "PHQ-9",
      cadence: "Annually",
      rationale: "USPSTF Grade B depression screen for adults.",
    },
    {
      id: "gad7",
      label: "GAD-7 anxiety screen",
      instrument: "GAD-7",
      cadence: "Annually",
      rationale: "USPSTF Grade B anxiety screen (2023 update).",
    },
    {
      id: "audit-c",
      label: "AUDIT-C alcohol screen",
      instrument: "AUDIT-C",
      cadence: "Annually",
      rationale: "USPSTF Grade B unhealthy-alcohol-use screen.",
    },
  ],
  geriatric: [
    {
      id: "minicog",
      label: "Mini-Cog cognitive screen",
      instrument: "Mini-Cog",
      cadence: "Annually",
      rationale: "Recommended at Medicare AWV.",
    },
    {
      id: "falls-stay-independent",
      label: "Stay Independent falls questionnaire",
      instrument: "Stay Independent",
      cadence: "Annually",
      rationale: "STEADI program falls screen.",
    },
    {
      id: "phq9",
      label: "PHQ-9",
      instrument: "PHQ-9",
      cadence: "Annually",
      rationale: "Late-life depression — under-recognized.",
    },
    {
      id: "advance-directive",
      label: "Advance-directive review",
      instrument: "POLST / 5-Wishes",
      cadence: "At enrollment + yearly review",
      rationale: "Goals-of-care conversation.",
    },
  ],
  unknown: [],
};

// ---------------------------------------------------------------------------
// Dosing modifiers + warnings per band
// ---------------------------------------------------------------------------

const DOSING_MODIFIERS_BY_BAND: Record<AgeBand, DosingModifier[]> = {
  infant: [
    {
      label: "Weight-based dosing required",
      trigger: "infant",
      instruction:
        "All medications must be calculated in mg/kg. Use the weight-based prescribing surface; flat doses are blocked.",
    },
    {
      label: "No cannabis prescribing",
      trigger: "infant",
      instruction:
        "Cannabis is contraindicated in infants except under specialist oversight (e.g., Dravet/Epidiolex).",
    },
  ],
  child: [
    {
      label: "Weight-based dosing required",
      trigger: "pediatric",
      instruction: "Calculate in mg/kg with a documented weight from the current visit.",
    },
    {
      label: "Cannabis specialist-only",
      trigger: "pediatric",
      instruction:
        "Cannabis prescribing requires pediatric specialist sign-off; surface alternative therapies first.",
    },
  ],
  adolescent: [
    {
      label: "Cannabis: brain-development warning",
      trigger: "adolescent",
      instruction:
        "Document discussion of THC neurodevelopmental risk under age 25; prefer CBD-dominant formulations when possible.",
    },
  ],
  adult: [],
  geriatric: [
    {
      label: "Beers Criteria check",
      trigger: "geriatric",
      instruction:
        "Run the prescription against the AGS Beers Criteria; flag potentially-inappropriate medications inline.",
    },
    {
      label: "Start low, go slow",
      trigger: "geriatric",
      instruction:
        "Initiate cannabis at 25–50 % of the adult starting dose. Reassess at 2-week intervals.",
    },
    {
      label: "Renal / hepatic adjustment",
      trigger: "geriatric",
      instruction:
        "Verify CrCl + LFTs are within 90 days; auto-adjust renal/hepatic-cleared agents.",
    },
  ],
  unknown: [],
};

const WARNINGS_BY_BAND: Record<AgeBand, string[]> = {
  infant: [
    "All prescribing requires guardian consent recorded on the chart.",
    "Cannabis contraindicated except under pediatric epilepsy specialist supervision.",
  ],
  child: [
    "Guardian consent on file is a hard precondition for treatment plans.",
    "Confirm current weight before any prescription is sent.",
  ],
  adolescent: [
    "Confidential-care state law applies — review portal-share defaults before disclosing to parents.",
    "Document THC neurodevelopmental risk discussion before any cannabis prescription.",
  ],
  adult: [],
  geriatric: [
    "Polypharmacy: with 5+ active medications, run a Beers / drug-drug interaction sweep.",
    "Verify advance directive status at every visit.",
  ],
  unknown: [
    "Date of birth missing — many chart features are disabled until demographics are completed.",
  ],
};

// ---------------------------------------------------------------------------
// Hero copy per band
// ---------------------------------------------------------------------------

function patientHero(band: AgeBand): AgeOverlay["patientHero"] {
  switch (band) {
    case "infant":
      return {
        emoji: "🍼",
        headline: "Tiny human, big team",
        subhead:
          "We're tracking your growth, vaccines, and milestones — bring questions any time.",
      };
    case "child":
      return {
        emoji: "🧒",
        headline: "Growing strong",
        subhead:
          "Wellness checks and vaccines keep you on track. School plans show up here too.",
      };
    case "adolescent":
      return {
        emoji: "🌟",
        headline: "Your space",
        subhead:
          "Some visits are private from your parents — we'll always tell you what's confidential and what isn't.",
      };
    case "adult":
      return {
        emoji: "🩺",
        headline: "Stay ahead of it",
        subhead:
          "Your preventive screening checklist is below — knock 'em out and earn your stars.",
      };
    case "geriatric":
      return {
        emoji: "🌳",
        headline: "Wisdom + wellness",
        subhead:
          "We watch your medication list, balance, and brain — and your goals lead the plan.",
      };
    case "unknown":
      return {
        emoji: "👋",
        headline: "Welcome",
        subhead: "Add your date of birth so we can personalize your dashboard.",
      };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildAgeOverlay(
  dob: Date | string | null | undefined,
): AgeOverlay {
  const age = getAge(dob);
  const band = getAgeBand(dob);

  const panels = [...PANELS_BY_BAND[band]].sort(
    (a, b) => a.priority - b.priority,
  );

  return {
    band,
    age,
    bandLabel: AGE_BAND_LABELS[band],
    panels,
    assessments: ASSESSMENTS_BY_BAND[band],
    dosingModifiers: DOSING_MODIFIERS_BY_BAND[band],
    warnings: WARNINGS_BY_BAND[band],
    patientHero: patientHero(band),
  };
}

// Pass-throughs for surfaces that already imported from `patient-age`.
export { isPediatric, isGeriatric };
export type { AgeBand };

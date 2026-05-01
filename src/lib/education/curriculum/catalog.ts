// ---------------------------------------------------------------------------
// EMR-312 — Curriculum catalog (seed)
// ---------------------------------------------------------------------------
// Hand-curated to clear the ≥42 CME-hour bar across six tracks. Module
// content is summarized here; full lesson scripts/recordings live in
// /data/curriculum/* and are not yet vendored. The shape below is what
// the player and CME tracker render against.
//
// If you change a duration here, run `pnpm vitest run curriculum` —
// the test in `cme.test.ts` will fail if total hours drop below 42.
// ---------------------------------------------------------------------------

import type { CurriculumModule } from "./types";

export const CURRICULUM_MODULES: CurriculumModule[] = [
  // --------------------------------------------------------------- track 1 --
  {
    id: "foundations.endocannabinoid-system",
    track: "foundations",
    title: "The endocannabinoid system, end to end",
    summary:
      "CB1/CB2 receptor distribution, endogenous ligands (anandamide, 2-AG), enzymatic regulation (FAAH, MAGL), and the entourage hypothesis.",
    cmeCategories: ["AMA-PRA-1", "AAFP"],
    lessons: [
      {
        id: "foundations.ecs.intro",
        moduleId: "foundations.endocannabinoid-system",
        title: "Why the ECS matters in routine medicine",
        summary: "Receptor distribution map and clinical takeaways.",
        level: "foundational",
        medium: "video",
        durationMinutes: 50,
      },
      {
        id: "foundations.ecs.signaling",
        moduleId: "foundations.endocannabinoid-system",
        title: "Retrograde signaling and tone",
        summary: "How endocannabinoid tone modulates pain, mood, and inflammation.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "foundations.ecs.case-studies",
        moduleId: "foundations.endocannabinoid-system",
        title: "ECS dysregulation — three case studies",
        summary: "Migraine, IBS, fibromyalgia and the clinical endocannabinoid deficiency hypothesis.",
        level: "applied",
        medium: "case-study",
        durationMinutes: 75,
      },
      {
        id: "foundations.ecs.terpenes",
        moduleId: "foundations.endocannabinoid-system",
        title: "Terpenes and the entourage effect",
        summary: "Myrcene, limonene, pinene, linalool, caryophyllene — what the evidence actually supports.",
        level: "applied",
        medium: "video",
        durationMinutes: 60,
      },
      {
        id: "foundations.ecs.gut-brain",
        moduleId: "foundations.endocannabinoid-system",
        title: "ECS in the gut-brain axis",
        summary: "Why GI presentations respond to cannabinoids and what this means for IBD / IBS workups.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "foundations.ecs.assess",
        moduleId: "foundations.endocannabinoid-system",
        title: "Knowledge check — ECS",
        summary: "10-question MCQ.",
        level: "foundational",
        medium: "assessment",
        durationMinutes: 20,
        assessment: [
          {
            id: "ecs.q1",
            prompt: "Which receptor is most densely expressed in the CNS?",
            options: [
              { id: "a", label: "CB1", correct: true },
              { id: "b", label: "CB2" },
              { id: "c", label: "TRPV1" },
              { id: "d", label: "GPR55" },
            ],
            rationale:
              "CB1 dominates CNS expression. CB2 is enriched in immune tissue.",
          },
        ],
      },
    ],
  },
  {
    id: "foundations.cannabinoid-chemistry",
    track: "foundations",
    title: "Cannabinoid chemistry and product forms",
    summary:
      "THC, CBD, CBG, CBN, CBC, THCV; isolates vs. full/broad spectrum; flower, oil, edible, vape, topical, suppository — what the form does to onset, duration, and bioavailability.",
    cmeCategories: ["AMA-PRA-1"],
    lessons: [
      {
        id: "foundations.chem.cannabinoids",
        moduleId: "foundations.cannabinoid-chemistry",
        title: "Major and minor cannabinoids",
        summary: "Profiles, agonism, partial agonism, neutral antagonism.",
        level: "foundational",
        medium: "reading",
        durationMinutes: 70,
      },
      {
        id: "foundations.chem.forms",
        moduleId: "foundations.cannabinoid-chemistry",
        title: "Form factors and pharmacokinetics",
        summary: "Why an edible's onset differs from a vape's by an hour.",
        level: "applied",
        medium: "video",
        durationMinutes: 60,
      },
      {
        id: "foundations.chem.bioavailability",
        moduleId: "foundations.cannabinoid-chemistry",
        title: "Bioavailability and first-pass metabolism",
        summary: "11-OH-THC, why edibles hit harder, and how to dose around it.",
        level: "advanced",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "foundations.chem.coa",
        moduleId: "foundations.cannabinoid-chemistry",
        title: "Reading a Certificate of Analysis",
        summary: "Cannabinoid profile, terpene profile, residual solvents, pesticides — what to flag.",
        level: "applied",
        medium: "interactive-simulation",
        durationMinutes: 50,
      },
    ],
  },

  // --------------------------------------------------------------- track 2 --
  {
    id: "pharmacology.titration",
    track: "pharmacology",
    title: "Titration, ratios, and chemovars",
    summary:
      "Start-low/go-slow protocols, common THC:CBD ratios, when chemovar selection matters more than dose.",
    cmeCategories: ["AMA-PRA-1", "AAFP", "PA"],
    lessons: [
      {
        id: "pharm.titration.protocol",
        moduleId: "pharmacology.titration",
        title: "A titration protocol you can hand a patient",
        summary: "Day-by-day pattern that converges on the minimum effective dose.",
        level: "applied",
        medium: "case-study",
        durationMinutes: 90,
      },
      {
        id: "pharm.titration.ratios",
        moduleId: "pharmacology.titration",
        title: "Choosing a ratio",
        summary: "Pain, sleep, anxiety, GI — which ratios fit which presentations.",
        level: "applied",
        medium: "reading",
        durationMinutes: 70,
      },
      {
        id: "pharm.titration.chemovars",
        moduleId: "pharmacology.titration",
        title: "Chemovar selection in practice",
        summary: "When chemovar matters more than ratio. Type I/II/III taxonomy.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 75,
      },
      {
        id: "pharm.titration.lab",
        moduleId: "pharmacology.titration",
        title: "Hands-on titration simulation",
        summary: "Adjust the regimen for three synthetic patients across 30 days.",
        level: "advanced",
        medium: "interactive-simulation",
        durationMinutes: 60,
      },
    ],
  },
  {
    id: "pharmacology.interactions",
    track: "pharmacology",
    title: "Drug interactions you must screen for",
    summary:
      "CYP3A4/CYP2C9 inhibition by CBD; warfarin, tacrolimus, clobazam, statins, and the long tail of less-known interactions.",
    cmeCategories: ["AMA-PRA-1", "ANCC-RN"],
    lessons: [
      {
        id: "pharm.interactions.cyp",
        moduleId: "pharmacology.interactions",
        title: "CYP-mediated cannabinoid interactions",
        summary: "Mechanism, magnitude, and which co-prescriptions need monitoring.",
        level: "advanced",
        medium: "video",
        durationMinutes: 75,
      },
      {
        id: "pharm.interactions.cases",
        moduleId: "pharmacology.interactions",
        title: "Three case studies, three near-misses",
        summary: "Warfarin INR drift, tacrolimus levels, clobazam sedation.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 60,
      },
      {
        id: "pharm.interactions.screening",
        moduleId: "pharmacology.interactions",
        title: "Building an interaction screening workflow",
        summary: "Routine chart-time checks that catch the long tail.",
        level: "applied",
        medium: "video",
        durationMinutes: 60,
      },
      {
        id: "pharm.interactions.immunosuppressants",
        moduleId: "pharmacology.interactions",
        title: "Cannabinoids in transplant and oncology immunosuppression",
        summary: "Tacrolimus, sirolimus, and chemotherapy regimens — the high-stakes interaction landscape.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 70,
      },
    ],
  },

  // --------------------------------------------------------------- track 3 --
  {
    id: "clinical-application.chronic-pain",
    track: "clinical-application",
    title: "Chronic pain — when cannabis fits the picture",
    summary:
      "Neuropathic vs. nociceptive distinctions, opioid-sparing strategies, what the IASM and IASP guidelines actually say.",
    cmeCategories: ["AMA-PRA-1", "AAFP", "PA"],
    lessons: [
      {
        id: "clin.pain.evidence",
        moduleId: "clinical-application.chronic-pain",
        title: "Evidence summary — pain",
        summary: "What's well-evidenced vs. what's marketing.",
        level: "applied",
        medium: "reading",
        durationMinutes: 75,
      },
      {
        id: "clin.pain.opioid-tapering",
        moduleId: "clinical-application.chronic-pain",
        title: "Cannabis-supported opioid tapering",
        summary: "Real-world protocols, success metrics, and pitfalls.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 90,
      },
      {
        id: "clin.pain.neuropathic",
        moduleId: "clinical-application.chronic-pain",
        title: "Neuropathic pain — what works, what doesn't",
        summary: "Diabetic neuropathy, post-herpetic, MS-related, chemotherapy-induced.",
        level: "advanced",
        medium: "video",
        durationMinutes: 75,
      },
      {
        id: "clin.pain.fibromyalgia",
        moduleId: "clinical-application.chronic-pain",
        title: "Fibromyalgia and central sensitization",
        summary: "Where cannabinoids fit alongside SNRIs, gabapentinoids, and graded exercise.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 60,
      },
    ],
  },
  {
    id: "clinical-application.psychiatric",
    track: "clinical-application",
    title: "Psychiatric indications and contraindications",
    summary:
      "PTSD evidence, anxiety paradoxes (acute relief vs. chronic worsening), and the schizophrenia-spectrum hard stop.",
    cmeCategories: ["AMA-PRA-1", "ANCC-RN"],
    lessons: [
      {
        id: "clin.psych.ptsd",
        moduleId: "clinical-application.psychiatric",
        title: "PTSD — evidence and protocol",
        summary: "Cannabis as adjunct, not first-line; nightmare reduction signals.",
        level: "applied",
        medium: "video",
        durationMinutes: 80,
      },
      {
        id: "clin.psych.contraindications",
        moduleId: "clinical-application.psychiatric",
        title: "Hard stops",
        summary: "Schizophrenia spectrum, severe anxiety phenotypes, family history.",
        level: "applied",
        medium: "reading",
        durationMinutes: 50,
      },
      {
        id: "clin.psych.sleep",
        moduleId: "clinical-application.psychiatric",
        title: "Sleep, anxiety, and the chronic-use trap",
        summary: "Why CBN dosing fails most people, the tolerance curve, and how to stage withdrawal.",
        level: "applied",
        medium: "case-study",
        durationMinutes: 65,
      },
    ],
  },

  // --------------------------------------------------------------- track 4 --
  {
    id: "special-populations.geriatric-pediatric",
    track: "special-populations",
    title: "Geriatric and pediatric considerations",
    summary:
      "Polypharmacy and frailty in older adults; severe pediatric epilepsy and the Epidiolex pathway.",
    cmeCategories: ["AMA-PRA-1", "AAFP", "PA"],
    lessons: [
      {
        id: "spop.geriatric",
        moduleId: "special-populations.geriatric-pediatric",
        title: "Geriatric polypharmacy and falls risk",
        summary: "Sedation, orthostasis, and how to taper concurrent benzos.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 70,
      },
      {
        id: "spop.pediatric",
        moduleId: "special-populations.geriatric-pediatric",
        title: "Pediatric severe epilepsy and Epidiolex",
        summary: "When CBD is the right call and how to set family expectations.",
        level: "advanced",
        medium: "video",
        durationMinutes: 70,
      },
      {
        id: "spop.geri.dementia",
        moduleId: "special-populations.geriatric-pediatric",
        title: "Cannabis in dementia care",
        summary: "Behavioral symptoms, agitation, sundowning — evidence and ethics.",
        level: "advanced",
        medium: "case-study",
        durationMinutes: 60,
      },
    ],
  },
  {
    id: "special-populations.pregnancy-lactation",
    track: "special-populations",
    title: "Pregnancy, lactation, and fertility",
    summary:
      "ACOG/AAP positions, what crosses the placenta, what enters breast milk, and how to counsel a patient who is using.",
    cmeCategories: ["AMA-PRA-1", "ANCC-RN"],
    lessons: [
      {
        id: "spop.preg.evidence",
        moduleId: "special-populations.pregnancy-lactation",
        title: "Evidence and society guidance",
        summary: "Where the data is solid, where it's thin.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "spop.preg.counseling",
        moduleId: "special-populations.pregnancy-lactation",
        title: "Counseling without shaming",
        summary: "Scripts that meet patients where they are and reduce harm.",
        level: "applied",
        medium: "case-study",
        durationMinutes: 60,
      },
      {
        id: "spop.preg.fertility",
        moduleId: "special-populations.pregnancy-lactation",
        title: "Fertility, conception, and partner use",
        summary: "Evidence on sperm count, ovulation, and how to counsel both partners.",
        level: "applied",
        medium: "video",
        durationMinutes: 55,
      },
    ],
  },

  // --------------------------------------------------------------- track 5 --
  {
    id: "regulatory.federal-state",
    track: "regulatory",
    title: "Federal vs. state — the regulatory map",
    summary:
      "Schedule I posture, the 2018 Farm Bill, state cannabis programs, telehealth nuances, and what a clinician can and can't do across state lines.",
    cmeCategories: ["AMA-PRA-1"],
    lessons: [
      {
        id: "reg.fed-state",
        moduleId: "regulatory.federal-state",
        title: "The federal-state collision and how to practice safely",
        summary: "Practical do's and don'ts.",
        level: "foundational",
        medium: "video",
        durationMinutes: 60,
      },
      {
        id: "reg.documentation",
        moduleId: "regulatory.federal-state",
        title: "Documentation that holds up",
        summary: "What an audit-ready cannabis chart looks like.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "reg.telehealth",
        moduleId: "regulatory.federal-state",
        title: "Telehealth across state lines",
        summary: "Physical-presence rules, state-of-license, and what compacts (IMLC, Nurse Licensure Compact) actually let you do.",
        level: "applied",
        medium: "video",
        durationMinutes: 60,
      },
      {
        id: "reg.dea",
        moduleId: "regulatory.federal-state",
        title: "DEA, the Farm Bill, and the federal third rail",
        summary: "Schedule I, hemp-derived cannabinoid markets, and how clinicians stay clear of federal exposure.",
        level: "applied",
        medium: "reading",
        durationMinutes: 65,
      },
    ],
  },

  // --------------------------------------------------------------- track 6 --
  {
    id: "research-methods.cohort",
    track: "research-methods",
    title: "Real-world evidence and cohort design",
    summary:
      "Why per-product outcome logging changes the cannabis evidence base, and how to use Leafjourney's research export tooling.",
    cmeCategories: ["AMA-PRA-1"],
    lessons: [
      {
        id: "rm.cohort.intro",
        moduleId: "research-methods.cohort",
        title: "Real-world evidence in cannabis medicine",
        summary: "Why traditional RCTs are scarce and what fills the gap.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "rm.cohort.export",
        moduleId: "research-methods.cohort",
        title: "Building a cohort from your own panel",
        summary: "Hands-on: filter, de-identify, export.",
        level: "advanced",
        medium: "interactive-simulation",
        durationMinutes: 60,
      },
      {
        id: "rm.outcomes-design",
        moduleId: "research-methods.cohort",
        title: "Designing patient-reported outcomes that actually move",
        summary: "Why pain VAS alone isn't enough; sleep, function, mood, and cannabis-specific scales.",
        level: "applied",
        medium: "reading",
        durationMinutes: 60,
      },
      {
        id: "rm.publishing",
        moduleId: "research-methods.cohort",
        title: "From clinic-level data to publishable case series",
        summary: "Statistical considerations, IRB pathways, and reporting standards for cannabis research.",
        level: "advanced",
        medium: "video",
        durationMinutes: 65,
      },
      {
        id: "rm.capstone",
        moduleId: "research-methods.cohort",
        title: "Capstone — design a real-world evidence study from your own panel",
        summary: "End-to-end exercise: pick the question, pick the cohort, pick the outcomes, defend the design.",
        level: "advanced",
        medium: "interactive-simulation",
        durationMinutes: 90,
      },
    ],
  },
];

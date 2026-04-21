// Shared clinical-safety red-flag library.
// Every clinical agent (Nora, scribe, pre-visit, prescription safety, etc.)
// should pull from this one file so adding a new cannabis-specific red flag
// or a new language hits every agent at once.
//
// Philosophy: deterministic keyword matching is fast, auditable, and cannot
// be gaslit by a hallucinating model. We layer it UNDER the LLM triage so
// the LLM can add nuance, but it cannot remove a hard-coded emergency flag.

export type RedFlagTier = "emergency" | "high" | "cannabis_specific";

export interface RedFlagHit {
  tier: RedFlagTier;
  /** Human-readable label for the clinician-facing flag badge. */
  label: string;
  /** The keyword that matched (for attribution + test reproducibility). */
  keyword: string;
  /** Short rationale — why this is a red flag. Rendered in the Clinical Insights panel. */
  rationale: string;
}

// ---------------------------------------------------------------------------
// Emergency — call 911, go to ER. Not a "schedule a visit" situation.
// English + Spanish because both are US clinical-practice necessities.
// ---------------------------------------------------------------------------

interface KeywordSpec {
  keywords: string[];
  label: string;
  rationale: string;
}

const EMERGENCY_SPECS: KeywordSpec[] = [
  {
    keywords: [
      "chest pain",
      "crushing chest",
      "tight chest",
      "pressure in my chest",
      "dolor de pecho",
      "dolor en el pecho",
      "presión en el pecho",
    ],
    label: "Chest pain",
    rationale: "Possible ACS / PE / aortic event. Time-critical.",
  },
  {
    keywords: [
      "can't breathe",
      "cant breathe",
      "trouble breathing",
      "difficulty breathing",
      "short of breath",
      "shortness of breath",
      "no puedo respirar",
      "me falta el aire",
      "dificultad para respirar",
    ],
    label: "Respiratory distress",
    rationale: "Possible PE / anaphylaxis / asthma crisis / pneumothorax.",
  },
  {
    keywords: [
      "suicidal",
      "suicide",
      "kill myself",
      "end it all",
      "end my life",
      "hurt myself",
      "hurting myself",
      "self-harm",
      "not want to live",
      "quiero morir",
      "me quiero matar",
      "me quiero hacer daño",
    ],
    label: "Suicidal ideation / self-harm",
    rationale: "Columbia Suicide Severity screen required. Warm handoff to crisis support (988).",
  },
  {
    keywords: [
      "anaphylax",
      "severe allergic",
      "throat closing",
      "tongue swelling",
      "reacción alérgica grave",
      "se me cierra la garganta",
    ],
    label: "Anaphylaxis",
    rationale: "Epinephrine-eligible event. ER now.",
  },
  {
    keywords: [
      "stroke",
      "numbness one side",
      "numbness on one side",
      "slurred speech",
      "face drooping",
      "worst headache",
      "derrame cerebral",
      "me arrastra la lengua",
      "no siento un lado",
    ],
    label: "Stroke symptoms (FAST)",
    rationale: "Time-window matters. Use FAST (Face/Arms/Speech/Time) screen.",
  },
  {
    keywords: [
      "overdose",
      "poisoning",
      "took too much",
      "ingested",
      "se tomó",
      "tomó demasiado",
      "sobredosis",
    ],
    label: "Overdose / poisoning",
    rationale: "Poison control: 1-800-222-1222. If unconscious or altered → 911.",
  },
  {
    keywords: [
      "fainted",
      "passed out",
      "lost consciousness",
      "se desmayó",
      "me desmayé",
      "perdí el conocimiento",
    ],
    label: "Syncope",
    rationale: "Rule out cardiac / arrhythmia / bleed. ER.",
  },
  {
    keywords: [
      "severe bleeding",
      "can't stop bleeding",
      "bleeding won't stop",
      "coughing up blood",
      "vomiting blood",
      "sangrado grave",
      "no puedo parar el sangrado",
      "vomito sangre",
      "tos con sangre",
    ],
    label: "Uncontrolled hemorrhage",
    rationale: "Direct pressure + 911. GI bleed ER-eligible.",
  },
  {
    keywords: [
      "seizure",
      "seizing",
      "convulsion",
      "convulsionando",
      "ataque epiléptico",
    ],
    label: "Seizure",
    rationale: "First-time seizure = ER. Breakthrough seizure = urgent evaluation.",
  },
  {
    keywords: [
      "can't wake",
      "cant wake",
      "won't wake up",
      "unresponsive",
      "no despierta",
      "no responde",
    ],
    label: "Altered level of consciousness",
    rationale: "Immediate 911. Do not attempt oral meds.",
  },
];

// ---------------------------------------------------------------------------
// Cannabis-specific red flags — the things a cannabis-focused practice MUST
// recognize that a generic nurse-triage agent would miss.
// ---------------------------------------------------------------------------

const CANNABIS_SPECIFIC_SPECS: KeywordSpec[] = [
  {
    keywords: [
      "cyclic vomiting",
      "can't stop vomiting",
      "hot shower helps",
      "hot bath helps",
      "compulsive bathing",
      "compulsive showering",
      "chs",
      "hyperemesis",
      "vómito cíclico",
      "ducha caliente me ayuda",
    ],
    label: "Possible cannabis hyperemesis syndrome (CHS)",
    rationale:
      "Pattern: chronic heavy cannabis use + cyclic vomiting + symptomatic relief from hot bathing. " +
      "Treatment is cannabis cessation. Confirm and counsel — do NOT reassure as normal GI upset.",
  },
  {
    keywords: [
      "hearing voices",
      "seeing things",
      "paranoid",
      "paranoia",
      "they're watching me",
      "theyre watching me",
      "voices telling",
      "escucho voces",
      "veo cosas que no están",
      "me persiguen",
    ],
    label: "Cannabis-induced psychosis risk",
    rationale:
      "Acute psychotic symptoms after high-potency THC exposure — especially in patients with a family history " +
      "of schizophrenia / bipolar I — require urgent psychiatric evaluation. Taper or stop THC; consider inpatient if severe.",
  },
  {
    keywords: [
      "child ate",
      "kid ate",
      "toddler ate",
      "child got into",
      "baby ate",
      "mi hijo comió",
      "la niña se comió",
      "el niño se comió",
    ],
    label: "Pediatric cannabis ingestion",
    rationale:
      "Any pediatric THC ingestion — edibles, tincture, flower — is a poison-control event. Call 1-800-222-1222 AND ER. " +
      "Dose-dependent CNS depression and respiratory depression risk in kids <6.",
  },
  {
    keywords: [
      "can't stop using",
      "cant stop using",
      "using more and more",
      "cannabis taking over",
      "craving constantly",
      "no puedo parar",
      "cada vez uso más",
    ],
    label: "Cannabis use disorder (CUD) warning",
    rationale:
      "Loss of control is a DSM-5 CUD criterion. Run CUDIT-R. Consider taper, behavioral support, or cannabis-counseling referral.",
  },
  {
    keywords: [
      "pregnant",
      "embarazada",
      "pregnancy",
      "breastfeeding",
      "lactating",
      "amamantando",
    ],
    label: "Pregnancy / lactation + cannabis",
    rationale:
      "Cannabis crosses the placenta and enters breast milk. Counsel on ACOG guidance to avoid during pregnancy and lactation. " +
      "Do NOT continue THC-containing regimens without physician re-evaluation and documented risk/benefit.",
  },
  {
    keywords: [
      "heart racing",
      "palpitations",
      "racing heart",
      "corazón acelerado",
      "palpitaciones",
    ],
    label: "Tachycardia after cannabis use",
    rationale:
      "THC tachycardia is common but symptomatic palpitations + chest pressure OR h/o cardiac disease changes the calculus. " +
      "Rule out ischemia; consider dose reduction or CBD-only formulation.",
  },
];

// ---------------------------------------------------------------------------
// High-urgency (same-day visit, not ER) — kept separate so Nora / triage can
// distinguish "get them in today" from "call 911 now."
// ---------------------------------------------------------------------------

const HIGH_URGENCY_SPECS: KeywordSpec[] = [
  {
    keywords: [
      "much worse",
      "getting worse",
      "worsening",
      "worst it's been",
      "peor",
      "mucho peor",
      "empeorando",
    ],
    label: "Worsening symptoms",
    rationale: "Trend escalation — get them same-day or urgent visit.",
  },
  {
    keywords: [
      "rash spreading",
      "new rash",
      "hives all over",
      "sarpullido",
      "ronchas",
      "erupción",
    ],
    label: "Rash / possible allergic reaction",
    rationale: "Rule out drug allergy / immunologic response; check med changes.",
  },
  {
    keywords: [
      "fever",
      "running a fever",
      "101",
      "102",
      "103",
      "fiebre",
      "tengo fiebre",
    ],
    label: "Fever",
    rationale: "Source eval; rule out infection. Especially important post-op or on immunosuppressants.",
  },
  {
    keywords: [
      "vomiting",
      "can't keep anything down",
      "vomitando",
      "no puedo retener nada",
    ],
    label: "Protracted vomiting",
    rationale: "Dehydration + electrolyte risk; consider CHS (see cannabis-specific).",
  },
  {
    keywords: [
      "confused",
      "disoriented",
      "can't think straight",
      "confundido",
      "desorientado",
    ],
    label: "Altered mentation",
    rationale: "Polypharmacy check; rule out hypoglycemia, stroke, metabolic.",
  },
  {
    keywords: [
      "severe pain",
      "10 out of 10",
      "worst pain",
      "dolor severo",
      "peor dolor",
      "dolor insoportable",
    ],
    label: "Severe pain",
    rationale: "Quantify: new vs. chronic, location, onset. Rule out new acute cause.",
  },
];

// ---------------------------------------------------------------------------
// Scan API
// ---------------------------------------------------------------------------

function scanSpecs(lowered: string, specs: KeywordSpec[], tier: RedFlagTier): RedFlagHit[] {
  const hits: RedFlagHit[] = [];
  for (const spec of specs) {
    for (const kw of spec.keywords) {
      if (lowered.includes(kw)) {
        hits.push({ tier, label: spec.label, keyword: kw, rationale: spec.rationale });
        break; // one hit per spec is enough
      }
    }
  }
  return hits;
}

export interface SafetyScanResult {
  hits: RedFlagHit[];
  /** The highest tier matched — drives force-urgency in triaging agents. */
  topTier: RedFlagTier | null;
  /** UI-ready strings for the safetyFlags array on message threads. */
  flags: string[];
}

export function scanForSafetyFlags(text: string): SafetyScanResult {
  if (!text) return { hits: [], topTier: null, flags: [] };
  const lowered = text.toLowerCase();

  const emergencyHits = scanSpecs(lowered, EMERGENCY_SPECS, "emergency");
  const cannabisHits = scanSpecs(lowered, CANNABIS_SPECIFIC_SPECS, "cannabis_specific");
  const highHits = scanSpecs(lowered, HIGH_URGENCY_SPECS, "high");

  const hits = [...emergencyHits, ...cannabisHits, ...highHits];

  let topTier: RedFlagTier | null = null;
  if (emergencyHits.length > 0) topTier = "emergency";
  else if (cannabisHits.length > 0) topTier = "cannabis_specific";
  else if (highHits.length > 0) topTier = "high";

  const tierEmoji: Record<RedFlagTier, string> = {
    emergency: "🚨",
    cannabis_specific: "🌿",
    high: "⚠",
  };
  const flags = hits.map(
    (h) => `${tierEmoji[h.tier]} ${h.label} ("${h.keyword}")`,
  );

  return { hits, topTier, flags };
}

/**
 * Map our internal tier to the triage urgency enum that agents emit.
 * Cannabis-specific flags default to "high" (same-day visit) UNLESS the text
 * also includes an emergency keyword — then the emergency tier wins.
 */
export function tierToUrgency(tier: RedFlagTier | null): "emergency" | "high" | null {
  if (tier === "emergency") return "emergency";
  if (tier === "cannabis_specific" || tier === "high") return "high";
  return null;
}

// ---------------------------------------------------------------------------
// Cannabis-aware red-flag scanner — bilingual (EN + ES)
// ---------------------------------------------------------------------------
// This is the single source of truth for "does this free-text string contain
// anything a cannabis care practice must react to immediately?"
//
// Every agent that ingests free-text patient input (correspondence, scribe
// inputs, pre-visit briefings, intake, dose logs) funnels through
// `scanForSafetyFlags()` so a new red flag only needs to be added in one
// place.
//
// Tier taxonomy:
//   - emergency         call 911 / 988 immediately (ACS, PE, stroke, suicidal
//                       ideation, anaphylaxis, overdose, seizure, uncontrolled
//                       hemorrhage, altered LOC)
//   - cannabis_specific conditions that are cannabis-correlated and require a
//                       same-day clinician touch (CHS, cannabis-induced
//                       psychosis, pediatric ingestion, pregnancy/lactation
//                       exposure, CUD loss-of-control, symptomatic tachycardia)
//   - high              clinically concerning but not immediately life-
//                       threatening (worsening, rash, fever, severe pain,
//                       protracted vomiting, altered mentation)
// ---------------------------------------------------------------------------

export type RedFlagTier = "emergency" | "cannabis_specific" | "high";

export interface RedFlag {
  /** Stable id — safe to persist or use as a metric label */
  id: string;
  tier: RedFlagTier;
  /** Human-readable label for the UI */
  label: string;
  /** Case-insensitive substrings that trigger the flag, covering EN + ES */
  keywords: string[];
  /** Short rationale to show the clinician */
  rationale: string;
}

// ---------------------------------------------------------------------------
// EMERGENCY tier — call 911 / 988 immediately
// ---------------------------------------------------------------------------

const EMERGENCY_FLAGS: RedFlag[] = [
  {
    id: "emergency.cardiac",
    tier: "emergency",
    label: "Possible acute coronary syndrome",
    keywords: [
      "chest pain",
      "crushing chest",
      "chest pressure",
      "left arm pain",
      "jaw pain",
      "pain in my chest",
      // ES
      "dolor de pecho",
      "dolor en el pecho",
      "presion en el pecho",
      "presión en el pecho",
      "dolor en el brazo izquierdo",
    ],
    rationale:
      "Chest pain, pressure, or radiating arm/jaw pain — possible MI or ACS. THC causes acute tachycardia and vasodilation; cannabis use within 1h raises ACS risk. Call 911.",
  },
  {
    id: "emergency.respiratory",
    tier: "emergency",
    label: "Respiratory emergency / possible PE",
    keywords: [
      "difficulty breathing",
      "trouble breathing",
      "cant breathe",
      "can't breathe",
      "short of breath",
      "shortness of breath",
      "pulmonary embolism",
      "coughing blood",
      "coughing up blood",
      "hemoptysis",
      // ES
      "no puedo respirar",
      "dificultad para respirar",
      "me falta el aire",
      "tos con sangre",
    ],
    rationale:
      "Acute dyspnea or hemoptysis — possible PE, anaphylaxis, cardiac cause, or severe asthma. Call 911.",
  },
  {
    id: "emergency.stroke.fast",
    tier: "emergency",
    label: "Stroke symptoms (FAST)",
    keywords: [
      "stroke",
      "face drooping",
      "face is drooping",
      "slurred speech",
      "cant talk",
      "can't talk",
      "arm weakness",
      "numbness on one side",
      "one side numb",
      "weakness on one side",
      "worst headache",
      "worst headache of my life",
      "thunderclap headache",
      // ES
      "derrame cerebral",
      "debilidad en un lado",
      "no puedo hablar",
      "habla arrastrada",
      "peor dolor de cabeza",
    ],
    rationale:
      "FAST symptoms — face drooping, arm weakness, slurred speech, worst-ever headache. Time is brain. Call 911.",
  },
  {
    id: "emergency.anaphylaxis",
    tier: "emergency",
    label: "Anaphylaxis",
    keywords: [
      "anaphylax",
      "severe allergic",
      "throat closing",
      "throat swelling",
      "tongue swelling",
      "tongue is swelling",
      "lips swelling",
      "cant swallow",
      "can't swallow",
      "hives all over",
      // ES
      "anafilaxia",
      "reaccion alergica severa",
      "reacción alérgica severa",
      "garganta cerrada",
      "lengua hinchada",
    ],
    rationale:
      "Airway compromise / anaphylaxis. Use epinephrine if available and call 911.",
  },
  {
    id: "emergency.suicidal_ideation",
    tier: "emergency",
    label: "Suicidal ideation",
    keywords: [
      "suicidal",
      "suicide",
      "kill myself",
      "end it all",
      "end my life",
      "dont want to live",
      "don't want to live",
      "hurting myself",
      "hurt myself",
      "plan to kill",
      "plan to die",
      // ES
      "suicidio",
      "suicida",
      "quitarme la vida",
      "matarme",
      "no quiero vivir",
      "me quiero morir",
      "hacerme daño",
    ],
    rationale:
      "Suicidal ideation. Route to 988 (Suicide & Crisis Lifeline) or 911. Do not attempt to resolve via message.",
  },
  {
    id: "emergency.overdose",
    tier: "emergency",
    label: "Overdose / poisoning",
    keywords: [
      "overdose",
      "od'd",
      "took too many",
      "took the whole bottle",
      "poisoning",
      "poisoned",
      // ES
      "sobredosis",
      "me envenene",
      "me envenené",
      "tome demasiado",
      "tomé demasiado",
    ],
    rationale:
      "Possible overdose or poisoning. Call 911 and Poison Control (1-800-222-1222).",
  },
  {
    id: "emergency.seizure",
    tier: "emergency",
    label: "Seizure / status epilepticus",
    keywords: [
      "seizure",
      "seizing",
      "convulsion",
      "status epilepticus",
      "wont stop shaking",
      "won't stop shaking",
      // ES
      "convulsion",
      "convulsión",
      "ataque epileptico",
      "ataque epiléptico",
    ],
    rationale:
      "Active seizure or post-ictal state — call 911, especially if first-ever or > 5 min.",
  },
  {
    id: "emergency.altered_loc",
    tier: "emergency",
    label: "Altered level of consciousness",
    keywords: [
      "unconscious",
      "unresponsive",
      "passed out",
      "fainted",
      "wont wake up",
      "won't wake up",
      "not responding",
      // ES
      "inconsciente",
      "no responde",
      "se desmayo",
      "se desmayó",
    ],
    rationale:
      "Altered mental status / unconsciousness. Call 911.",
  },
  {
    id: "emergency.hemorrhage",
    tier: "emergency",
    label: "Uncontrolled hemorrhage",
    keywords: [
      "bleeding heavily",
      "wont stop bleeding",
      "won't stop bleeding",
      "hemorrhage",
      "vomiting blood",
      "bloody stool",
      "blood in stool",
      "blood everywhere",
      // ES
      "hemorragia",
      "sangrado fuerte",
      "no deja de sangrar",
      "vomito con sangre",
      "vómito con sangre",
    ],
    rationale:
      "Uncontrolled hemorrhage or GI bleeding. Apply pressure and call 911.",
  },
];

// ---------------------------------------------------------------------------
// CANNABIS_SPECIFIC tier — same-day clinician touch
// ---------------------------------------------------------------------------

const CANNABIS_FLAGS: RedFlag[] = [
  {
    id: "cannabis.hyperemesis",
    tier: "cannabis_specific",
    label: "Cannabis hyperemesis syndrome (CHS)",
    keywords: [
      "cyclic vomiting",
      "cyclical vomiting",
      "hot shower helps",
      "hot showers help",
      "cant stop vomiting",
      "can't stop vomiting",
      "vomiting for days",
      "cannabis hyperemesis",
      "chs",
      // ES
      "vomitos ciclicos",
      "vómitos cíclicos",
      "ducha caliente ayuda",
      "no puedo parar de vomitar",
    ],
    rationale:
      "Hallmarks of cannabinoid hyperemesis syndrome — cyclic vomiting, relief with hot showers. The treatment is cessation; continued use perpetuates symptoms.",
  },
  {
    id: "cannabis.induced_psychosis",
    tier: "cannabis_specific",
    label: "Cannabis-induced psychosis",
    keywords: [
      "hearing voices",
      "voices in my head",
      "seeing things",
      "paranoid",
      "theyre watching",
      "they're watching me",
      "people are after me",
      "delusions",
      "hallucinating",
      // ES
      "escucho voces",
      "oigo voces",
      "veo cosas",
      "paranoico",
      "paranoica",
      "alucinaciones",
    ],
    rationale:
      "Possible cannabis-induced psychotic episode. Hold cannabis, consider urgent psych eval, and rule out emergency if acute safety risk.",
  },
  {
    id: "cannabis.pediatric_ingestion",
    tier: "cannabis_specific",
    label: "Pediatric / accidental ingestion",
    keywords: [
      "my child ate",
      "my kid ate",
      "baby ate",
      "toddler ate",
      "child got into",
      "kid got into",
      "child ingested",
      "pediatric ingestion",
      "accidentally ate",
      "edible child",
      // ES
      "mi hijo comio",
      "mi hijo comió",
      "mi hija comio",
      "mi hija comió",
      "el bebe comio",
      "el bebé comió",
      "el niño comio",
      "el niño comió",
    ],
    rationale:
      "Pediatric cannabis exposure — call Poison Control (1-800-222-1222) and consider ER evaluation. High-THC edibles can cause respiratory depression in small children.",
  },
  {
    id: "cannabis.cud_loss_of_control",
    tier: "cannabis_specific",
    label: "Cannabis use disorder — loss of control",
    keywords: [
      "cant stop using",
      "can't stop using",
      "using more than",
      "way more than prescribed",
      "cant control my use",
      "can't control my use",
      "using all day",
      "smoking all day",
      "withdrawal",
      "withdrawing",
      // ES
      "no puedo parar",
      "no puedo controlar",
      "uso todo el dia",
      "uso todo el día",
      "sindrome de abstinencia",
      "síndrome de abstinencia",
    ],
    rationale:
      "Loss-of-control use pattern consistent with CUD (DSM-5). Escalate for screening (CUDIT-R) and treatment planning.",
  },
  {
    id: "cannabis.pregnancy_lactation",
    tier: "cannabis_specific",
    label: "Pregnancy / lactation exposure",
    keywords: [
      "im pregnant",
      "i'm pregnant",
      "found out pregnant",
      "just pregnant",
      "trying to conceive",
      "breastfeeding",
      "breastfed",
      "nursing my baby",
      "pumping",
      // ES
      "estoy embarazada",
      "estoy amamantando",
      "dando pecho",
      "lactancia",
    ],
    rationale:
      "Cannabis exposure during pregnancy or lactation — ACOG/AAP recommend no use. THC crosses placenta and enters breast milk. Escalate for counseling and alternate therapy.",
  },
  {
    id: "cannabis.tachycardia",
    tier: "cannabis_specific",
    label: "Symptomatic tachycardia / arrhythmia",
    keywords: [
      "heart racing",
      "heart is racing",
      "heart pounding",
      "palpitations",
      "racing heart",
      "irregular heartbeat",
      "skipped beat",
      // ES
      "el corazon late rapido",
      "el corazón late rápido",
      "palpitaciones",
      "taquicardia",
      "latido irregular",
    ],
    rationale:
      "THC commonly causes tachycardia; symptomatic palpitations or arrhythmia warrant ECG and same-day evaluation, especially in cardiovascular-risk patients.",
  },
];

// ---------------------------------------------------------------------------
// HIGH tier — clinically concerning, not immediately life-threatening
// ---------------------------------------------------------------------------

const HIGH_FLAGS: RedFlag[] = [
  {
    id: "high.worsening",
    tier: "high",
    label: "Worsening symptoms",
    keywords: [
      "worse",
      "worsening",
      "much worse",
      "getting worse",
      "keeps getting worse",
      // ES
      "peor",
      "cada vez peor",
      "empeorando",
    ],
    rationale:
      "Symptoms trending worse. Schedule urgent follow-up; consider regimen change.",
  },
  {
    id: "high.rash",
    tier: "high",
    label: "Rash / dermatologic reaction",
    keywords: [
      "rash",
      "hives",
      "welts",
      "spreading rash",
      "itchy all over",
      // ES
      "sarpullido",
      "urticaria",
      "ronchas",
    ],
    rationale:
      "Rash or hives — rule out drug reaction vs. allergic reaction. If spreading, consider SJS/TEN or anaphylaxis.",
  },
  {
    id: "high.fever",
    tier: "high",
    label: "Fever",
    keywords: [
      "fever",
      "high fever",
      "103",
      "104",
      // ES
      "fiebre",
      "calentura",
    ],
    rationale:
      "Fever — assess source, immunocompromise status, and need for same-day visit.",
  },
  {
    id: "high.severe_pain",
    tier: "high",
    label: "Severe pain",
    keywords: [
      "severe pain",
      "worst pain",
      "10 out of 10",
      "10/10 pain",
      "excruciating",
      "unbearable pain",
      // ES
      "dolor severo",
      "peor dolor",
      "dolor insoportable",
    ],
    rationale:
      "Severe pain — reassess regimen, rule out acute process, and offer same-day touch.",
  },
  {
    id: "high.protracted_vomiting",
    tier: "high",
    label: "Protracted vomiting / dehydration risk",
    keywords: [
      "cant keep anything down",
      "can't keep anything down",
      "vomiting all day",
      "throwing up all day",
      "vomiting nonstop",
      // ES
      "vomitando todo el dia",
      "vomitando todo el día",
      "no puedo retener nada",
    ],
    rationale:
      "Protracted vomiting — dehydration risk and possible CHS. Re-screen for CHS pattern explicitly.",
  },
  {
    id: "high.altered_mentation",
    tier: "high",
    label: "Altered mentation / confusion",
    keywords: [
      "confused",
      "very confused",
      "cant think straight",
      "can't think straight",
      "disoriented",
      "foggy",
      "brain fog",
      // ES
      "confundido",
      "desorientado",
      "desorientada",
    ],
    rationale:
      "Altered mentation — rule out cannabis intoxication vs. medical cause (infection, hypoglycemia, CVA). Escalate if new.",
  },
];

// ---------------------------------------------------------------------------
// Full registry
// ---------------------------------------------------------------------------

export const CANNABIS_RED_FLAGS: RedFlag[] = [
  ...EMERGENCY_FLAGS,
  ...CANNABIS_FLAGS,
  ...HIGH_FLAGS,
];

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export interface SafetyFlagHit {
  /** Flag id for programmatic use */
  id: string;
  tier: RedFlagTier;
  label: string;
  /** The exact keyword that matched */
  matchedKeyword: string;
  rationale: string;
}

export interface SafetyScanResult {
  /** Individual keyword hits, in input-text order */
  hits: SafetyFlagHit[];
  /** Highest-severity tier hit, or null if nothing matched */
  topTier: RedFlagTier | null;
  /** De-duplicated human-readable flag labels for display */
  flags: string[];
}

const TIER_RANK: Record<RedFlagTier, number> = {
  emergency: 3,
  cannabis_specific: 2,
  high: 1,
};

/**
 * Scan a string for cannabis-aware red flags. Case-insensitive substring
 * match. Returns every hit so callers can render them; `topTier` is the
 * single most severe tier observed (emergency > cannabis_specific > high).
 */
export function scanForSafetyFlags(text: string | null | undefined): SafetyScanResult {
  if (!text || text.length === 0) {
    return { hits: [], topTier: null, flags: [] };
  }
  const lowered = text.toLowerCase();
  const hits: SafetyFlagHit[] = [];
  const seenKey = new Set<string>();

  for (const flag of CANNABIS_RED_FLAGS) {
    for (const kw of flag.keywords) {
      if (!lowered.includes(kw)) continue;
      const key = `${flag.id}::${kw}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      hits.push({
        id: flag.id,
        tier: flag.tier,
        label: flag.label,
        matchedKeyword: kw,
        rationale: flag.rationale,
      });
    }
  }

  let topTier: RedFlagTier | null = null;
  for (const h of hits) {
    if (!topTier || TIER_RANK[h.tier] > TIER_RANK[topTier]) {
      topTier = h.tier;
    }
  }

  const flagLabels: string[] = [];
  const seenFlag = new Set<string>();
  for (const h of hits) {
    if (seenFlag.has(h.id)) continue;
    seenFlag.add(h.id);
    const prefix =
      h.tier === "emergency"
        ? "\u{1F6A8}"
        : h.tier === "cannabis_specific"
          ? "\u{1F33F}"
          : "⚠";
    flagLabels.push(`${prefix} ${h.label} ("${h.matchedKeyword}")`);
  }

  return { hits, topTier, flags: flagLabels };
}

/**
 * Map a safety tier to the urgency label the triage pipelines use.
 * Returns null for no-hit so callers can preserve their own default.
 */
export function tierToUrgency(
  tier: RedFlagTier | null,
): "emergency" | "high" | null {
  if (tier === "emergency") return "emergency";
  if (tier === "cannabis_specific") return "emergency"; // same-day escalation
  if (tier === "high") return "high";
  return null;
}

/**
 * Canonical emergency-response copy. Used by deterministic fallback drafts so
 * that if the LLM is unavailable the patient still receives actionable
 * instructions instead of a "we'll get back to you" holding reply.
 */
export const EMERGENCY_RESPONSE_COPY = {
  en:
    "This sounds like it could be a medical emergency. Please call 911 right now or go to the nearest emergency room. " +
    "If this is about suicidal thoughts, call or text 988 (Suicide & Crisis Lifeline). " +
    "If a child may have ingested cannabis, call Poison Control at 1-800-222-1222. " +
    "Please do not wait for a reply to this message — we will follow up after you are safe.",
  es:
    "Esto puede ser una emergencia médica. Por favor llame al 911 ahora mismo o vaya a la sala de emergencias más cercana. " +
    "Si tiene pensamientos suicidas, llame o envíe un mensaje al 988 (Línea de Crisis de Suicidio). " +
    "Si un niño pudo haber ingerido cannabis, llame a Control de Envenenamiento al 1-800-222-1222. " +
    "Por favor no espere una respuesta a este mensaje — lo contactaremos después de que esté a salvo.",
};

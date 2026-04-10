// Plain-language module — EMR-009
// Converts clinical terms and abbreviations to warm, 3rd-grade reading level text.
// No LLM calls; everything is deterministic template expansion.

// ---------------------------------------------------------------------------
// Condition mapping — ICD-10 codes, abbreviations, and clinical terms
// ---------------------------------------------------------------------------

interface SimplifiedCondition {
  /** Short name, 1-3 words */
  name: string;
  /** One-sentence explanation a child could understand */
  explanation: string;
}

const CONDITIONS: Record<string, SimplifiedCondition> = {
  // Anxiety
  "F41.1": { name: "Anxiety", explanation: "feeling worried or nervous a lot, even when things are okay" },
  GAD: { name: "Anxiety", explanation: "feeling worried or nervous a lot, even when things are okay" },
  "generalized anxiety disorder": { name: "Anxiety", explanation: "feeling worried or nervous a lot, even when things are okay" },

  // Depression
  "F32.9": { name: "Depression", explanation: "feeling very sad or empty for a long time" },
  MDD: { name: "Depression", explanation: "feeling very sad or empty for a long time" },
  "major depressive disorder": { name: "Depression", explanation: "feeling very sad or empty for a long time" },

  // Hypertension
  I10: { name: "High blood pressure", explanation: "your blood pushes too hard against your blood vessel walls" },
  HTN: { name: "High blood pressure", explanation: "your blood pushes too hard against your blood vessel walls" },
  "essential hypertension": { name: "High blood pressure", explanation: "your blood pushes too hard against your blood vessel walls" },
  hypertension: { name: "High blood pressure", explanation: "your blood pushes too hard against your blood vessel walls" },

  // Hyperlipidemia
  "E78.00": { name: "High cholesterol", explanation: "too much fat in your blood, which can make your heart work harder" },
  HLD: { name: "High cholesterol", explanation: "too much fat in your blood, which can make your heart work harder" },
  hyperlipidemia: { name: "High cholesterol", explanation: "too much fat in your blood, which can make your heart work harder" },

  // Insomnia
  "G47.00": { name: "Trouble sleeping", explanation: "having a hard time falling asleep or staying asleep" },
  insomnia: { name: "Trouble sleeping", explanation: "having a hard time falling asleep or staying asleep" },

  // Chronic pain
  "G89.29": { name: "Ongoing pain", explanation: "pain that has lasted a long time and keeps coming back" },
  "chronic pain": { name: "Ongoing pain", explanation: "pain that has lasted a long time and keeps coming back" },

  // Nausea
  "R11.0": { name: "Feeling sick to your stomach", explanation: "your tummy feels upset and you might feel like throwing up" },
  nausea: { name: "Feeling sick to your stomach", explanation: "your tummy feels upset and you might feel like throwing up" },

  // Migraine
  "G43.909": { name: "Very bad headaches", explanation: "really strong headaches that can make it hard to do anything" },
  migraine: { name: "Very bad headaches", explanation: "really strong headaches that can make it hard to do anything" },
  migraines: { name: "Very bad headaches", explanation: "really strong headaches that can make it hard to do anything" },

  // PTSD
  "F43.10": { name: "Stress from past experiences", explanation: "feeling scared or upset because of something hard that happened before" },
  PTSD: { name: "Stress from past experiences", explanation: "feeling scared or upset because of something hard that happened before" },
  "post-traumatic stress disorder": { name: "Stress from past experiences", explanation: "feeling scared or upset because of something hard that happened before" },

  // Cancer
  "C80.1": { name: "Cancer", explanation: "a sickness where some cells in the body grow in a way they shouldn't" },
  cancer: { name: "Cancer", explanation: "a sickness where some cells in the body grow in a way they shouldn't" },

  // Type 2 Diabetes
  E11: { name: "Type 2 diabetes", explanation: "your body has trouble using sugar from food for energy" },
  DM2: { name: "Type 2 diabetes", explanation: "your body has trouble using sugar from food for energy" },
  "type 2 diabetes": { name: "Type 2 diabetes", explanation: "your body has trouble using sugar from food for energy" },
  "diabetes mellitus type 2": { name: "Type 2 diabetes", explanation: "your body has trouble using sugar from food for energy" },

  // Coronary artery disease
  I25: { name: "Heart disease", explanation: "the blood vessels around your heart have gotten narrow, so your heart has to work harder" },
  CAD: { name: "Heart disease", explanation: "the blood vessels around your heart have gotten narrow, so your heart has to work harder" },
  "coronary artery disease": { name: "Heart disease", explanation: "the blood vessels around your heart have gotten narrow, so your heart has to work harder" },

  // Asthma
  J45: { name: "Asthma", explanation: "trouble breathing sometimes because your airways get tight" },
  asthma: { name: "Asthma", explanation: "trouble breathing sometimes because your airways get tight" },

  // Low back pain
  "M54.5": { name: "Back pain", explanation: "pain in the lower part of your back" },
  "low back pain": { name: "Back pain", explanation: "pain in the lower part of your back" },

  // Alcohol use disorder
  "F10.20": { name: "Difficulty with alcohol", explanation: "drinking has been causing problems and it's hard to stop" },
  "alcohol use disorder": { name: "Difficulty with alcohol", explanation: "drinking has been causing problems and it's hard to stop" },

  // Nicotine dependence
  "F17.210": { name: "Trying to quit smoking", explanation: "your body got used to nicotine and it's hard to stop using it" },
  "nicotine dependence": { name: "Trying to quit smoking", explanation: "your body got used to nicotine and it's hard to stop using it" },

  // Obesity
  E66: { name: "Carrying extra weight", explanation: "your body is holding on to more weight than is healthy, which can make other things harder" },
  obesity: { name: "Carrying extra weight", explanation: "your body is holding on to more weight than is healthy, which can make other things harder" },

  // GERD
  K21: { name: "Acid reflux", explanation: "stomach acid coming up into your throat, which can burn and feel uncomfortable" },
  GERD: { name: "Acid reflux", explanation: "stomach acid coming up into your throat, which can burn and feel uncomfortable" },
  "gastroesophageal reflux disease": { name: "Acid reflux", explanation: "stomach acid coming up into your throat, which can burn and feel uncomfortable" },

  // UTI
  "N39.0": { name: "Bladder infection", explanation: "germs got into your bladder and made it hurt to go to the bathroom" },
  UTI: { name: "Bladder infection", explanation: "germs got into your bladder and made it hurt to go to the bathroom" },
  "urinary tract infection": { name: "Bladder infection", explanation: "germs got into your bladder and made it hurt to go to the bathroom" },

  // URI
  "J06.9": { name: "Common cold", explanation: "a bug that gives you a stuffy nose, sore throat, and makes you feel run down" },
  URI: { name: "Common cold", explanation: "a bug that gives you a stuffy nose, sore throat, and makes you feel run down" },
  "upper respiratory infection": { name: "Common cold", explanation: "a bug that gives you a stuffy nose, sore throat, and makes you feel run down" },
};

// ---------------------------------------------------------------------------
// Clinical abbreviation → plain-language map (for note summaries)
// ---------------------------------------------------------------------------

const ABBREVIATIONS: Record<string, string> = {
  HTN: "high blood pressure",
  DM2: "type 2 diabetes",
  DM: "diabetes",
  CAD: "heart disease",
  HLD: "high cholesterol",
  GERD: "acid reflux",
  UTI: "bladder infection",
  URI: "common cold",
  PTSD: "stress from past experiences",
  MDD: "depression",
  GAD: "anxiety",
  BMI: "body mass index",
  PRN: "as needed",
  BID: "twice a day",
  TID: "three times a day",
  QD: "once a day",
  QHS: "at bedtime",
  PO: "by mouth",
  Rx: "prescription",
  Dx: "diagnosis",
  Hx: "history",
  Tx: "treatment",
  Sx: "symptoms",
  Fx: "fracture",
  PMH: "past medical history",
  FHx: "family history",
  SOB: "shortness of breath",
  HA: "headache",
  CP: "chest pain",
  abd: "belly",
  bilat: "both sides",
  prn: "as needed",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a clinical diagnosis term (ICD-10 code, abbreviation, or full name)
 * to a simple, warm explanation at a 3rd-grade reading level.
 *
 * Returns a string like:
 *   "High blood pressure — your blood pushes too hard against your blood vessel walls"
 *
 * If the term is not recognized, it is returned as-is.
 */
export function simplifyDiagnosis(term: string): string {
  const trimmed = term.trim();

  // Try exact match first
  const exact = CONDITIONS[trimmed] ?? CONDITIONS[trimmed.toLowerCase()];
  if (exact) {
    return `${exact.name} \u2014 ${exact.explanation}`;
  }

  // Try matching just the ICD-10 code prefix (e.g. "E11.9" matches "E11")
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex > 0) {
    const prefix = trimmed.slice(0, dotIndex);
    const prefixMatch = CONDITIONS[prefix];
    if (prefixMatch) {
      return `${prefixMatch.name} \u2014 ${prefixMatch.explanation}`;
    }
  }

  // Return original term if no mapping found
  return trimmed;
}

/**
 * Convert a clinical note summary to patient-friendly language by replacing
 * common abbreviations and clinical shorthand with plain words.
 */
export function simplifyNoteSummary(text: string): string {
  let result = text;

  // Replace abbreviations — use word-boundary matching so we don't mangle
  // substrings (e.g. "CADET" shouldn't become "heart diseaseet").
  for (const [abbr, plain] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${escapeRegExp(abbr)}\\b`, "g");
    result = result.replace(regex, plain);
  }

  // Replace some common clinical phrases
  result = result.replace(/\bpt\b/gi, "patient");
  result = result.replace(/\bc\/o\b/gi, "concerned about");
  result = result.replace(/\bw\/\b/gi, "with ");
  result = result.replace(/\bw\/o\b/gi, "without ");
  result = result.replace(/\bf\/u\b/gi, "follow-up");
  result = result.replace(/\bd\/c\b/gi, "stop");
  result = result.replace(/\br\/o\b/gi, "rule out");
  result = result.replace(/\bs\/p\b/gi, "after");

  return result;
}

/**
 * Take a list of clinical history items (e.g. ["HTN", "DM2", "CAD"]) and
 * produce a warm, personal sentence.
 *
 * Example:
 *   ["HTN", "DM2", "CAD"]
 *   → "Your health story includes high blood pressure, type 2 diabetes, and heart disease."
 */
export function personalizeHistory(items: string[]): string {
  if (!items.length) {
    return "Your health story is still being written. As your care team learns more about you, this section will fill in.";
  }

  const simplified = items.map((item) => {
    const trimmed = item.trim();
    const match = CONDITIONS[trimmed] ?? CONDITIONS[trimmed.toLowerCase()];
    return match ? match.name.toLowerCase() : trimmed.toLowerCase();
  });

  const formatted = formatList(simplified);
  return `Your health story includes ${formatted}.`;
}

/**
 * Look up just the simple name for a clinical term.
 * Returns the original term if no mapping is found.
 */
export function simpleName(term: string): string {
  const trimmed = term.trim();
  const match = CONDITIONS[trimmed] ?? CONDITIONS[trimmed.toLowerCase()];
  return match ? match.name : trimmed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  const head = items.slice(0, -1);
  const tail = items[items.length - 1];
  return `${head.join(", ")}, and ${tail}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

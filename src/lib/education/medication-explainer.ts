/**
 * EMR-133 — Patient Medication Explainer
 *
 * Plain-language, 3rd-grade reading level explanations for the
 * medications that show up most in our population. The catalog is
 * curated rather than generated so we can guarantee the wording, the
 * emoji illustrations, and the side-effect taxonomy are all
 * consistent. A model layer can later enrich this with patient-specific
 * notes; the primitive is enough to ship the explainer surface today.
 *
 * Each entry covers four things:
 *   1. What it does — one sentence a 3rd grader can read.
 *   2. How to take it — when, with food, how often.
 *   3. Side effects — common and serious, separated.
 *   4. Interactions — short list of common-sense warnings.
 *
 * The cartoon emoji set is intentionally tiny — the goal is "soft
 * children's-book illustration", not pixel-perfect art.
 */

import { z } from "zod";

export type ReadingLevel = "3rd-grade" | "5th-grade" | "adult";

export type Severity = "common" | "serious" | "rare";

export interface SideEffect {
  text: string;
  severity: Severity;
  /** Plain-language guidance ("call your care team", "drink water"). */
  whatToDo?: string;
}

export interface InteractionWarning {
  /** Free text — "alcohol", "grapefruit", "ibuprofen", etc. */
  with: string;
  /** Plain-language warning. */
  warning: string;
  severity: Severity;
}

export interface MedExplainer {
  /** Lowercase generic name used as the primary key. */
  id: string;
  /** Display name (capitalized generic). */
  name: string;
  /** Common brand names. */
  brands?: string[];
  /** Drug class / category badge text. */
  category: string;
  /** Big cartoon emoji used as the hero illustration. */
  emoji: string;
  /** A pair of supporting emojis used in the "how it works" panel. */
  illustration: { actor: string; target: string; arrow: string };
  /** What the medicine does — one sentence, 3rd grade. */
  whatItDoes: string;
  /** How to take it — short and friendly. */
  howToTake: string;
  /** Things that help the medicine work better. */
  helpfulTips: string[];
  sideEffects: SideEffect[];
  interactions: InteractionWarning[];
  /** Cannabis-specific note when relevant. */
  cannabisNote?: string;
}

export const medExplainerSchema = z.object({
  id: z.string(),
  name: z.string(),
  brands: z.array(z.string()).optional(),
  category: z.string(),
  emoji: z.string(),
  illustration: z.object({ actor: z.string(), target: z.string(), arrow: z.string() }),
  whatItDoes: z.string(),
  howToTake: z.string(),
  helpfulTips: z.array(z.string()),
  sideEffects: z.array(
    z.object({
      text: z.string(),
      severity: z.enum(["common", "serious", "rare"]),
      whatToDo: z.string().optional(),
    }),
  ),
  interactions: z.array(
    z.object({
      with: z.string(),
      warning: z.string(),
      severity: z.enum(["common", "serious", "rare"]),
    }),
  ),
  cannabisNote: z.string().optional(),
});

export const MED_EXPLAINERS: MedExplainer[] = [
  {
    id: "metformin",
    name: "Metformin",
    brands: ["Glucophage", "Fortamet"],
    category: "Diabetes",
    emoji: "🍯",
    illustration: { actor: "💊", target: "🩸", arrow: "→" },
    whatItDoes:
      "Helps your body use sugar from food the right way so it does not pile up in your blood.",
    howToTake:
      "Swallow with food. Same time every day. Do not crush or break the tablet.",
    helpfulTips: [
      "Take with a meal — it is gentler on your tummy.",
      "Drink water through the day.",
      "If you forget a dose, skip it. Do not double up.",
    ],
    sideEffects: [
      { text: "Upset stomach or loose poop", severity: "common", whatToDo: "Take it with food and drink water." },
      { text: "Metal taste in your mouth", severity: "common" },
      { text: "Feeling very weak with belly pain", severity: "serious", whatToDo: "Call your care team right away." },
    ],
    interactions: [
      { with: "Alcohol", warning: "A lot of alcohol can make you very sick. Keep it light.", severity: "serious" },
      { with: "Contrast dye for scans", warning: "Tell the imaging team you take metformin before a scan.", severity: "serious" },
    ],
  },
  {
    id: "lisinopril",
    name: "Lisinopril",
    brands: ["Prinivil", "Zestril"],
    category: "Blood pressure",
    emoji: "❤️",
    illustration: { actor: "💊", target: "🫀", arrow: "→" },
    whatItDoes:
      "Helps your blood vessels relax so your heart does not have to push as hard.",
    howToTake: "Once a day, same time. With or without food.",
    helpfulTips: [
      "Stand up slowly — you might feel dizzy at first.",
      "Drink water through the day.",
    ],
    sideEffects: [
      { text: "Dry tickly cough", severity: "common" },
      { text: "Feeling lightheaded", severity: "common", whatToDo: "Sit down. Drink water." },
      { text: "Swollen face, lips, or tongue", severity: "serious", whatToDo: "Call 911. This is rare but a true emergency." },
    ],
    interactions: [
      { with: "Salt substitutes (potassium)", warning: "Too much potassium can hurt your heart.", severity: "serious" },
      { with: "Ibuprofen / Advil", warning: "Can make this medicine work less well.", severity: "common" },
    ],
  },
  {
    id: "atorvastatin",
    name: "Atorvastatin",
    brands: ["Lipitor"],
    category: "Cholesterol",
    emoji: "🧈",
    illustration: { actor: "💊", target: "🩸", arrow: "→" },
    whatItDoes:
      "Helps your body make less of the bad cholesterol that can clog your blood vessels.",
    howToTake: "Once a day, in the evening. With or without food.",
    helpfulTips: [
      "Tell your team if your muscles ache — it is rare but worth a check.",
      "Eat fewer fried foods to give the medicine a hand.",
    ],
    sideEffects: [
      { text: "Mild muscle aches", severity: "common" },
      { text: "Headache", severity: "common" },
      {
        text: "Strong muscle pain or dark pee",
        severity: "serious",
        whatToDo: "Stop the medicine and call your care team today.",
      },
    ],
    interactions: [
      { with: "Grapefruit juice", warning: "Can make the medicine too strong. Skip the grapefruit.", severity: "common" },
    ],
  },
  {
    id: "sertraline",
    name: "Sertraline",
    brands: ["Zoloft"],
    category: "Mood",
    emoji: "🌤️",
    illustration: { actor: "💊", target: "🧠", arrow: "→" },
    whatItDoes:
      "Helps your brain keep more of the chemicals that lift your mood.",
    howToTake: "Once a day, same time. With food helps.",
    helpfulTips: [
      "Give it 4 to 6 weeks to start working.",
      "Do not stop on your own — taper with your team.",
    ],
    sideEffects: [
      { text: "Sleepy or wide awake — could go either way", severity: "common" },
      { text: "Upset tummy at first", severity: "common" },
      { text: "Thoughts of hurting yourself", severity: "serious", whatToDo: "Call 988 right away. We are here." },
    ],
    interactions: [
      { with: "Other mood medicines", warning: "Mixing can cause too much serotonin. Tell your team about every med.", severity: "serious" },
      { with: "Alcohol", warning: "Can make you extra sleepy.", severity: "common" },
    ],
    cannabisNote:
      "Cannabis can change how this medicine feels. Start low and tell your team.",
  },
  {
    id: "albuterol",
    name: "Albuterol",
    brands: ["ProAir", "Ventolin"],
    category: "Lungs",
    emoji: "🫁",
    illustration: { actor: "💨", target: "🫁", arrow: "→" },
    whatItDoes:
      "Opens up the small tubes in your lungs so you can breathe easier.",
    howToTake: "Use the inhaler when you feel tight in your chest. 1 to 2 puffs.",
    helpfulTips: [
      "Shake it before each puff.",
      "Rinse your mouth with water after.",
    ],
    sideEffects: [
      { text: "Shaky hands", severity: "common" },
      { text: "Fast heartbeat", severity: "common" },
      { text: "Chest pain", severity: "serious", whatToDo: "Call 911." },
    ],
    interactions: [
      { with: "Caffeine", warning: "Can make the shakes worse.", severity: "common" },
    ],
  },
  {
    id: "cbd",
    name: "CBD (cannabidiol)",
    brands: ["Epidiolex"],
    category: "Cannabis",
    emoji: "🌿",
    illustration: { actor: "🌿", target: "🧠", arrow: "→" },
    whatItDoes:
      "A natural part of the cannabis plant that can calm pain, ease anxiety, and help with sleep.",
    howToTake:
      "Take with food at the same time each day. Start with a small dose and go up slowly.",
    helpfulTips: [
      "A fatty snack helps your body soak it up.",
      "Keep a log of how you feel — your team will use it to fine-tune.",
    ],
    sideEffects: [
      { text: "Dry mouth", severity: "common" },
      { text: "Sleepy", severity: "common" },
      { text: "Loose poop", severity: "common" },
      { text: "Liver numbers going up on a blood test", severity: "rare", whatToDo: "We watch this with labs." },
    ],
    interactions: [
      { with: "Blood thinners (warfarin)", warning: "Can change how strong the thinner is. We will check your labs.", severity: "serious" },
      { with: "Seizure medicines", warning: "Can change how much is in your blood. Tell your team.", severity: "serious" },
    ],
    cannabisNote: "This is part of the cannabis plant. It does not make you high.",
  },
];

/* -------------------------------------------------------------------------- */
/* Lookups                                                                    */
/* -------------------------------------------------------------------------- */

const byId = new Map<string, MedExplainer>();
for (const m of MED_EXPLAINERS) byId.set(m.id, m);

export function findExplainer(query: string): MedExplainer | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const direct = byId.get(q);
  if (direct) return direct;
  return (
    MED_EXPLAINERS.find(
      (m) =>
        m.name.toLowerCase() === q ||
        m.brands?.some((b) => b.toLowerCase() === q),
    ) ?? null
  );
}

export function searchExplainers(query: string, limit = 8): MedExplainer[] {
  const q = query.trim().toLowerCase();
  if (!q) return MED_EXPLAINERS.slice(0, limit);
  return MED_EXPLAINERS.filter((m) => {
    const haystack = [m.name, m.id, m.category, ...(m.brands ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  }).slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Reading-level helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Quick Flesch-Kincaid grade approximation. We use this in tests and
 * editorial review to keep the catalog at 3rd-grade reading level.
 * Not a substitute for a real readability tool — but good enough to
 * flag drift when copy is edited.
 */
export function approximateGradeLevel(text: string): number {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return Math.max(
    0,
    0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59,
  );
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const matches = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

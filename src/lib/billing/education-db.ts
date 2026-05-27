/**
 * Cannabis Education Database (EMR-111)
 * -------------------------------------
 * Curated, code-resident reference data for terpenes, cannabinoids,
 * receptors, dosing fundamentals, flavonoids, and the endocannabinoid
 * system. Searchable through `searchEducation()`.
 *
 * Why it lives in `lib/billing`: claim narratives, denial appeals, and
 * patient statements all need plain-language descriptions of cannabis
 * compounds when the payer asks "what is CBG and why are you billing
 * for it." `enrichClaimLine()` pulls a one-sentence summary keyed on
 * the active ingredient so the appeal letter generator (EMR appeals
 * agent) can drop a citation without a network call.
 *
 * Builds on the existing Research Corpus — reference these compound
 * ids when linking out to the 50+ MCL-classified studies.
 *
 * Data shape is intentionally pure JSON-ish so it can later be moved
 * into Prisma (CannabisEducationEntry) without a code rewrite.
 */

export type CompoundCategory =
  | "cannabinoid"
  | "terpene"
  | "flavonoid"
  | "receptor"
  | "dosing"
  | "system";

export interface EducationEntry {
  id: string;
  category: CompoundCategory;
  name: string;
  aliases: string[];
  oneLineSummary: string;
  body: string[];
  aromaticNotes?: string[];
  reportedEffects?: string[];
  citations: string[];
}

export const EDUCATION_ENTRIES: EducationEntry[] = [
  {
    id: "thc",
    category: "cannabinoid",
    name: "Tetrahydrocannabinol",
    aliases: ["THC", "delta-9-THC", "Δ9-THC"],
    oneLineSummary:
      "The primary psychoactive cannabinoid in cannabis; binds CB1 receptors and produces the characteristic 'high.'",
    body: [
      "Partial agonist at CB1; weaker activity at CB2.",
      "Dose-dependent biphasic effects: low doses anxiolytic, high doses anxiogenic.",
      "Metabolized hepatically to 11-OH-THC, which is more potent than the parent.",
    ],
    reportedEffects: ["analgesia", "appetite stimulation", "anti-emetic", "muscle relaxation"],
    citations: ["10.1186/s42238-025-00295-7"],
  },
  {
    id: "cbd",
    category: "cannabinoid",
    name: "Cannabidiol",
    aliases: ["CBD"],
    oneLineSummary:
      "Non-intoxicating cannabinoid with broad receptor activity; the most studied compound in the MCL corpus.",
    body: [
      "Negative allosteric modulator at CB1; blunts THC psychoactivity in mixed extracts.",
      "5-HT1A and TRPV1 activity contribute to anxiolytic and anti-inflammatory effects.",
      "Inhibits CYP3A4 and CYP2C19 — clinically meaningful drug interactions.",
    ],
    reportedEffects: ["anxiolytic", "anti-inflammatory", "anticonvulsant"],
    citations: ["10.1186/s42238-025-00295-7"],
  },
  {
    id: "cbn",
    category: "cannabinoid",
    name: "Cannabinol",
    aliases: ["CBN"],
    oneLineSummary:
      "Mildly psychoactive degradation product of THC; commonly associated with sedation in patient reports.",
    body: [
      "Forms via THC oxidation in aged or heat-exposed cannabis.",
      "Weak CB1 agonist; sedative effects often co-occur with myrcene-rich chemovars.",
    ],
    reportedEffects: ["sedation", "analgesia"],
    citations: [],
  },
  {
    id: "cbg",
    category: "cannabinoid",
    name: "Cannabigerol",
    aliases: ["CBG", "mother cannabinoid"],
    oneLineSummary:
      "Non-intoxicating cannabinoid; biosynthetic precursor to THC, CBD, and CBC.",
    body: [
      "Agonist at α2-adrenergic receptors; partial agonist at 5-HT1A.",
      "Emerging evidence for IBD and glaucoma indications in the MCL corpus.",
    ],
    reportedEffects: ["anti-inflammatory", "neuroprotective"],
    citations: [],
  },
  {
    id: "cbc",
    category: "cannabinoid",
    name: "Cannabichromene",
    aliases: ["CBC"],
    oneLineSummary:
      "Non-intoxicating cannabinoid acting primarily on TRPA1 and TRPV channels.",
    body: ["Studied for analgesic and anti-inflammatory potential.", "Often present in young flower."],
    citations: [],
  },
  {
    id: "myrcene",
    category: "terpene",
    name: "Myrcene",
    aliases: ["β-myrcene"],
    oneLineSummary:
      "Earthy, musky terpene most associated with sedating, 'couch-lock' chemovars.",
    body: ["Also found in mango, hops, and lemongrass.", "May enhance cannabinoid permeability across the BBB (preliminary)."],
    aromaticNotes: ["earthy", "musky", "ripe fruit"],
    reportedEffects: ["sedation", "muscle relaxation"],
    citations: [],
  },
  {
    id: "limonene",
    category: "terpene",
    name: "Limonene",
    aliases: ["d-limonene"],
    oneLineSummary:
      "Bright, citrus-forward terpene most associated with elevated mood.",
    body: ["Used as a flavoring agent and in industrial solvents.", "Studied for anxiolytic and antidepressant effects."],
    aromaticNotes: ["citrus", "lemon zest"],
    reportedEffects: ["mood elevation", "anxiolytic"],
    citations: [],
  },
  {
    id: "pinene",
    category: "terpene",
    name: "Pinene",
    aliases: ["α-pinene", "β-pinene"],
    oneLineSummary:
      "Pine-forward terpene that may counteract THC-induced short-term memory impairment.",
    body: ["Bronchodilator activity in animal models.", "Inhibits acetylcholinesterase — proposed mechanism for cognitive effects."],
    aromaticNotes: ["pine", "rosemary"],
    citations: [],
  },
  {
    id: "linalool",
    category: "terpene",
    name: "Linalool",
    aliases: ["linalol"],
    oneLineSummary:
      "Floral, lavender-like terpene with anxiolytic and sedative profile.",
    body: ["Primary aromatic compound in lavender essential oil."],
    aromaticNotes: ["lavender", "floral"],
    reportedEffects: ["anxiolytic", "sedation"],
    citations: [],
  },
  {
    id: "caryophyllene",
    category: "terpene",
    name: "β-Caryophyllene",
    aliases: ["BCP", "caryophyllene"],
    oneLineSummary:
      "Peppery terpene that uniquely binds CB2 receptors — the only known dietary cannabinoid.",
    body: ["Generally Recognized as Safe (GRAS) by the FDA as a flavoring.", "Studied for anti-inflammatory and analgesic effects via CB2."],
    aromaticNotes: ["pepper", "spice", "clove"],
    reportedEffects: ["anti-inflammatory", "analgesic"],
    citations: [],
  },
  {
    id: "cb1",
    category: "receptor",
    name: "CB1 Receptor",
    aliases: ["CB1"],
    oneLineSummary:
      "G-protein-coupled receptor concentrated in the central nervous system; mediates cannabis's psychoactive effects.",
    body: [
      "Densely expressed in basal ganglia, hippocampus, and cerebellum.",
      "Agonism produces analgesia, sedation, appetite stimulation, and intoxication.",
    ],
    citations: [],
  },
  {
    id: "cb2",
    category: "receptor",
    name: "CB2 Receptor",
    aliases: ["CB2"],
    oneLineSummary:
      "G-protein-coupled receptor concentrated in immune tissue; mediates anti-inflammatory effects without intoxication.",
    body: [
      "Highest expression in spleen, tonsils, and immune cells.",
      "Therapeutic target for inflammation, autoimmunity, and neuropathic pain.",
    ],
    citations: [],
  },
  {
    id: "ecs",
    category: "system",
    name: "Endocannabinoid System",
    aliases: ["ECS"],
    oneLineSummary:
      "Endogenous signaling network of cannabinoid receptors and lipid messengers that regulates homeostasis.",
    body: [
      "Primary endogenous ligands: anandamide (AEA) and 2-arachidonoylglycerol (2-AG).",
      "Modulated by FAAH and MAGL enzymes.",
      "Implicated in mood, pain, appetite, sleep, and immune function.",
    ],
    citations: [],
  },
  {
    id: "dosing-titration",
    category: "dosing",
    name: "Start Low, Go Slow",
    aliases: ["titration", "starting dose"],
    oneLineSummary:
      "Standard cannabis-naïve titration: begin at the lowest effective dose and increase only after a stability window.",
    body: [
      "Typical THC start: 1–2.5 mg oral; reassess after 3–5 days.",
      "Inhaled onset 2–10 min; oral onset 30–120 min — duration drives titration cadence.",
      "Document patient response in the per-product outcome log on every step-up.",
    ],
    citations: [],
  },
  {
    id: "quercetin",
    category: "flavonoid",
    name: "Quercetin",
    aliases: [],
    oneLineSummary: "Flavonoid present in cannabis with antioxidant activity.",
    body: ["Also found in onions, capers, and apples."],
    citations: [],
  },
  {
    id: "cannflavins",
    category: "flavonoid",
    name: "Cannflavins A & B",
    aliases: ["cannflavin"],
    oneLineSummary:
      "Cannabis-specific flavonoids studied for anti-inflammatory effects roughly 30× aspirin in vitro.",
    body: ["Distinct from THC/CBD — non-cannabinoid bioactives."],
    citations: [],
  },
];

/**
 * Substring search across name, aliases, and body. Case-insensitive.
 */
export function searchEducation(query: string, limit = 25): EducationEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return EDUCATION_ENTRIES.slice(0, limit);

  const scored: Array<{ entry: EducationEntry; score: number }> = [];
  for (const entry of EDUCATION_ENTRIES) {
    let score = 0;
    if (entry.name.toLowerCase() === q) score += 100;
    else if (entry.name.toLowerCase().includes(q)) score += 40;
    if (entry.aliases.some((a) => a.toLowerCase() === q)) score += 60;
    else if (entry.aliases.some((a) => a.toLowerCase().includes(q))) score += 20;
    if (entry.oneLineSummary.toLowerCase().includes(q)) score += 5;
    if (entry.body.some((line) => line.toLowerCase().includes(q))) score += 2;
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

export function getEducationEntry(idOrAlias: string): EducationEntry | null {
  const needle = idOrAlias.toLowerCase();
  return (
    EDUCATION_ENTRIES.find(
      (e) =>
        e.id === needle ||
        e.name.toLowerCase() === needle ||
        e.aliases.some((a) => a.toLowerCase() === needle),
    ) ?? null
  );
}

/**
 * Given a free-form claim line description ("CBG tincture 10mg"),
 * return the most relevant compound entry, or null. Used by the
 * appeals agent to attach plain-language education to denial appeals.
 */
export function enrichClaimLine(description: string): EducationEntry | null {
  const lower = description.toLowerCase();
  for (const entry of EDUCATION_ENTRIES) {
    if (lower.includes(entry.name.toLowerCase())) return entry;
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(lower)) return entry;
    }
  }
  return null;
}

export function entriesByCategory(category: CompoundCategory): EducationEntry[] {
  return EDUCATION_ENTRIES.filter((e) => e.category === category);
}

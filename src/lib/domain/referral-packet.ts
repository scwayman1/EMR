/**
 * EMR-078 — AI referral packet curation.
 *
 * Builds a structured "what's pertinent for this referral" bundle from the
 * patient chart. Pure function over Prisma row shapes so it's easy to test
 * and the LLM call (which writes the cover narrative) can be added on top
 * without owning the data assembly.
 *
 * The curation rules are conservative: the relevance scoring favours
 * recall over precision because the receiving specialist would rather
 * skim an extra lab than miss an abnormal that's contextually relevant.
 * The clinician still trims the packet before sending — the AI's job is
 * to give them a draft that's already 80% there.
 */
export type Specialty =
  | "Pain Management"
  | "Neurology"
  | "Psychiatry"
  | "Oncology"
  | "Gastroenterology"
  | "Rheumatology"
  | "Orthopedics"
  | "Physical Therapy"
  | "Behavioral Health"
  | "Palliative Care"
  | "Sleep Medicine"
  | "Endocrinology"
  | "Cardiology"
  | "Pulmonology"
  | "Dermatology"
  | "Primary Care"
  | "Addiction Medicine"
  | "Integrative Medicine"
  | "Acupuncture"
  | "Nutrition/Dietetics";

interface IcdRow {
  code: string;
  label: string;
}

/**
 * Per-specialty hints — which ICD-10 prefixes, lab names, and document
 * categories matter to this kind of consultant. Used as an additive
 * boost on top of the base "recent + abnormal" relevance signal.
 */
const SPECIALTY_HINTS: Record<
  Specialty,
  {
    icdPrefixes: string[];
    labKeywords: string[];
    /** Matches the DocumentKind enum (note | lab | image | diagnosis | letter | other). */
    docCategories: string[];
  }
> = {
  "Pain Management": {
    icdPrefixes: ["M", "G89", "G56", "S", "T"],
    labKeywords: ["CRP", "ESR", "RF", "uric"],
    docCategories: ["image", "diagnosis"],
  },
  Neurology: {
    icdPrefixes: ["G", "R51", "R55", "F03", "I63"],
    labKeywords: ["B12", "TSH", "homocysteine", "MRI"],
    docCategories: ["image", "diagnosis"],
  },
  Psychiatry: {
    icdPrefixes: ["F"],
    labKeywords: ["TSH", "B12", "drug screen"],
    docCategories: ["note", "diagnosis"],
  },
  Oncology: {
    icdPrefixes: ["C", "D0", "D1", "D2", "D3", "D4"],
    labKeywords: ["CBC", "CMP", "PSA", "CEA", "CA-125", "tumor"],
    docCategories: ["image", "diagnosis", "lab"],
  },
  Gastroenterology: {
    icdPrefixes: ["K", "R10", "R19", "B18"],
    labKeywords: ["AST", "ALT", "lipase", "amylase", "H. pylori"],
    docCategories: ["image", "lab"],
  },
  Rheumatology: {
    icdPrefixes: ["M", "L93", "L94"],
    labKeywords: ["ANA", "RF", "anti-CCP", "ESR", "CRP", "complement"],
    docCategories: ["image", "lab"],
  },
  Orthopedics: {
    icdPrefixes: ["M", "S", "T"],
    labKeywords: ["vitamin D", "calcium"],
    docCategories: ["image", "diagnosis"],
  },
  "Physical Therapy": {
    icdPrefixes: ["M", "S", "G56"],
    labKeywords: [],
    docCategories: ["image", "diagnosis"],
  },
  "Behavioral Health": {
    icdPrefixes: ["F"],
    labKeywords: ["TSH", "drug screen"],
    docCategories: ["note", "diagnosis"],
  },
  "Palliative Care": {
    icdPrefixes: ["C", "Z51", "G89", "R52"],
    labKeywords: ["CBC", "CMP"],
    docCategories: ["image", "diagnosis", "letter"],
  },
  "Sleep Medicine": {
    icdPrefixes: ["G47", "F51", "R06.83"],
    labKeywords: ["TSH", "ferritin"],
    docCategories: ["diagnosis"],
  },
  Endocrinology: {
    icdPrefixes: ["E"],
    labKeywords: ["A1c", "glucose", "TSH", "T4", "T3", "cortisol", "lipid"],
    docCategories: ["lab"],
  },
  Cardiology: {
    icdPrefixes: ["I"],
    labKeywords: ["lipid", "troponin", "BNP", "potassium", "creatinine"],
    docCategories: ["image", "diagnosis"],
  },
  Pulmonology: {
    icdPrefixes: ["J"],
    labKeywords: ["CBC", "CO2"],
    docCategories: ["image", "diagnosis"],
  },
  Dermatology: {
    icdPrefixes: ["L"],
    labKeywords: [],
    docCategories: ["image", "diagnosis"],
  },
  "Primary Care": {
    icdPrefixes: [],
    labKeywords: ["CBC", "CMP", "lipid", "A1c", "TSH"],
    docCategories: ["lab", "image", "note"],
  },
  "Addiction Medicine": {
    icdPrefixes: ["F1"],
    labKeywords: ["drug screen", "AST", "ALT", "CDT"],
    docCategories: ["note", "lab"],
  },
  "Integrative Medicine": {
    icdPrefixes: [],
    labKeywords: ["vitamin D", "B12", "CBC", "CMP"],
    docCategories: ["lab", "note"],
  },
  Acupuncture: {
    icdPrefixes: ["M", "G", "F"],
    labKeywords: [],
    docCategories: [],
  },
  "Nutrition/Dietetics": {
    icdPrefixes: ["E", "K", "Z71"],
    labKeywords: ["A1c", "lipid", "vitamin D", "ferritin"],
    docCategories: ["lab"],
  },
};

export interface ProblemRow {
  code: string;
  label: string;
  /** ISO date the problem was added; controls recency boost. */
  onsetIso?: string | null;
}

export interface MedicationRow {
  name: string;
  dosage: string | null;
  /** Whether this med is currently active. */
  active: boolean;
}

export interface LabRow {
  id: string;
  testName: string;
  resultedAtIso: string;
  abnormalFlag: boolean;
  /** Optional snippet — e.g. "Hgb 9.1 (L)". Already-formatted display value. */
  summary: string | null;
}

export interface NoteRow {
  id: string;
  authorName: string;
  finalizedAtIso: string;
  /** First-line preview, ~140 chars. */
  preview: string;
}

export interface DocRow {
  id: string;
  filename: string;
  category: string | null;
  uploadedAtIso: string;
}

export interface ReferralPacketInput {
  specialty: Specialty;
  reason: string;
  problems: ProblemRow[];
  medications: MedicationRow[];
  labs: LabRow[];
  notes: NoteRow[];
  documents: DocRow[];
}

export interface PacketLine {
  id: string;
  /** Why we picked this row — surfaced to the clinician for review. */
  rationale: string;
  /** 0–100 — drives sort order in the packet review UI. */
  score: number;
}

export interface ReferralPacket {
  problems: PacketLine[];
  medications: PacketLine[];
  labs: PacketLine[];
  notes: PacketLine[];
  documents: PacketLine[];
  /**
   * Plain-text summary tailored to the receiving specialist. Built from a
   * deterministic template by default — server actions can replace this
   * with an LLM-generated version when the model client is available.
   */
  summary: string;
}

const NOW_MS = () => Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

function recencyBoost(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 0;
  const days = (NOW_MS() - ms) / DAY_MS;
  if (days < 7) return 35;
  if (days < 30) return 22;
  if (days < 90) return 14;
  if (days < 365) return 6;
  return 0;
}

function reasonOverlap(text: string, reason: string): number {
  const tokens = new Set(
    reason
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 4),
  );
  if (tokens.size === 0) return 0;
  let hits = 0;
  for (const t of tokens) if (text.toLowerCase().includes(t)) hits++;
  return Math.min(20, hits * 6);
}

/**
 * Curate the packet. Pure / deterministic — the LLM-generated cover
 * narrative is layered on by the server action. Higher score = more
 * pertinent. The clinician sees the rationale for every selected row.
 */
export function curatePacket(input: ReferralPacketInput): ReferralPacket {
  const hints = SPECIALTY_HINTS[input.specialty] ?? {
    icdPrefixes: [],
    labKeywords: [],
    docCategories: [],
  };

  const problems = input.problems
    .map((p) => {
      let score = 25 + recencyBoost(p.onsetIso ?? null);
      if (hints.icdPrefixes.some((pref) => p.code.startsWith(pref))) score += 35;
      score += reasonOverlap(p.label, input.reason);
      const rationale =
        hints.icdPrefixes.some((pref) => p.code.startsWith(pref))
          ? `${input.specialty}-relevant ICD prefix`
          : "active problem on chart";
      return { id: p.code, rationale, score };
    })
    .filter((line) => line.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const medications = input.medications
    .filter((m) => m.active)
    .map((m) => ({
      id: m.name,
      rationale: `Active ${m.dosage ? `(${m.dosage}) ` : ""}— give the consultant the live med list`,
      score: 60 + reasonOverlap(m.name, input.reason),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const labs = input.labs
    .map((l) => {
      let score = recencyBoost(l.resultedAtIso);
      if (l.abnormalFlag) score += 30;
      if (hints.labKeywords.some((kw) => l.testName.toLowerCase().includes(kw.toLowerCase()))) {
        score += 35;
      }
      score += reasonOverlap(l.testName + " " + (l.summary ?? ""), input.reason);
      const rationale = l.abnormalFlag
        ? "abnormal lab"
        : hints.labKeywords.some((kw) => l.testName.toLowerCase().includes(kw.toLowerCase()))
          ? `${input.specialty}-relevant test`
          : "recent result";
      return { id: l.id, rationale, score };
    })
    .filter((line) => line.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const notes = input.notes
    .map((n) => ({
      id: n.id,
      rationale: `note finalized ${formatRel(n.finalizedAtIso)} by ${n.authorName}`,
      score: recencyBoost(n.finalizedAtIso) + reasonOverlap(n.preview, input.reason) + 20,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const documents = input.documents
    .map((d) => {
      let score = recencyBoost(d.uploadedAtIso);
      if (d.category && hints.docCategories.includes(d.category)) score += 40;
      score += reasonOverlap(d.filename, input.reason);
      const rationale =
        d.category && hints.docCategories.includes(d.category)
          ? `${d.category.replace("_", " ")} matters to ${input.specialty}`
          : "recent upload";
      return { id: d.id, rationale, score };
    })
    .filter((line) => line.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const summary = buildSummary(input, { problems, medications, labs });

  return { problems, medications, labs, notes, documents, summary };
}

function buildSummary(
  input: ReferralPacketInput,
  picks: Pick<ReferralPacket, "problems" | "medications" | "labs">,
): string {
  const problemList = picks.problems.length
    ? picks.problems
        .slice(0, 4)
        .map((p) => p.id)
        .join(", ")
    : "none flagged";
  const medCount = picks.medications.length;
  const abnormalLabs = picks.labs.length;
  return [
    `${input.specialty} referral packet — auto-curated draft.`,
    "",
    `Reason: ${input.reason}`,
    "",
    `Problems forwarded: ${problemList}.`,
    `Active medication list: ${medCount} entries selected (cannabis + conventional).`,
    `Lab summaries: ${abnormalLabs} result${abnormalLabs === 1 ? "" : "s"} pulled (abnormals + ${input.specialty}-relevant tests).`,
    "",
    "Clinician: review and trim before sending. Every row carries a rationale so you can defend the inclusion.",
  ].join("\n");
}

function formatRel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "recently";
  const days = Math.floor((NOW_MS() - ms) / DAY_MS);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

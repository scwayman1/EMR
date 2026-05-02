/**
 * Endocannabinoid system labwork (EMR-099)
 * ----------------------------------------
 * The endocannabinoid system (ECS) doesn't have a clinical "off-the-
 * shelf" lab panel the way thyroid or lipids do. This module gathers
 * the analytes that show up in research workups, defines reference
 * ranges where the literature has converged, and gives the chart a
 * pure-function interpreter that maps a raw result into a flag plus a
 * plain-language note.
 *
 * Use cases:
 *   - Decide whether a borderline anandamide level deserves a follow-up
 *     order (research clinic).
 *   - Translate FAAH genotype results into clinical guidance for THC
 *     dosing.
 *   - Generate the lab summary section in the cannabis intake note.
 *
 * No prisma imports — pure logic, easy to unit test, easy to ship to
 * the patient's lab review screen and the clinician sign-off pipeline.
 */

export type EcsAnalyteId =
  | "anandamide"
  | "2_ag"
  | "palmitoylethanolamide"
  | "oleoylethanolamide"
  | "faah_activity"
  | "monoacylglycerol_lipase"
  | "cb1_receptor_density_pet"
  | "cb2_receptor_pbmc_mrna"
  | "faah_385_genotype"
  | "cnr1_3813_genotype";

export type EcsCategory = "endocannabinoid" | "enzyme" | "imaging" | "genotype" | "receptor";

export interface EcsAnalyte {
  id: EcsAnalyteId;
  name: string;
  category: EcsCategory;
  /** Specimen the lab needs. Drives the order panel selection. */
  specimen: "serum" | "plasma" | "PBMC" | "whole_blood" | "saliva" | "PET_scan";
  /** Common lab unit. */
  unit: string;
  /** Reference range — `null` for endpoints with no established range. */
  reference: { low: number | null; high: number | null } | null;
  /** What clinicians look for; one short paragraph. */
  clinicalNote: string;
  /** Plain-language summary surfaced to patients in their portal. */
  patientNote: string;
  /** LOINC code where one exists; otherwise null. */
  loinc: string | null;
}

export const ECS_PANEL: EcsAnalyte[] = [
  {
    id: "anandamide",
    name: "Anandamide (AEA)",
    category: "endocannabinoid",
    specimen: "plasma",
    unit: "nmol/L",
    reference: { low: 0.5, high: 3.0 },
    clinicalNote:
      "Endogenous CB1 ligand. Low levels correlate with stress and chronic pain phenotypes; very high levels can suggest FAAH deficiency. Diurnal — draw fasting AM.",
    patientNote:
      "Anandamide is one of your body's natural cannabis-like signals. Think of it as a built-in calming chemical.",
    loinc: null,
  },
  {
    id: "2_ag",
    name: "2-Arachidonoylglycerol (2-AG)",
    category: "endocannabinoid",
    specimen: "plasma",
    unit: "nmol/L",
    reference: { low: 1.0, high: 10.0 },
    clinicalNote:
      "Most abundant endocannabinoid; binds CB1 and CB2. Elevations follow exercise; persistent elevation may indicate chronic inflammation.",
    patientNote:
      "2-AG is the most common endocannabinoid in your body. Levels can rise after exercise.",
    loinc: null,
  },
  {
    id: "palmitoylethanolamide",
    name: "Palmitoylethanolamide (PEA)",
    category: "endocannabinoid",
    specimen: "plasma",
    unit: "nmol/L",
    reference: { low: 5.0, high: 20.0 },
    clinicalNote:
      "Endocannabinoid-like molecule with PPAR-α activity; modulates pain and inflammation. Low PEA correlates with neuropathic pain in early studies.",
    patientNote: "PEA helps your body manage inflammation and pain naturally.",
    loinc: null,
  },
  {
    id: "oleoylethanolamide",
    name: "Oleoylethanolamide (OEA)",
    category: "endocannabinoid",
    specimen: "plasma",
    unit: "nmol/L",
    reference: { low: 1.0, high: 8.0 },
    clinicalNote:
      "Satiety-related endocannabinoid analog; PPAR-α agonist. Low fasting OEA seen in obesity cohorts.",
    patientNote: "OEA is involved in how full you feel after meals.",
    loinc: null,
  },
  {
    id: "faah_activity",
    name: "FAAH activity",
    category: "enzyme",
    specimen: "PBMC",
    unit: "pmol/min/mg",
    reference: { low: 30, high: 120 },
    clinicalNote:
      "Fatty acid amide hydrolase breaks down anandamide. High activity = low anandamide and is associated with anxiety phenotypes.",
    patientNote:
      "FAAH is the enzyme that breaks down anandamide. High activity can mean lower natural anandamide.",
    loinc: null,
  },
  {
    id: "monoacylglycerol_lipase",
    name: "Monoacylglycerol lipase (MAGL)",
    category: "enzyme",
    specimen: "PBMC",
    unit: "pmol/min/mg",
    reference: { low: 40, high: 180 },
    clinicalNote:
      "Primary catabolic enzyme for 2-AG. Elevated MAGL is observed in some chronic pain conditions.",
    patientNote:
      "MAGL controls how quickly 2-AG is broken down. Affects how long endocannabinoid signaling lasts.",
    loinc: null,
  },
  {
    id: "cb1_receptor_density_pet",
    name: "CB1 receptor density (PET imaging)",
    category: "imaging",
    specimen: "PET_scan",
    unit: "VT",
    reference: { low: 4, high: 12 },
    clinicalNote:
      "Quantitative CB1 receptor distribution volume from PET ligand binding. Reduced binding has been observed in heavy chronic THC users; may recover with abstinence.",
    patientNote:
      "A specialized brain scan that measures how many cannabis receptors are active in the brain.",
    loinc: null,
  },
  {
    id: "cb2_receptor_pbmc_mrna",
    name: "CB2 receptor mRNA (PBMC)",
    category: "receptor",
    specimen: "PBMC",
    unit: "fold expression",
    reference: { low: 0.5, high: 2.5 },
    clinicalNote:
      "CB2 receptor expression in peripheral blood mononuclear cells. Elevated in active inflammatory conditions.",
    patientNote: "Measures how strongly the immune system is using cannabis-related signaling.",
    loinc: null,
  },
  {
    id: "faah_385_genotype",
    name: "FAAH C385A genotype",
    category: "genotype",
    specimen: "saliva",
    unit: "genotype",
    reference: null,
    clinicalNote:
      "Variant A/A reduces FAAH activity → higher endogenous anandamide; associated with lower trait anxiety. May tolerate higher THC doses.",
    patientNote:
      "A genetic test that tells us how quickly your body breaks down its own cannabis-like signals.",
    loinc: null,
  },
  {
    id: "cnr1_3813_genotype",
    name: "CNR1 rs2023239 genotype",
    category: "genotype",
    specimen: "saliva",
    unit: "genotype",
    reference: null,
    clinicalNote:
      "C-allele carriers show altered CB1 expression; some studies link to reward-circuit response and BMI.",
    patientNote:
      "A gene variant that affects how your body's main cannabis receptor is expressed.",
    loinc: null,
  },
];

export type EcsFlag = "low" | "in_range" | "high" | "no_range";

export interface EcsResult {
  analyteId: EcsAnalyteId;
  /** Numeric for analytes with a range; raw string for genotypes. */
  value: number | string;
  collectedAt: Date;
}

export interface InterpretedEcsResult extends EcsResult {
  analyte: EcsAnalyte;
  flag: EcsFlag;
  /** "Low" | "Normal" | "High" | "Reported" — short label for tables. */
  flagLabel: string;
  clinicalSummary: string;
  patientSummary: string;
}

const GENOTYPE_GUIDANCE: Partial<Record<EcsAnalyteId, Record<string, string>>> = {
  faah_385_genotype: {
    "CC": "Wild-type FAAH activity. Standard dosing applies.",
    "CA": "Heterozygous; mildly reduced FAAH activity. Start at 75% of standard THC dose; titrate by response.",
    "AA": "Reduced FAAH activity → elevated endogenous anandamide. Patients often need lower THC; consider 50% start dose.",
  },
  cnr1_3813_genotype: {
    "TT": "Reference allele. No specific guidance.",
    "TC": "Heterozygous C-allele carrier. Monitor reward-cycle response; counsel on appetite changes.",
    "CC": "C-allele homozygous. Counsel on heightened appetite/reward response; revisit BMI plan.",
  },
};

/** Apply reference ranges and produce a flag + summaries. */
export function interpretEcsResult(result: EcsResult): InterpretedEcsResult {
  const analyte = ECS_PANEL.find((a) => a.id === result.analyteId);
  if (!analyte) {
    throw new Error(`unknown_analyte:${result.analyteId}`);
  }

  // Genotype path — string value, no range.
  if (analyte.category === "genotype" && typeof result.value === "string") {
    const guidance = GENOTYPE_GUIDANCE[result.analyteId]?.[result.value];
    return {
      ...result,
      analyte,
      flag: "no_range",
      flagLabel: "Reported",
      clinicalSummary: guidance ?? `Variant ${result.value} reported; consult literature.`,
      patientSummary: analyte.patientNote,
    };
  }

  if (typeof result.value !== "number" || !analyte.reference) {
    return {
      ...result,
      analyte,
      flag: "no_range",
      flagLabel: "Reported",
      clinicalSummary: analyte.clinicalNote,
      patientSummary: analyte.patientNote,
    };
  }

  let flag: EcsFlag = "in_range";
  let flagLabel = "Normal";
  if (analyte.reference.low !== null && result.value < analyte.reference.low) {
    flag = "low";
    flagLabel = "Low";
  } else if (analyte.reference.high !== null && result.value > analyte.reference.high) {
    flag = "high";
    flagLabel = "High";
  }

  let clinicalSummary = analyte.clinicalNote;
  if (flag === "low") {
    clinicalSummary = `Low ${analyte.name} (${result.value} ${analyte.unit}, ref ${analyte.reference.low}-${analyte.reference.high}). ${analyte.clinicalNote}`;
  } else if (flag === "high") {
    clinicalSummary = `Elevated ${analyte.name} (${result.value} ${analyte.unit}, ref ${analyte.reference.low}-${analyte.reference.high}). ${analyte.clinicalNote}`;
  }

  return {
    ...result,
    analyte,
    flag,
    flagLabel,
    clinicalSummary,
    patientSummary: analyte.patientNote,
  };
}

export interface EcsPanelSummary {
  collectedAt: Date | null;
  totalAnalytes: number;
  abnormal: number;
  results: InterpretedEcsResult[];
  /** Coalesced clinical narrative for the chart note. */
  narrative: string;
}

/** Run the interpreter over a full panel. Returns counts + a chart-note narrative. */
export function summarizeEcsPanel(results: EcsResult[]): EcsPanelSummary {
  const interpreted = results.map(interpretEcsResult);
  const abnormal = interpreted.filter((r) => r.flag === "low" || r.flag === "high").length;
  const collectedAt =
    interpreted.length === 0
      ? null
      : interpreted.reduce<Date | null>((acc, r) => {
          if (!acc || r.collectedAt > acc) return r.collectedAt;
          return acc;
        }, null);

  const lines: string[] = [];
  for (const r of interpreted) {
    if (r.flag === "low" || r.flag === "high") {
      lines.push(`• ${r.analyte.name}: ${r.flagLabel} — ${r.value} ${r.analyte.unit}.`);
    } else if (r.flag === "no_range" && r.analyte.category === "genotype") {
      lines.push(`• ${r.analyte.name}: ${r.value}. ${r.clinicalSummary}`);
    }
  }
  const narrative =
    lines.length === 0
      ? "ECS panel within reference ranges; no genotype-specific guidance triggered."
      : `ECS panel review:\n${lines.join("\n")}`;

  return {
    collectedAt,
    totalAnalytes: interpreted.length,
    abnormal,
    results: interpreted,
    narrative,
  };
}

/**
 * Helper for the Cannabis Rx flow: given a FAAH C385A genotype, emit
 * a recommended THC dose multiplier (1.0 = standard).
 */
export function thcStartDoseMultiplierFromFaahGenotype(
  genotype: string,
): number {
  switch (genotype) {
    case "AA":
      return 0.5;
    case "CA":
      return 0.75;
    case "CC":
    default:
      return 1.0;
  }
}

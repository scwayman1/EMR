// EMR-067 — Lab vendor catalog (Quest, LabCorp).
//
// Searchable test catalog covering the labs Dr. Patel called out
// (CMP, CBC, Lipid, A1C, etc.) plus the cannabis-relevant panels we
// already had. Each test carries:
//   - vendorCode: the partner's catalog identifier (Quest or LabCorp)
//   - aliases: free-text aliases so the search box matches "lipid",
//     "cholesterol", "lipid panel" interchangeably
//   - critical thresholds (when known) for the auto-notify flow
//
// Catalog is intentionally hand-curated — full Quest and LabCorp menus
// have ~3,000 items each and ship behind partner agreements. Production
// should ingest the partner manifests via /api/labs/catalog/sync.

export type LabVendor = "quest" | "labcorp";
export type LabSpecimen = "blood" | "urine" | "swab" | "stool" | "saliva";
export type LabCategory =
  | "Chemistry"
  | "Hematology"
  | "Endocrine"
  | "Inflammation"
  | "Cardiac"
  | "Toxicology"
  | "Cannabis"
  | "Coag"
  | "Urine"
  | "Infectious"
  | "Vitamins";

export interface LabVendorTest {
  /** Stable internal identifier — survives vendor renames. */
  code: string;
  name: string;
  category: LabCategory;
  vendorCodes: { quest?: string; labcorp?: string };
  aliases: string[];
  fasting?: boolean;
  specimen: LabSpecimen;
  /** Common ICD-10 codes that justify ordering this test. */
  commonIcd10: string[];
  /** Critical-value bounds (numeric tests only). */
  critical?: { lowBelow?: number; highAbove?: number; unit?: string };
}

export const LAB_VENDOR_CATALOG: LabVendorTest[] = [
  {
    code: "CMP",
    name: "Comprehensive Metabolic Panel",
    category: "Chemistry",
    vendorCodes: { quest: "10231", labcorp: "322000" },
    aliases: ["cmp", "metabolic panel", "chem 14", "basic chemistry"],
    fasting: true,
    specimen: "blood",
    commonIcd10: ["E11.9", "I10", "Z00.00"],
  },
  {
    code: "BMP",
    name: "Basic Metabolic Panel",
    category: "Chemistry",
    vendorCodes: { quest: "10165", labcorp: "322758" },
    aliases: ["bmp", "chem 7", "basic chem"],
    fasting: true,
    specimen: "blood",
    commonIcd10: ["I10", "E11.9", "N18.9"],
  },
  {
    code: "CBC",
    name: "Complete Blood Count with Differential",
    category: "Hematology",
    vendorCodes: { quest: "6399", labcorp: "005009" },
    aliases: ["cbc", "blood count", "hemogram"],
    specimen: "blood",
    commonIcd10: ["D64.9", "Z00.00", "R50.9"],
  },
  {
    code: "LIPID",
    name: "Lipid Panel",
    category: "Chemistry",
    vendorCodes: { quest: "7600", labcorp: "303756" },
    aliases: ["lipid", "cholesterol", "lipid panel", "ldl", "hdl"],
    fasting: true,
    specimen: "blood",
    commonIcd10: ["E78.00", "E78.5", "I10"],
  },
  {
    code: "A1C",
    name: "Hemoglobin A1c",
    category: "Endocrine",
    vendorCodes: { quest: "496", labcorp: "001453" },
    aliases: ["a1c", "hba1c", "glycated hemoglobin", "hemoglobin a1c"],
    specimen: "blood",
    commonIcd10: ["E11.9", "E11.65", "R73.03"],
    critical: { highAbove: 14, unit: "%" },
  },
  {
    code: "TSH",
    name: "Thyroid Stimulating Hormone",
    category: "Endocrine",
    vendorCodes: { quest: "899", labcorp: "004259" },
    aliases: ["tsh", "thyroid"],
    specimen: "blood",
    commonIcd10: ["E03.9", "E05.90", "Z00.00"],
  },
  {
    code: "T4F",
    name: "Free T4",
    category: "Endocrine",
    vendorCodes: { quest: "866", labcorp: "001974" },
    aliases: ["t4", "free t4", "thyroxine"],
    specimen: "blood",
    commonIcd10: ["E03.9", "E05.90"],
  },
  {
    code: "VITD",
    name: "Vitamin D, 25-Hydroxy",
    category: "Vitamins",
    vendorCodes: { quest: "17306", labcorp: "081950" },
    aliases: ["vitamin d", "vit d", "25-oh"],
    specimen: "blood",
    commonIcd10: ["E55.9", "M81.0"],
  },
  {
    code: "LFT",
    name: "Liver Function Tests (AST, ALT, ALP, Bili, Albumin)",
    category: "Chemistry",
    vendorCodes: { quest: "10256", labcorp: "322758" },
    aliases: ["lft", "liver", "hepatic", "ast", "alt"],
    specimen: "blood",
    commonIcd10: ["K76.0", "Z79.899", "K70.30"],
    critical: { highAbove: 1000, unit: "U/L" },
  },
  {
    code: "GGT",
    name: "Gamma-Glutamyl Transferase",
    category: "Chemistry",
    vendorCodes: { quest: "10256", labcorp: "001958" },
    aliases: ["ggt"],
    specimen: "blood",
    commonIcd10: ["K76.0", "Z79.899"],
  },
  {
    code: "CRP-HS",
    name: "C-Reactive Protein, High-Sensitivity",
    category: "Inflammation",
    vendorCodes: { quest: "10124", labcorp: "120766" },
    aliases: ["crp", "hscrp", "c-reactive protein", "inflammation"],
    specimen: "blood",
    commonIcd10: ["M79.10", "Z00.00"],
  },
  {
    code: "TROPI",
    name: "Troponin I, High-Sensitivity",
    category: "Cardiac",
    vendorCodes: { quest: "37640", labcorp: "143560" },
    aliases: ["troponin", "trop", "cardiac"],
    specimen: "blood",
    commonIcd10: ["I20.9", "I21.9", "R07.9"],
    critical: { highAbove: 0.04, unit: "ng/mL" },
  },
  {
    code: "BNP",
    name: "B-Type Natriuretic Peptide",
    category: "Cardiac",
    vendorCodes: { quest: "10306", labcorp: "140459" },
    aliases: ["bnp"],
    specimen: "blood",
    commonIcd10: ["I50.9", "I11.0"],
    critical: { highAbove: 400, unit: "pg/mL" },
  },
  {
    code: "UA",
    name: "Urinalysis with Reflex Microscopy",
    category: "Urine",
    vendorCodes: { quest: "5463", labcorp: "003038" },
    aliases: ["ua", "urinalysis"],
    specimen: "urine",
    commonIcd10: ["N39.0", "Z00.00"],
  },
  {
    code: "UDS-12",
    name: "Urine Drug Screen, 12-Panel",
    category: "Toxicology",
    vendorCodes: { quest: "21001", labcorp: "791000" },
    aliases: ["uds", "drug screen", "tox screen"],
    specimen: "urine",
    commonIcd10: ["F19.20", "Z79.899"],
  },
  {
    code: "PT-INR",
    name: "Prothrombin Time / INR",
    category: "Coag",
    vendorCodes: { quest: "8847", labcorp: "015610" },
    aliases: ["pt", "inr", "coag", "warfarin"],
    specimen: "blood",
    commonIcd10: ["Z79.01", "I48.91"],
    critical: { highAbove: 5, unit: "" },
  },
  {
    code: "THC-Q",
    name: "THC Quantitative (Serum)",
    category: "Cannabis",
    vendorCodes: { quest: "37672", labcorp: "718624" },
    aliases: ["thc", "thc quantitative", "cannabis level"],
    specimen: "blood",
    commonIcd10: ["F12.10", "Z79.899"],
  },
  {
    code: "CBD-Q",
    name: "CBD Quantitative (Serum)",
    category: "Cannabis",
    vendorCodes: { quest: "37674", labcorp: "718635" },
    aliases: ["cbd", "cbd quantitative"],
    specimen: "blood",
    commonIcd10: ["Z79.899"],
  },
  {
    code: "FERR",
    name: "Ferritin",
    category: "Hematology",
    vendorCodes: { quest: "457", labcorp: "004598" },
    aliases: ["ferritin", "iron storage"],
    specimen: "blood",
    commonIcd10: ["D50.9", "E83.110"],
    critical: { lowBelow: 10, unit: "ng/mL" },
  },
  {
    code: "B12",
    name: "Vitamin B12",
    category: "Vitamins",
    vendorCodes: { quest: "873", labcorp: "001503" },
    aliases: ["b12", "cobalamin"],
    specimen: "blood",
    commonIcd10: ["D51.0", "E53.8"],
  },
];

/** Searchable lab "favorites" — clinicians' frequent multi-test bundles. */
export interface LabFavorite {
  id: string;
  label: string;
  description?: string;
  testCodes: string[];
  diagnoses: string[];
}

export const DEFAULT_LAB_FAVORITES: LabFavorite[] = [
  {
    id: "fav_normal_followup",
    label: "Normal follow-up",
    description: "Annual chronic-disease check (HLD, T2DM, HTN)",
    testCodes: ["CMP", "CBC", "LIPID", "A1C", "GGT"],
    diagnoses: ["E78.00", "E11.9", "Z79.899", "I10"],
  },
  {
    id: "fav_cannabis_baseline",
    label: "Cannabis baseline",
    description: "Pre-prescribing baseline before initiating medical cannabis",
    testCodes: ["CMP", "CBC", "LFT", "TSH"],
    diagnoses: ["F41.1", "G47.00", "M79.10"],
  },
  {
    id: "fav_chest_pain",
    label: "Chest pain workup",
    description: "Stat: troponin, CMP, BNP, CBC for ED transfers",
    testCodes: ["TROPI", "CMP", "BNP", "CBC"],
    diagnoses: ["R07.9", "I20.9"],
  },
];

export function searchLabCatalog(query: string): LabVendorTest[] {
  const q = query.trim().toLowerCase();
  if (!q) return LAB_VENDOR_CATALOG.slice(0, 12);
  return LAB_VENDOR_CATALOG.filter((t) => {
    const hay = [t.code, t.name, t.category, ...t.aliases]
      .join("|")
      .toLowerCase();
    return hay.includes(q);
  });
}

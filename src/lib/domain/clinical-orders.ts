// Lab and imaging orders — order entry domain

export type OrderType = "lab" | "imaging" | "procedure";
export type OrderStatus = "draft" | "pending" | "collected" | "resulted" | "cancelled";

export interface ClinicalOrder {
  id: string;
  type: OrderType;
  code: string;
  name: string;
  patientId: string;
  encounterId?: string;
  providerId?: string;
  status: OrderStatus;
  priority: "stat" | "routine" | "asap";
  reason?: string;
  icd10Codes: string[];
  instructions?: string;
  orderedAt: string;
  collectedAt?: string;
  resultedAt?: string;
}

// Common cannabis-relevant lab panels
export const LAB_CATALOG = [
  { code: "CMP", name: "Comprehensive Metabolic Panel", category: "Chemistry", fasting: true },
  { code: "CBC", name: "Complete Blood Count", category: "Hematology", fasting: false },
  { code: "LFT", name: "Liver Function Tests (AST, ALT, Alk Phos, Bilirubin)", category: "Chemistry", fasting: false },
  { code: "Lipid", name: "Lipid Panel", category: "Chemistry", fasting: true },
  { code: "HbA1c", name: "Hemoglobin A1c", category: "Chemistry", fasting: false },
  { code: "TSH", name: "Thyroid Stimulating Hormone", category: "Endocrine", fasting: false },
  { code: "Vit-D", name: "Vitamin D, 25-Hydroxy", category: "Chemistry", fasting: false },
  { code: "CRP", name: "C-Reactive Protein", category: "Inflammation", fasting: false },
  { code: "UA", name: "Urinalysis", category: "Urine", fasting: false },
  { code: "UDS", name: "Urine Drug Screen", category: "Toxicology", fasting: false },
  { code: "THC-Q", name: "THC Quantitative (serum)", category: "Cannabis", fasting: false },
  { code: "CBD-Q", name: "CBD Quantitative (serum)", category: "Cannabis", fasting: false },
  { code: "PT-INR", name: "Prothrombin Time / INR", category: "Coag", fasting: false },
];

export const IMAGING_CATALOG = [
  { code: "CXR", name: "Chest X-ray, 2 views", modality: "X-ray" },
  { code: "MRI-brain", name: "MRI Brain with and without contrast", modality: "MRI" },
  { code: "MRI-spine", name: "MRI Lumbar Spine", modality: "MRI" },
  { code: "CT-abd", name: "CT Abdomen and Pelvis with contrast", modality: "CT" },
  { code: "US-abd", name: "Ultrasound Abdomen", modality: "US" },
  { code: "DEXA", name: "Bone Density (DEXA)", modality: "DEXA" },
];

export const ORDER_STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  pending: { bg: "bg-blue-50", text: "text-blue-700", label: "Pending" },
  collected: { bg: "bg-purple-50", text: "text-purple-700", label: "Collected" },
  resulted: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Resulted" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
};

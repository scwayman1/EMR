/**
 * Medical Imaging Domain — EMR-014, EMR-140, EMR-141, EMR-164, EMR-166
 *
 * Self-contained imaging model used by the new Imaging Lab routes
 * (provider workbench + patient portal viewer). Lives outside the existing
 * Document / Prisma model on purpose so this track can ship without a
 * migration and without colliding with the records/document storage being
 * touched in other tracks.
 *
 * Persistence is in-memory: studies, annotations, and reports survive only
 * for the life of the Node process. The shape mirrors what a real PACS
 * adapter would expose, so the swap to durable storage is a one-file change
 * (replace the Map-backed store with Prisma calls; the API contract stays).
 */

export type Modality = "CT" | "MR" | "XR" | "US" | "PT" | "MG" | "NM";

export type StudyStatus =
  | "uploaded" // raw files received, awaiting read
  | "in_review" // radiologist actively reading
  | "preliminary" // wet read posted, attending review pending
  | "final" // signed final report
  | "addendum"; // amended after final

export type ReportSeverity = "normal" | "minor" | "significant" | "critical";

export interface ImagingSeries {
  /** Stable id (e.g. SeriesInstanceUID in real DICOM). */
  id: string;
  description: string;
  /** Number of synthetic frames the viewer will render. */
  frameCount: number;
  /** Slice thickness in mm — surfaced in the viewer overlay. */
  sliceThickness?: number;
  /** Optional acquired body orientation hint. */
  orientation?: "axial" | "sagittal" | "coronal";
}

export interface ImagingStudy {
  id: string;
  patientId: string;
  modality: Modality;
  description: string;
  bodyPart: string;
  studyDate: string; // ISO yyyy-mm-dd
  status: StudyStatus;
  /** Display name of the ordering provider — denormalized for the demo. */
  orderingProviderName?: string;
  /** Display name of the assigned reader. */
  radiologistName?: string;
  series: ImagingSeries[];
  /** Free-text clinical indication the order carried in. */
  indication?: string;
}

export type AnnotationShape =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "text"; x: number; y: number };

export interface ImagingAnnotation {
  id: string;
  studyId: string;
  seriesId: string;
  /** Frame index the annotation is anchored to. */
  frame: number;
  shape: AnnotationShape;
  /** Author label (provider initials, name, or "Radiologist"). */
  author: string;
  /** Whether the annotation is visible in the patient portal. */
  patientVisible: boolean;
  /** Optional clinical note attached to the annotation. */
  note?: string;
  /** Severity colors the marker — never patient-visible if `critical`. */
  severity: ReportSeverity;
  createdAt: string; // ISO timestamp
}

export interface RadiologyReport {
  id: string;
  studyId: string;
  /** Plain-language summary surfaced to patients. */
  patientSummary: string;
  findings: string;
  impression: string;
  recommendation?: string;
  severity: ReportSeverity;
  signedBy?: string;
  signedAt?: string; // ISO timestamp
  createdAt: string;
  /** Whether the patient can see this report yet (set after provider sign-off). */
  releasedToPatient: boolean;
}

export interface UploadResult {
  studyId: string;
  seriesId: string;
  acceptedFiles: number;
  rejectedFiles: { name: string; reason: string }[];
  totalBytes: number;
}

// ─── Catalog helpers ──────────────────────────────────────────────────────

export const MODALITY_LABEL: Record<Modality, string> = {
  CT: "Computed Tomography",
  MR: "Magnetic Resonance",
  XR: "X-ray",
  US: "Ultrasound",
  PT: "PET",
  MG: "Mammography",
  NM: "Nuclear Medicine",
};

export const SEVERITY_TONE: Record<
  ReportSeverity,
  { label: string; bg: string; text: string; ring: string }
> = {
  normal: {
    label: "Normal",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  minor: {
    label: "Minor finding",
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
  },
  significant: {
    label: "Significant",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
  },
  critical: {
    label: "Critical — call ordering provider",
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
  },
};

export const STATUS_LABEL: Record<StudyStatus, string> = {
  uploaded: "Awaiting read",
  in_review: "Reading in progress",
  preliminary: "Preliminary read",
  final: "Final report",
  addendum: "Addendum issued",
};

/** MIME types accepted by the upload backend (EMR-166). */
export const ACCEPTED_IMAGING_MIME = new Set<string>([
  "application/dicom",
  "application/octet-stream", // many DICOM files report as octet-stream
  "image/jpeg",
  "image/png",
  "image/tiff",
]);

/** File size cap per file (50 MB). Real PACS allow more; this is a guardrail
 *  for the in-memory demo. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function modalityFromHint(hint: string): Modality | null {
  const h = hint.toUpperCase();
  if (h.includes("CT")) return "CT";
  if (h.includes("MR") || h.includes("MRI")) return "MR";
  if (h.includes("PET") || h === "PT") return "PT";
  if (h.includes("US") || h.includes("ULTRASOUND")) return "US";
  if (h.includes("XR") || h.includes("X-RAY") || h.includes("XRAY")) return "XR";
  if (h.includes("MG") || h.includes("MAMMO")) return "MG";
  if (h.includes("NM") || h.includes("NUCLEAR")) return "NM";
  return null;
}

// ─── Demo seed (rendered by Imaging Lab when the in-memory store is empty) ─

export const DEMO_PATIENT_ID = "demo-imaging-patient";

export const DEMO_STUDIES: ImagingStudy[] = [
  {
    id: "stu-ct-chest-001",
    patientId: DEMO_PATIENT_ID,
    modality: "CT",
    description: "CT Chest w/o contrast",
    bodyPart: "Chest",
    studyDate: "2026-04-12",
    status: "final",
    orderingProviderName: "Dr. Patel",
    radiologistName: "Dr. R. Okafor, MD",
    indication: "Chronic cough, evaluate for nodule.",
    series: [
      {
        id: "ser-ct-axial",
        description: "AXIAL 2.0 mm",
        frameCount: 64,
        sliceThickness: 2,
        orientation: "axial",
      },
      {
        id: "ser-ct-coronal",
        description: "CORONAL recon",
        frameCount: 48,
        sliceThickness: 3,
        orientation: "coronal",
      },
    ],
  },
  {
    id: "stu-mr-brain-001",
    patientId: DEMO_PATIENT_ID,
    modality: "MR",
    description: "MRI Brain w/ and w/o contrast",
    bodyPart: "Brain",
    studyDate: "2026-03-28",
    status: "preliminary",
    orderingProviderName: "Dr. Patel",
    radiologistName: "Dr. R. Okafor, MD",
    indication: "Headache, evaluate for mass.",
    series: [
      {
        id: "ser-mr-t1",
        description: "T1 axial",
        frameCount: 32,
        sliceThickness: 4,
        orientation: "axial",
      },
      {
        id: "ser-mr-flair",
        description: "FLAIR axial",
        frameCount: 32,
        sliceThickness: 4,
        orientation: "axial",
      },
    ],
  },
  {
    id: "stu-xr-knee-001",
    patientId: DEMO_PATIENT_ID,
    modality: "XR",
    description: "X-ray Right Knee, 3 views",
    bodyPart: "Knee",
    studyDate: "2026-04-21",
    status: "uploaded",
    orderingProviderName: "Dr. Patel",
    indication: "Right knee pain after fall.",
    series: [
      {
        id: "ser-xr-views",
        description: "AP / Lateral / Sunrise",
        frameCount: 3,
        orientation: "axial",
      },
    ],
  },
];

export const DEMO_ANNOTATIONS: ImagingAnnotation[] = [
  {
    id: "ann-ct-1",
    studyId: "stu-ct-chest-001",
    seriesId: "ser-ct-axial",
    frame: 24,
    shape: { kind: "circle", cx: 320, cy: 220, r: 28 },
    author: "Dr. R. Okafor",
    patientVisible: true,
    note: "Calcified granuloma — chronic, not active disease.",
    severity: "minor",
    createdAt: "2026-04-12T15:24:00Z",
  },
  {
    id: "ann-ct-2",
    studyId: "stu-ct-chest-001",
    seriesId: "ser-ct-axial",
    frame: 38,
    shape: { kind: "rect", x: 200, y: 280, w: 70, h: 40 },
    author: "Dr. R. Okafor",
    patientVisible: false,
    note: "Mild atelectasis. Internal — not surfaced to patient until discussed.",
    severity: "minor",
    createdAt: "2026-04-12T15:26:00Z",
  },
  {
    id: "ann-mr-1",
    studyId: "stu-mr-brain-001",
    seriesId: "ser-mr-flair",
    frame: 14,
    shape: { kind: "arrow", x1: 180, y1: 160, x2: 240, y2: 220 },
    author: "Dr. R. Okafor",
    patientVisible: true,
    note: "FLAIR hyperintensity, awaiting attending review.",
    severity: "significant",
    createdAt: "2026-03-28T18:02:00Z",
  },
];

export const DEMO_REPORTS: RadiologyReport[] = [
  {
    id: "rpt-ct-1",
    studyId: "stu-ct-chest-001",
    patientSummary:
      "Your chest CT looks reassuring. The radiologist saw a small calcified spot in your right upper lung — this is an old, healed mark, not active disease. Lungs and heart size are normal. No worrisome nodules or fluid.",
    findings:
      "LUNGS: 4 mm calcified granuloma RUL apical segment, unchanged from prior. No suspicious pulmonary nodules. No pleural effusion.\nMEDIASTINUM: No lymphadenopathy. Heart size normal. Aorta normal caliber.\nUPPER ABDOMEN: Limited views unremarkable.\nBONES/SOFT TISSUES: No acute osseous abnormality.",
    impression:
      "1. Stable RUL calcified granuloma, no evidence of malignancy.\n2. No acute cardiopulmonary process.",
    recommendation:
      "No follow-up imaging required. Routine clinical follow-up.",
    severity: "minor",
    signedBy: "Dr. R. Okafor, MD",
    signedAt: "2026-04-12T16:10:00Z",
    createdAt: "2026-04-12T15:50:00Z",
    releasedToPatient: true,
  },
  {
    id: "rpt-mr-1",
    studyId: "stu-mr-brain-001",
    patientSummary:
      "Preliminary read: a small bright spot was seen on one of the brain images. The senior radiologist will give the final read. Your provider will discuss next steps with you before this is released.",
    findings:
      "BRAIN: Small focus of FLAIR hyperintensity in right frontal subcortical white matter. No mass effect, no midline shift. Ventricles normal. No restricted diffusion.\nVASCULAR: No acute infarct on DWI.",
    impression:
      "1. Nonspecific FLAIR hyperintensity right frontal lobe, likely chronic microvascular vs. small demyelinating lesion. Clinical correlation suggested.",
    recommendation: "Consider neurology consult; repeat MRI in 6 months.",
    severity: "significant",
    signedBy: undefined,
    signedAt: undefined,
    createdAt: "2026-03-28T18:30:00Z",
    releasedToPatient: false,
  },
];

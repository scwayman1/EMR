// E-Prescribe domain types — EMR-169
// Cannabis prescriptions with pharmacy-grade structure.

export type PrescriptionStatus =
  | "draft"
  | "pending_review"
  | "signed"
  | "sent"
  | "dispensed"
  | "cancelled"
  | "expired";

export interface Prescription {
  id: string;
  encounterId?: string;
  patientId: string;
  providerId: string;
  organizationId: string;
  status: PrescriptionStatus;

  // ── Product details ──
  productName: string;
  productType: string; // tincture, flower, edible, etc.
  route: string; // oral, inhalation, sublingual, topical, transdermal
  thcMg?: number;
  cbdMg?: number;
  cbnMg?: number;

  // ── Dosing ──
  doseAmount: number;
  doseUnit: string;
  frequency: string; // BID, TID, PRN, etc.
  frequencyPerDay: number;
  timingInstructions?: string;
  daysSupply: number;
  quantity: number;
  quantityUnit: string;
  refills: number;

  // ── Clinical ──
  diagnosisCodes: { code: string; label: string }[];
  noteToPatient?: string;
  noteToPharmacy?: string;

  // ── Pharmacy ──
  pharmacyId?: string;
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  pharmacyFax?: string;

  // ── Safety ──
  interactionsReviewed: boolean;
  contraindicationsReviewed: boolean;

  // ── Signature ──
  signedAt?: string;
  signedBy?: string;
  sentAt?: string;

  createdAt: string;
  updatedAt: string;
}

// ── Frequency options ──────────────────────────────────

export const FREQUENCY_OPTIONS = [
  { value: "QD", label: "Once daily", perDay: 1 },
  { value: "BID", label: "Twice daily", perDay: 2 },
  { value: "TID", label: "Three times daily", perDay: 3 },
  { value: "QID", label: "Four times daily", perDay: 4 },
  { value: "QHS", label: "At bedtime", perDay: 1 },
  { value: "Q4H", label: "Every 4 hours", perDay: 6 },
  { value: "Q6H", label: "Every 6 hours", perDay: 4 },
  { value: "Q8H", label: "Every 8 hours", perDay: 3 },
  { value: "Q12H", label: "Every 12 hours", perDay: 2 },
  { value: "PRN", label: "As needed", perDay: 0 },
  { value: "QAM", label: "Every morning", perDay: 1 },
  { value: "QPM", label: "Every evening", perDay: 1 },
] as const;

// ── Route options ──────────────────────────────────────

export const ROUTE_OPTIONS = [
  { value: "oral", label: "Oral (swallowed)" },
  { value: "sublingual", label: "Sublingual (under tongue)" },
  { value: "inhalation", label: "Inhalation (vaporized)" },
  { value: "topical", label: "Topical (applied to skin)" },
  { value: "transdermal", label: "Transdermal (patch)" },
  { value: "rectal", label: "Rectal (suppository)" },
] as const;

// ── Pharmacy database (demo) ───────────────────────────

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  acceptsCannabis: boolean;
  state: string;
}

export const DEMO_PHARMACIES: Pharmacy[] = [
  {
    id: "pharm-1",
    name: "Green Leaf Dispensary",
    address: "123 Main St, Suite 100, Portland, OR 97201",
    phone: "(503) 555-0100",
    fax: "(503) 555-0101",
    acceptsCannabis: true,
    state: "OR",
  },
  {
    id: "pharm-2",
    name: "Botanical Wellness Pharmacy",
    address: "456 Oak Ave, Boulder, CO 80302",
    phone: "(720) 555-0200",
    fax: "(720) 555-0201",
    acceptsCannabis: true,
    state: "CO",
  },
  {
    id: "pharm-3",
    name: "MedCanna Dispensary",
    address: "789 Elm Blvd, Denver, CO 80203",
    phone: "(303) 555-0300",
    fax: "(303) 555-0301",
    acceptsCannabis: true,
    state: "CO",
  },
  {
    id: "pharm-4",
    name: "Harmony Health Pharmacy",
    address: "321 Pine Dr, Seattle, WA 98101",
    phone: "(206) 555-0400",
    fax: "(206) 555-0401",
    acceptsCannabis: true,
    state: "WA",
  },
  {
    id: "pharm-5",
    name: "Curaleaf Dispensary",
    address: "654 Maple Ct, San Francisco, CA 94102",
    phone: "(415) 555-0500",
    fax: "(415) 555-0501",
    acceptsCannabis: true,
    state: "CA",
  },
];

/**
 * Calculate the total quantity needed based on dosing parameters.
 */
export function calculateQuantity(
  doseAmount: number,
  frequencyPerDay: number,
  daysSupply: number
): number {
  return Math.ceil(doseAmount * frequencyPerDay * daysSupply);
}

/**
 * Format a prescription into a human-readable Sig (directions) string.
 */
export function formatSig(rx: {
  doseAmount: number;
  doseUnit: string;
  frequency: string;
  route: string;
  timingInstructions?: string;
}): string {
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === rx.frequency);
  const route = ROUTE_OPTIONS.find((r) => r.value === rx.route);

  let sig = `Take ${rx.doseAmount} ${rx.doseUnit}`;
  if (route) sig += ` ${route.label.toLowerCase()}`;
  if (freq) sig += ` ${freq.label.toLowerCase()}`;
  if (rx.timingInstructions) sig += `. ${rx.timingInstructions}`;

  return sig;
}

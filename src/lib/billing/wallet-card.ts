/**
 * Medication Wallet Card (EMR-112)
 * --------------------------------
 * Generates a credit-card-sized printable medication summary patients
 * can carry. Includes cannabis Rx, conventional meds, and supplements.
 *
 * Lives in `lib/billing` because the same data feeds the patient
 * statement footer ("Active medications on file as of <date>") and
 * the prior-auth agent's submission packet — both billing-adjacent
 * surfaces.
 *
 * Render boundary: this module produces a layout-agnostic
 * `WalletCardData` structure. The PDF renderer (server route or
 * client print sheet) consumes that shape — no DOM coupling here so
 * the same data can drive a print sheet, an Apple Wallet pass, or a
 * patient-portal preview.
 */

export interface WalletCardMedication {
  name: string;
  frequency: string;
  category: "cannabis" | "rx" | "supplement";
  indication?: string;
}

export interface WalletCardPatient {
  fullName: string;
  dateOfBirth: string;
  mrn: string;
  /** Single allergy line: "PCN, sulfa" — empty string = "NKDA". */
  allergiesSummary: string;
}

export interface WalletCardEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface WalletCardData {
  patient: WalletCardPatient;
  medications: WalletCardMedication[];
  emergencyContact: WalletCardEmergencyContact | null;
  practiceName: string;
  practiceContact: string;
  generatedAt: string;
  /** Truncation flag — set when the medication list exceeds the card's
   * physical capacity and entries had to be dropped. */
  truncated: boolean;
  truncatedCount: number;
}

/** Card capacity — most that fits on a CR80 (3.375"×2.125") at 8pt. */
export const WALLET_CARD_MAX_MEDS = 8;

/** ISO 7810 ID-1 (CR80) physical dimensions in mm. */
export const WALLET_CARD_DIMENSIONS_MM = { widthMm: 85.6, heightMm: 53.98 };

interface BuildInput {
  patient: WalletCardPatient;
  medications: WalletCardMedication[];
  emergencyContact?: WalletCardEmergencyContact | null;
  practiceName: string;
  practiceContact: string;
  generatedAt?: Date;
}

/**
 * Build the wallet-card payload. Sorts cannabis Rx first (the patient
 * is more likely to be asked about it in an ER context), then
 * conventional Rx, then supplements.
 */
export function buildWalletCard(input: BuildInput): WalletCardData {
  const sorted = [...input.medications].sort((a, b) => {
    const order = { cannabis: 0, rx: 1, supplement: 2 } as const;
    if (order[a.category] !== order[b.category]) {
      return order[a.category] - order[b.category];
    }
    return a.name.localeCompare(b.name);
  });

  const visible = sorted.slice(0, WALLET_CARD_MAX_MEDS);
  const dropped = sorted.length - visible.length;

  return {
    patient: input.patient,
    medications: visible,
    emergencyContact: input.emergencyContact ?? null,
    practiceName: input.practiceName,
    practiceContact: input.practiceContact,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    truncated: dropped > 0,
    truncatedCount: Math.max(0, dropped),
  };
}

/** Format a single medication line — keeps to ~52 chars to avoid wrap on CR80 at 8pt. */
export function formatMedicationLine(med: WalletCardMedication): string {
  const base = `${med.name} — ${med.frequency}`;
  return base.length > 52 ? base.slice(0, 49) + "…" : base;
}

/**
 * Stable hash of medications + patient identity. The portal "Print
 * wallet card" button compares this against the cached PDF; a changed
 * hash invalidates and re-renders. Simple FNV-1a — deterministic and
 * dependency-free.
 */
export function walletCardCacheKey(data: WalletCardData): string {
  const payload = JSON.stringify({
    p: data.patient.mrn,
    a: data.patient.allergiesSummary,
    m: data.medications.map((m) => `${m.category}:${m.name}:${m.frequency}`),
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
}

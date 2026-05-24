/**
 * Medication Substitution Detection (EMR-003)
 *
 * When a clinician swaps a patient onto a new product (e.g. a different
 * brand of THC oil) the calculated mg dose often stays the same — only
 * the volume changes because the new product has a different
 * concentration. We surface that explicitly to the patient so they don't
 * worry that the dose has been altered.
 *
 * A "substitution" here means:
 *   • patient has an active regimen and a recently-ended (inactive)
 *     regimen,
 *   • the two regimens reference different products, AND
 *   • the calculated mg-per-dose (THC + CBD totals) matches within a
 *     small tolerance.
 */

const MG_TOLERANCE = 0.05; // 5 % of dose

export interface RegimenForSubstitution {
  id: string;
  productId: string;
  productName?: string | null;
  active: boolean;
  startDate: Date | string;
  endDate?: Date | string | null;
  volumePerDose: number;
  volumeUnit: string;
  calculatedThcMgPerDose: number | null;
  calculatedCbdMgPerDose: number | null;
}

export interface SubstitutionDetection {
  occurred: boolean;
  previousProductName?: string | null;
  currentProductName?: string | null;
  previousVolume?: string;
  currentVolume?: string;
  thcMgPerDose?: number;
  cbdMgPerDose?: number;
}

/**
 * Detect whether the most recent active regimen in `regimens` is a
 * same-mg substitution of the most recent inactive regimen it replaced.
 *
 * `regimens` may be in any order; this function does its own sorting.
 */
export function detectSubstitution(
  regimens: RegimenForSubstitution[],
): SubstitutionDetection {
  if (!regimens || regimens.length < 2) return { occurred: false };

  const active = regimens
    .filter((r) => r.active)
    .sort((a, b) => toMs(b.startDate) - toMs(a.startDate))[0];
  if (!active) return { occurred: false };

  // Most recent inactive regimen that ended before the active one started.
  const candidates = regimens
    .filter(
      (r) =>
        !r.active &&
        r.productId !== active.productId &&
        toMs(r.endDate ?? r.startDate) <= toMs(active.startDate),
    )
    .sort(
      (a, b) =>
        toMs(b.endDate ?? b.startDate) - toMs(a.endDate ?? a.startDate),
    );

  const previous = candidates[0];
  if (!previous) return { occurred: false };

  if (!withinTolerance(active, previous)) return { occurred: false };

  return {
    occurred: true,
    previousProductName: previous.productName ?? null,
    currentProductName: active.productName ?? null,
    previousVolume: `${formatNumber(previous.volumePerDose)} ${previous.volumeUnit}`,
    currentVolume: `${formatNumber(active.volumePerDose)} ${active.volumeUnit}`,
    thcMgPerDose: active.calculatedThcMgPerDose ?? undefined,
    cbdMgPerDose: active.calculatedCbdMgPerDose ?? undefined,
  };
}

function withinTolerance(
  a: RegimenForSubstitution,
  b: RegimenForSubstitution,
): boolean {
  const thcA = a.calculatedThcMgPerDose ?? 0;
  const thcB = b.calculatedThcMgPerDose ?? 0;
  const cbdA = a.calculatedCbdMgPerDose ?? 0;
  const cbdB = b.calculatedCbdMgPerDose ?? 0;
  if (thcA === 0 && cbdA === 0 && thcB === 0 && cbdB === 0) return false;
  return closeEnough(thcA, thcB) && closeEnough(cbdA, cbdB);
}

function closeEnough(x: number, y: number): boolean {
  const diff = Math.abs(x - y);
  if (diff <= 0.1) return true; // 0.1 mg absolute floor
  const base = Math.max(Math.abs(x), Math.abs(y));
  return diff / base <= MG_TOLERANCE;
}

function toMs(d: Date | string): number {
  if (d instanceof Date) return d.getTime();
  return new Date(d).getTime();
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

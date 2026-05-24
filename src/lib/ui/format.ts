// Display primitives for money + clinical units. Every surface should speak
// the same way: $X.XX from cents, dose "100 mg", BP "120/80", labs with a
// reference-range flag.
//
// Pure functions. No React, no server imports — safe to import anywhere and
// trivially unit-testable.
//
// i18n follow-up: en-US + USD are hardcoded. When we add locale support we
// will plumb a LocaleContext through and accept (locale, currency) opts.
// Tracked in the PR body.

const PLACEHOLDER = "—";

// -----------------------------------------------------------------------------
// Internal: nullish/NaN guard
// -----------------------------------------------------------------------------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// -----------------------------------------------------------------------------
// Money — cents in, formatted USD out
// -----------------------------------------------------------------------------

export type MoneyOpts = {
  /** Drop the cents and render `$1,234` if true. Default false. */
  compactDollars?: boolean;
  /** Render absolute value and let the caller convey sign (e.g. red badge). */
  absolute?: boolean;
  /** Render as $1.2K / $3.4M for KPIs. Negative values stay precise. */
  abbreviate?: boolean;
};

const USD_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_WHOLE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Format integer cents as USD.
 *
 * - `money(123456)` → `"$1,234.56"`
 * - `money(-500)` → `"-$5.00"` (callers may add a red tone)
 * - `money(null)` → `"—"`
 * - `money(12345, { abbreviate: true })` → `"$123"` (<$1K stays precise via `compactDollars`)
 */
export function money(
  cents: number | null | undefined,
  opts: MoneyOpts = {},
): string {
  if (!isFiniteNumber(cents)) return PLACEHOLDER;
  const signed = opts.absolute ? Math.abs(cents) : cents;
  const dollars = signed / 100;

  if (opts.abbreviate) {
    const abs = Math.abs(dollars);
    if (abs >= 1_000_000) {
      const sign = dollars < 0 ? "-" : "";
      return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      const sign = dollars < 0 ? "-" : "";
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    return USD_WHOLE.format(dollars);
  }

  if (opts.compactDollars) return USD_WHOLE.format(dollars);
  return USD_PRECISE.format(dollars);
}

/**
 * Returns a hint for callers that want to tint negative money red. The
 * function intentionally returns the string only — the consuming component
 * decides how to style it.
 */
export function moneyTone(cents: number | null | undefined): "negative" | "neutral" {
  if (!isFiniteNumber(cents)) return "neutral";
  return cents < 0 ? "negative" : "neutral";
}

// -----------------------------------------------------------------------------
// Dose — medication amounts ("100 mg", "5 mL", "1 tab")
// -----------------------------------------------------------------------------

export type DoseUnit =
  | "mg"
  | "g"
  | "mcg"
  | "mL"
  | "ml"
  | "L"
  | "tab"
  | "tabs"
  | "cap"
  | "caps"
  | "drop"
  | "drops"
  | "puff"
  | "puffs"
  | "spray"
  | "sprays"
  | "patch"
  | "patches"
  | "unit"
  | "units"
  | string; // permissive — surfaces use lots of bespoke units

/**
 * Format a dose amount with a unit. Whole numbers render as `100 mg`,
 * fractional ones render with up to 2 decimals stripped of trailing zeros
 * (`2.5 mg`, `0.5 mL`). NaN/null returns the placeholder.
 */
export function dose(
  value: number | null | undefined,
  unit: DoseUnit | null | undefined,
): string {
  if (!isFiniteNumber(value)) return PLACEHOLDER;
  if (!unit) return formatDoseNumber(value);
  const u = normalizeDoseUnit(unit);
  return `${formatDoseNumber(value)} ${u}`;
}

function formatDoseNumber(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  // Strip trailing zeros: 2.50 → 2.5, 1.00 → 1
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeDoseUnit(unit: string): string {
  // Canonical capitalization for the common ones; pass through everything else.
  const map: Record<string, string> = {
    ml: "mL",
    ML: "mL",
    Ml: "mL",
    l: "L",
    Mg: "mg",
    MG: "mg",
    G: "g",
    MCG: "mcg",
    Mcg: "mcg",
  };
  return map[unit] ?? unit;
}

// -----------------------------------------------------------------------------
// Vitals — BP, temperature, SpO2
// -----------------------------------------------------------------------------

export const vitals = {
  /**
   * Blood pressure as `120/80`. Returns placeholder if either reading is
   * missing.
   */
  bp(
    systolic: number | null | undefined,
    diastolic: number | null | undefined,
  ): string {
    if (!isFiniteNumber(systolic) || !isFiniteNumber(diastolic)) return PLACEHOLDER;
    return `${Math.round(systolic)}/${Math.round(diastolic)}`;
  },

  /**
   * Temperature. Defaults to °F (US convention). Rounds to 1 decimal.
   */
  temp(
    value: number | null | undefined,
    unit: "F" | "C" = "F",
  ): string {
    if (!isFiniteNumber(value)) return PLACEHOLDER;
    return `${value.toFixed(1)} °${unit}`;
  },

  /**
   * Oxygen saturation as `98%`. Clamps to 0–100.
   */
  spo2(value: number | null | undefined): string {
    if (!isFiniteNumber(value)) return PLACEHOLDER;
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    return `${clamped}%`;
  },
};

// -----------------------------------------------------------------------------
// Lab values — value + unit with optional reference-range flag
// -----------------------------------------------------------------------------

export type LabFlag = "high" | "low" | "normal" | null;

export interface LabResult {
  display: string;
  flag: LabFlag;
}

/**
 * Render a lab value with its unit and an optional out-of-range flag.
 *
 * - `lab(4.5, "mmol/L")` → `{ display: "4.5 mmol/L", flag: null }`
 * - `lab(6.2, "mmol/L", 3.5, 5.0)` → `{ display: "6.2 mmol/L", flag: "high" }`
 * - `lab(null, "mmol/L")` → `{ display: "—", flag: null }`
 */
export function lab(
  value: number | null | undefined,
  unit: string | null | undefined,
  refLow?: number | null,
  refHigh?: number | null,
): LabResult {
  if (!isFiniteNumber(value)) return { display: PLACEHOLDER, flag: null };
  const u = unit ? ` ${unit}` : "";
  const display = `${formatDoseNumber(value)}${u}`;
  let flag: LabFlag = "normal";
  const hasLow = isFiniteNumber(refLow);
  const hasHigh = isFiniteNumber(refHigh);
  if (!hasLow && !hasHigh) flag = null;
  else if (hasLow && value < (refLow as number)) flag = "low";
  else if (hasHigh && value > (refHigh as number)) flag = "high";
  return { display, flag };
}

/** Human-readable a11y label for a lab flag. */
export function labFlagAriaLabel(flag: LabFlag): string | undefined {
  if (flag === "high") return "Above reference range";
  if (flag === "low") return "Below reference range";
  return undefined;
}

export const FORMAT_PLACEHOLDER = PLACEHOLDER;

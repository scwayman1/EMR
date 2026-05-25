/**
 * Inhalation Dose Estimator (EMR-003)
 *
 * Estimates the milligrams of THC and CBD a patient receives from an
 * inhaled cannabis product (vape cartridge, flower, concentrate) based on
 * the number of puffs and the product's cannabinoid concentration.
 *
 * The math is intentionally conservative — these are educational estimates,
 * not lab measurements. Actual delivered dose depends on inhalation depth,
 * heat profile, bioavailability, and bowl/cart efficiency. The numbers
 * here align with the ranges cited in the MCL/cannabis pharmacology
 * literature surfaced through ChatCB.
 */

import type { ProductType } from "@prisma/client";

/**
 * Default volume of vapor / smoke inhaled per puff, expressed in mL of
 * product consumed. Empirically derived for use in estimation only.
 *
 *  - Vape cartridge: ~5 µL atomized per puff → 0.005 mL
 *  - Flower / pre-roll: rough equivalent of ~0.05 g combusted per puff →
 *    treated as a percentage of the bowl in `mgPerPuffForFlower`.
 */
export const DEFAULT_VAPE_ML_PER_PUFF = 0.005;
export const DEFAULT_FLOWER_GRAMS_PER_PUFF = 0.05;

export interface InhalationProduct {
  productType: string; // "vape_cartridge" | "flower" | "concentrate" | ...
  /**
   * For liquids (carts, oils): mg per mL.
   * For flower: percent THC by mass (e.g. 18 means 18% THC).
   * For capsules/edibles: not used here — they are not inhaled.
   */
  thcConcentration?: number | null;
  cbdConcentration?: number | null;
  concentrationUnit?: string | null;
}

export interface InhalationEstimate {
  puffs: number;
  estimatedThcMg: number;
  estimatedCbdMg: number;
  mgPerPuffThc: number;
  mgPerPuffCbd: number;
  /** Plain-language explanation patients can read in the UI. */
  rationale: string;
}

/**
 * mg of THC delivered per puff from a vape cartridge or oil-based
 * inhaled product. Concentration is mg/mL of product.
 */
export function mgPerPuffForVape(
  concentrationMgPerMl: number,
  mlPerPuff: number = DEFAULT_VAPE_ML_PER_PUFF,
): number {
  if (!Number.isFinite(concentrationMgPerMl) || concentrationMgPerMl <= 0) {
    return 0;
  }
  return concentrationMgPerMl * mlPerPuff;
}

/**
 * mg of THC delivered per puff from combusted flower. `percent` is the
 * THC percentage by mass (e.g. 18 means 18%). We assume a typical bowl
 * is ~0.25 g and delivers ~5 puffs, so each puff combusts roughly
 * 0.05 g of plant material. Combustion is ~30% efficient at delivering
 * cannabinoids — the rest is lost to side-stream smoke and pyrolysis.
 */
export function mgPerPuffForFlower(
  percent: number,
  gramsPerPuff: number = DEFAULT_FLOWER_GRAMS_PER_PUFF,
  efficiency: number = 0.3,
): number {
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  const mgPerGram = percent * 10; // 1% = 10 mg/g
  return mgPerGram * gramsPerPuff * efficiency;
}

/**
 * Returns the mg/puff for both THC and CBD on a given inhaled product,
 * picking the right formula based on the product type and concentration
 * unit. Returns zeros for non-inhaled products.
 */
export function mgPerPuff(product: InhalationProduct): {
  thc: number;
  cbd: number;
} {
  const type = (product.productType ?? "").toLowerCase();
  const unit = (product.concentrationUnit ?? "").toLowerCase();
  const thc = product.thcConcentration ?? 0;
  const cbd = product.cbdConcentration ?? 0;

  // Flower is dosed by % THC/CBD.
  if (type === "flower" || unit === "%") {
    return {
      thc: mgPerPuffForFlower(thc),
      cbd: mgPerPuffForFlower(cbd),
    };
  }

  // Carts, vape oils, concentrates — mg/mL.
  if (
    type === "vape_cartridge" ||
    type === "vape" ||
    type === "concentrate" ||
    unit === "mg/ml"
  ) {
    return {
      thc: mgPerPuffForVape(thc),
      cbd: mgPerPuffForVape(cbd),
    };
  }

  // Non-inhaled or unsupported.
  return { thc: 0, cbd: 0 };
}

/**
 * Estimate the total mg delivered for a given number of puffs.
 */
export function estimateInhalationDose(
  puffs: number,
  product: InhalationProduct,
): InhalationEstimate {
  const safePuffs = Math.max(0, Math.floor(puffs));
  const { thc: mgPerPuffThc, cbd: mgPerPuffCbd } = mgPerPuff(product);
  const estimatedThcMg = round1(safePuffs * mgPerPuffThc);
  const estimatedCbdMg = round1(safePuffs * mgPerPuffCbd);

  const rationale =
    mgPerPuffThc > 0 || mgPerPuffCbd > 0
      ? `${safePuffs} puff${safePuffs === 1 ? "" : "s"} × ~${round2(
          mgPerPuffThc + mgPerPuffCbd,
        )} mg total per puff. Estimates only — bioavailability and inhalation depth vary.`
      : `We could not estimate mg for this product. Log your puffs and a clinician will review.`;

  return {
    puffs: safePuffs,
    estimatedThcMg,
    estimatedCbdMg,
    mgPerPuffThc: round2(mgPerPuffThc),
    mgPerPuffCbd: round2(mgPerPuffCbd),
    rationale,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Convenience: is this product type inhaled? Used by UI to decide whether
 * to render the puff-based estimator vs the volume-based dose display.
 */
export function isInhaledProductType(productType?: string | null): boolean {
  if (!productType) return false;
  const t = productType.toLowerCase();
  return (
    t === "vape_cartridge" ||
    t === "vape" ||
    t === "flower" ||
    t === "concentrate" ||
    t === "pre_roll" ||
    t === "preroll"
  );
}

// Re-export the Prisma enum for callers that already use it.
export type { ProductType };

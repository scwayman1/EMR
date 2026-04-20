"use server";

import { z } from "zod";
import {
  checkInteractions as domainCheckInteractions,
  type DrugInteraction,
} from "@/lib/domain/drug-interactions";

/**
 * Public-facing Drug Mix server action.
 *
 * No authentication required — this is an educational tool available to
 * anyone visiting /education/drug-mix. It reuses the shared domain module
 * (`src/lib/domain/drug-interactions.ts`) so clinician-side and
 * public-side lookups share the same authoritative data.
 */

/** Cannabinoid choices offered to the public-facing UI. */
export const PUBLIC_CANNABINOID_CHOICES = [
  "CBD",
  "THC",
  "BALANCED",
  "CBG",
] as const;

export type PublicCannabinoidChoice = (typeof PUBLIC_CANNABINOID_CHOICES)[number];

const CheckInput = z.object({
  medications: z
    .array(z.string().trim().min(1).max(120))
    .max(25, "Please check at most 25 medications at a time."),
  cannabinoid: z.enum(PUBLIC_CANNABINOID_CHOICES),
});

export interface DrugMixResult {
  interactions: DrugInteraction[];
  checkedCannabinoids: string[];
  medicationCount: number;
}

/**
 * Expands the user-facing cannabinoid choice into the specific cannabinoid
 * keys the domain module understands. "BALANCED" (a 1:1 product) is checked
 * against both THC and CBD; "CBG" currently has no dedicated rows in the
 * shared dataset and is treated as an unknown — we still return an empty
 * result rather than silently fall back to THC/CBD.
 */
function expandCannabinoidChoice(choice: PublicCannabinoidChoice): string[] {
  switch (choice) {
    case "CBD":
      return ["CBD"];
    case "THC":
      return ["THC"];
    case "BALANCED":
      return ["THC", "CBD"];
    case "CBG":
      return ["CBG"];
  }
}

export async function checkInteractions(
  medications: string[],
  cannabinoid: PublicCannabinoidChoice
): Promise<DrugMixResult> {
  const parsed = CheckInput.safeParse({ medications, cannabinoid });
  if (!parsed.success) {
    return {
      interactions: [],
      checkedCannabinoids: [],
      medicationCount: 0,
    };
  }

  const cleaned = parsed.data.medications
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  const cannabinoids = expandCannabinoidChoice(parsed.data.cannabinoid);
  const interactions = domainCheckInteractions(cleaned, cannabinoids);

  return {
    interactions,
    checkedCannabinoids: cannabinoids,
    medicationCount: cleaned.length,
  };
}

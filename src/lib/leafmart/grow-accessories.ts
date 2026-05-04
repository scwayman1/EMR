// EMR-282 — Grow-accessory category metadata.
//
// Anything in this category (lights, tents, fertilizer, fans, hygrometers,
// trim/cure tools) ships from third-party vendors and may be illegal to
// possess for cultivation in some states. We surface a customer-facing
// disclaimer on every grow-accessory PDP that punts compliance to the
// patient; the storefront does not attempt to gate by ZIP because the
// rules vary by city/county.

export const GROW_ACCESSORY_CATEGORY = "grow-accessories" as const;

export const GROW_ACCESSORY_DISCLAIMER = `Grow accessories are sold for legal home cultivation only where local, state, and federal law permits. It is your sole responsibility to verify that growing cannabis is permitted in your jurisdiction, including any plant-count limits or licensing requirements. Leafjourney makes no representation that any product is legal to use for cultivation in your location. Consult an attorney if you are unsure.`;

export interface GrowAccessoryAffirmation {
  /** Title patient sees above the disclaimer. */
  title: string;
  /** Body paragraph (single string, can render multi-line via CSS). */
  body: string;
  /** Confirmation copy on the affirm button. */
  acknowledgeLabel: string;
}

export const GROW_ACCESSORY_AFFIRMATION: GrowAccessoryAffirmation = {
  title: "Confirm cultivation is legal where you live",
  body: GROW_ACCESSORY_DISCLAIMER,
  acknowledgeLabel: "I understand and accept responsibility",
};

export function isGrowAccessory(category: string | null | undefined): boolean {
  return (category ?? "").toLowerCase() === GROW_ACCESSORY_CATEGORY;
}

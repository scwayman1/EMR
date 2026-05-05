/**
 * Dynamic Promo Code Engine
 * 
 * Validates and applies discount codes to Leafmart carts.
 * Supports percentage discounts, fixed amount discounts, and free shipping.
 */

export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";

export interface PromoCode {
  code: string;
  type: DiscountType;
  value: number; // e.g., 20 for 20%, or 1500 for $15.00
  minSubtotal?: number; // Minimum cart value required to use
  expiresAt?: string; // ISO date string
  isActive: boolean;
  maxUses?: number;
  currentUses: number;
}

// In V1, we hardcode some active promotional codes for the demo.
// In production, these are fetched from the Prisma database.
const ACTIVE_PROMOS: Record<string, PromoCode> = {
  "LEAF20": {
    code: "LEAF20",
    type: "percentage",
    value: 0.20,
    isActive: true,
    currentUses: 0,
  },
  "WELCOME10": {
    code: "WELCOME10",
    type: "fixed_amount",
    value: 10.00,
    minSubtotal: 50.00,
    isActive: true,
    currentUses: 154,
  },
  "FREESHIP": {
    code: "FREESHIP",
    type: "free_shipping",
    value: 0,
    isActive: true,
    currentUses: 890,
  }
};

export interface PromoValidationResult {
  isValid: boolean;
  discountAmount: number;
  error?: string;
  promo?: PromoCode;
}

export function applyPromoCode(
  code: string, 
  subtotal: number, 
  shippingCost: number = 0
): PromoValidationResult {
  const normalizedCode = code.trim().toUpperCase();
  const promo = ACTIVE_PROMOS[normalizedCode];

  if (!promo || !promo.isActive) {
    return { isValid: false, discountAmount: 0, error: "Invalid or expired promo code." };
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { isValid: false, discountAmount: 0, error: "This promo code has expired." };
  }

  if (promo.maxUses && promo.currentUses >= promo.maxUses) {
    return { isValid: false, discountAmount: 0, error: "This promo code has reached its maximum uses." };
  }

  if (promo.minSubtotal && subtotal < promo.minSubtotal) {
    return { 
      isValid: false, 
      discountAmount: 0, 
      error: `This code requires a minimum purchase of $${promo.minSubtotal.toFixed(2)}.` 
    };
  }

  let discountAmount = 0;

  switch (promo.type) {
    case "percentage":
      discountAmount = subtotal * promo.value;
      break;
    case "fixed_amount":
      discountAmount = Math.min(promo.value, subtotal); // Can't discount more than subtotal
      break;
    case "free_shipping":
      discountAmount = shippingCost;
      break;
  }

  return {
    isValid: true,
    discountAmount,
    promo,
  };
}

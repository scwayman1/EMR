export type AgeGateStatus =
  | "allowed"
  | "guest_login"
  | "needs_dob"
  | "blocked_underage"
  | "blocked_state";

export interface AgeGateInput {
  requires21Plus: boolean;
  dateOfBirth?: Date | null;
  destinationState?: string | null;
  isAuthenticated: boolean;
}

export interface AgeGateDecision {
  status: AgeGateStatus;
  message?: string;
}

const STATE_AGE_21_MESSAGES: Record<string, string> = {
  TX: "Texas requires 21+ verification and licensed retailer compliance for this item.",
};

export function computeAgeYears(dateOfBirth: Date, now = new Date()): number {
  let years = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDiff = now.getUTCDate() - dateOfBirth.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }

  return years;
}

export function resolveAgeGate(input: AgeGateInput): AgeGateDecision {
  if (!input.requires21Plus) {
    return { status: "allowed" };
  }

  if (!input.isAuthenticated) {
    return { status: "guest_login", message: "Please sign in to view 21+ products." };
  }

  const stateCode = input.destinationState?.toUpperCase();
  const stateMessage = stateCode ? STATE_AGE_21_MESSAGES[stateCode] : undefined;

  if (!input.dateOfBirth) {
    if (stateMessage) {
      return { status: "blocked_state", message: stateMessage };
    }
    return { status: "needs_dob" };
  }

  const age = computeAgeYears(input.dateOfBirth);

  if (age < 21) {
    if (stateMessage) {
      return { status: "blocked_state", message: stateMessage };
    }
    return { status: "blocked_underage", message: "Not eligible. This product is restricted to adults 21+." };
  }

  return { status: "allowed" };
}

// EMR-245: server-side cart enforcement.
//
// Runs the age gate against every cart item that requires 21+ and
// returns the list of items that fail. Caller (checkout API) decides
// how to render: a single banner ("3 items in your cart require 21+
// verification") or a per-item callout. Items that don't require 21+
// are never blocked.
export interface AgeRestrictedCartItem {
  productSlug: string;
  productName: string;
  requires21Plus: boolean;
}

export interface CartAgeGateInput<T extends AgeRestrictedCartItem> {
  items: ReadonlyArray<T>;
  isAuthenticated: boolean;
  dateOfBirth?: Date | null;
  ageVerifiedAt?: Date | null;
  destinationState?: string | null;
}

export interface CartAgeGateResult<T extends AgeRestrictedCartItem> {
  ok: boolean;
  blocked: Array<{ item: T; decision: AgeGateDecision }>;
}

export function resolveCartAgeGate<T extends AgeRestrictedCartItem>(
  input: CartAgeGateInput<T>,
): CartAgeGateResult<T> {
  // Trust ageVerifiedAt as a fast-path: a verified patient has already
  // gone through the DOB confirmation flow (see /api/marketplace/age-
  // gate/confirm) and we don't re-prompt on every cart submit.
  const verifiedFastPath =
    !!input.ageVerifiedAt && input.dateOfBirth && computeAgeYears(input.dateOfBirth) >= 21;

  const blocked: CartAgeGateResult<T>["blocked"] = [];
  for (const item of input.items) {
    if (!item.requires21Plus) continue;
    if (verifiedFastPath) continue;

    const decision = resolveAgeGate({
      requires21Plus: true,
      isAuthenticated: input.isAuthenticated,
      dateOfBirth: input.dateOfBirth,
      destinationState: input.destinationState,
    });
    if (decision.status === "allowed") continue;
    blocked.push({ item, decision });
  }

  return { ok: blocked.length === 0, blocked };
}

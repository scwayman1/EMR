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

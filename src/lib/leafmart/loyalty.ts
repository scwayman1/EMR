// EMR-313 — Loyalty / points system.
//
// Pure helper module. No persistence layer here — the storefront and
// account pages call into these functions to compute balances, tiers,
// and redemptions from whatever the backing store hands over.
//
// Earn rules:
//   • $1 spent (pre-tax)              → 1 point
//   • Each verified review            → 50 points
//   • Each completed outcome log      → 25 points (caps at 5/week)
//   • Tier-multiplier on order points → see TIER_MULTIPLIER below
//
// Tiers are derived from rolling 12-month spend so they don't punish
// patients with seasonal flares — the table is intentionally generous
// because Dr. Patel wants the loyalty surface to feel like a "thanks
// for showing up" gesture, not a casino loyalty card.

export type LoyaltyTier = "sprout" | "leaf" | "canopy" | "grove";

export interface PointsLedgerEntry {
  id: string;
  type: "order" | "review" | "outcome" | "redemption" | "adjustment" | "bonus";
  /** Positive numbers earn, negative redeem. */
  delta: number;
  description: string;
  createdAt: string;
  /** Optional reference (order id, review id, etc.). */
  referenceId?: string;
}

export interface LoyaltyAccount {
  userId: string;
  ledger: PointsLedgerEntry[];
  /** Trailing-12-month spend in dollars, used for tier calc. */
  trailing12mSpend: number;
}

export interface TierDefinition {
  id: LoyaltyTier;
  label: string;
  /** Minimum trailing-12-month spend (USD) needed to earn this tier. */
  minSpend: number;
  /** Multiplier applied to base order points. 1.0 = no bonus. */
  multiplier: number;
  /** Perks shown in the rewards UI. */
  perks: string[];
  /** Hex tone used in the UI ribbon. */
  accent: string;
}

export const TIERS: TierDefinition[] = [
  {
    id: "sprout",
    label: "Sprout",
    minSpend: 0,
    multiplier: 1.0,
    perks: ["Free standard shipping over $75", "Birthday bonus 100 points"],
    accent: "var(--sage)",
  },
  {
    id: "leaf",
    label: "Leaf",
    minSpend: 250,
    multiplier: 1.25,
    perks: [
      "1.25× points on every order",
      "Early access to new shelf drops",
      "Free 15-min clinician check-in",
    ],
    accent: "var(--leaf)",
  },
  {
    id: "canopy",
    label: "Canopy",
    minSpend: 750,
    multiplier: 1.5,
    perks: [
      "1.5× points on every order",
      "Priority shipping",
      "Quarterly clinician outcomes review",
    ],
    accent: "var(--peach)",
  },
  {
    id: "grove",
    label: "Grove",
    minSpend: 2000,
    multiplier: 2.0,
    perks: [
      "2× points on every order",
      "Free overnight on orders over $150",
      "Direct line to a Leafjourney clinician",
      "Annual outcomes report",
    ],
    accent: "var(--coral)",
  },
];

export interface RewardOption {
  id: string;
  label: string;
  /** Cost in points to redeem. */
  cost: number;
  /** Dollar value or perk description. */
  description: string;
  category: "discount" | "shipping" | "perk" | "donation";
}

export const REWARD_CATALOG: RewardOption[] = [
  {
    id: "credit-5",
    label: "$5 store credit",
    cost: 500,
    description: "Applied at checkout against your next order.",
    category: "discount",
  },
  {
    id: "credit-15",
    label: "$15 store credit",
    cost: 1400,
    description: "Best value — 7% bonus over the $5 tier.",
    category: "discount",
  },
  {
    id: "credit-50",
    label: "$50 store credit",
    cost: 4500,
    description: "Bigger redemption, capped to one per quarter.",
    category: "discount",
  },
  {
    id: "free-shipping",
    label: "Free overnight shipping",
    cost: 750,
    description: "Bumps any single order to overnight, no minimum.",
    category: "shipping",
  },
  {
    id: "consult-15",
    label: "15-min clinician consult",
    cost: 1200,
    description: "Quick virtual check-in with a Leafjourney clinician.",
    category: "perk",
  },
  {
    id: "donation-10",
    label: "$10 to LJN research fund",
    cost: 950,
    description: "We match dollar-for-dollar at year end.",
    category: "donation",
  },
];

/* ── Earn helpers ───────────────────────────────────────────── */

const OUTCOME_WEEKLY_CAP = 5;

export function pointsForOrder(
  amountPreTax: number,
  tier: LoyaltyTier
): number {
  const base = Math.floor(amountPreTax);
  const def = tierFor(tier);
  return Math.round(base * def.multiplier);
}

export function pointsForReview(): number {
  return 50;
}

export function pointsForOutcomeLog(loggedThisWeek: number): number {
  if (loggedThisWeek >= OUTCOME_WEEKLY_CAP) return 0;
  return 25;
}

/* ── Balance + tier computation ─────────────────────────────── */

export function computeBalance(account: LoyaltyAccount): number {
  return account.ledger.reduce((sum, entry) => sum + entry.delta, 0);
}

export function tierFor(id: LoyaltyTier): TierDefinition {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function deriveTier(trailing12mSpend: number): TierDefinition {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (trailing12mSpend >= t.minSpend) current = t;
  }
  return current;
}

/**
 * How much spend is needed to unlock the next tier? Returns null when
 * the account is already at the top tier.
 */
export function progressToNextTier(account: LoyaltyAccount): {
  current: TierDefinition;
  next: TierDefinition | null;
  /** USD remaining to reach the next tier. 0 when at top. */
  spendNeeded: number;
  /** 0 → 1, fraction of the gap covered. 1 when at top. */
  fraction: number;
} {
  const current = deriveTier(account.trailing12mSpend);
  const idx = TIERS.findIndex((t) => t.id === current.id);
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  if (!next) {
    return { current, next: null, spendNeeded: 0, fraction: 1 };
  }
  const span = Math.max(1, next.minSpend - current.minSpend);
  const covered = Math.max(0, account.trailing12mSpend - current.minSpend);
  return {
    current,
    next,
    spendNeeded: Math.max(0, next.minSpend - account.trailing12mSpend),
    fraction: Math.min(1, covered / span),
  };
}

/* ── Redemption ─────────────────────────────────────────────── */

export interface RedemptionResult {
  ok: boolean;
  /** New balance after redemption. */
  balance: number;
  ledgerEntry?: PointsLedgerEntry;
  reason?: string;
}

/**
 * Validate and stage a redemption. Returns the ledger entry the caller
 * should persist, or an explanation when the redemption can't happen.
 * Stateless — the caller writes the entry to the store.
 */
export function redeem(
  account: LoyaltyAccount,
  rewardId: string,
  now: Date = new Date()
): RedemptionResult {
  const reward = REWARD_CATALOG.find((r) => r.id === rewardId);
  if (!reward) {
    return {
      ok: false,
      balance: computeBalance(account),
      reason: "That reward is no longer available.",
    };
  }
  const balance = computeBalance(account);
  if (balance < reward.cost) {
    return {
      ok: false,
      balance,
      reason: `You need ${reward.cost - balance} more points to redeem this.`,
    };
  }

  const ledgerEntry: PointsLedgerEntry = {
    id: `redeem-${now.getTime()}`,
    type: "redemption",
    delta: -reward.cost,
    description: `Redeemed: ${reward.label}`,
    createdAt: now.toISOString(),
    referenceId: reward.id,
  };

  return {
    ok: true,
    balance: balance - reward.cost,
    ledgerEntry,
  };
}

/* ── Demo seed (storybook + offline rendering) ──────────────── */

export const DEMO_ACCOUNT: LoyaltyAccount = {
  userId: "demo",
  trailing12mSpend: 612.4,
  ledger: [
    {
      id: "seed-1",
      type: "order",
      delta: 84,
      description: "Order LM-20451",
      createdAt: "2026-04-12T17:22:00.000Z",
    },
    {
      id: "seed-2",
      type: "review",
      delta: 50,
      description: "Verified review · Calm Drops 10mg",
      createdAt: "2026-03-30T14:08:00.000Z",
    },
    {
      id: "seed-3",
      type: "outcome",
      delta: 25,
      description: "Weekly outcome check-in",
      createdAt: "2026-03-21T09:01:00.000Z",
    },
    {
      id: "seed-4",
      type: "order",
      delta: 132,
      description: "Order LM-20338",
      createdAt: "2026-02-18T11:45:00.000Z",
    },
    {
      id: "seed-5",
      type: "redemption",
      delta: -500,
      description: "Redeemed: $5 store credit",
      createdAt: "2026-01-29T18:34:00.000Z",
    },
    {
      id: "seed-6",
      type: "bonus",
      delta: 100,
      description: "Birthday bonus",
      createdAt: "2026-01-04T08:00:00.000Z",
    },
  ],
};

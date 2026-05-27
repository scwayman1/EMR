// ─────────────────────────────────────────────────────────────────────────────
// Nav badge semantic computation
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions that translate raw counts/state into a semantic "what should
// the user actually know about this section?" badge.
//
// Each `compute*Badge` returns `null` for the silent-green ("ok") case so the
// nav rail stays calm — only sections that need attention render a pill.
//
// Severity ladder (lowest → highest):
//   ok < info < warn < critical
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeSeverity = "critical" | "warn" | "info" | "ok";

export interface NavBadge {
  /** Short scannable text. e.g. "8" | "1 CRITICAL" | "OK" */
  label: string;
  /** Optional one-phrase context shown on hover or below. e.g. "appeal due 48h" */
  context?: string;
  severity: BadgeSeverity;
}

/** Numeric rank for severity comparison. Higher = more urgent. */
export const SEVERITY_RANK: Record<BadgeSeverity, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  critical: 3,
};

/**
 * Pick the most-urgent badge from a list. Used by group headers to roll up
 * child item badges. Returns null when the list is empty or all entries are
 * null (silent green).
 */
export function aggregateBadge(badges: Array<NavBadge | null | undefined>): NavBadge | null {
  let best: NavBadge | null = null;
  for (const b of badges) {
    if (!b) continue;
    if (!best || SEVERITY_RANK[b.severity] > SEVERITY_RANK[best.severity]) {
      best = b;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Denials — the worst offender on most operator dashboards.
// Severity rules:
//   critical : any deadline ≤ 48h OR any unresolved item > 60d
//   warn     : any unresolved item > 30d
//   info     : at least one unresolved item but nothing aged
//   ok       : zero unresolved
// ─────────────────────────────────────────────────────────────────────────────
export function computeDenialsBadge(input: {
  unresolvedCount: number;
  oldestDays: number | null;
  /** Hours until next appeal deadline, or null if no upcoming deadline. */
  criticalDeadlineHours: number | null;
}): NavBadge | null {
  const { unresolvedCount, oldestDays, criticalDeadlineHours } = input;

  if (unresolvedCount <= 0) return null;

  const deadlineImminent =
    criticalDeadlineHours !== null && criticalDeadlineHours <= 48;
  const veryAged = oldestDays !== null && oldestDays > 60;

  if (deadlineImminent || veryAged) {
    const label = `${unresolvedCount} CRITICAL`;
    let context: string | undefined;
    if (deadlineImminent) {
      const hrs = Math.max(0, Math.round(criticalDeadlineHours!));
      context = `appeal due ${hrs}h`;
    } else if (veryAged) {
      context = `oldest ${oldestDays}d`;
    }
    return { label, context, severity: "critical" };
  }

  if (oldestDays !== null && oldestDays > 30) {
    return {
      label: `${unresolvedCount} aging`,
      context: `oldest ${oldestDays}d`,
      severity: "warn",
    };
  }

  return {
    label: `${unresolvedCount} pending`,
    severity: "info",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals
//   critical : any emergency in the queue
//   warn     : any pending
//   ok       : empty queue
// ─────────────────────────────────────────────────────────────────────────────
export function computeApprovalsBadge(input: {
  pendingCount: number;
  emergencyCount: number;
}): NavBadge | null {
  const { pendingCount, emergencyCount } = input;

  if (emergencyCount > 0) {
    return {
      label: `${emergencyCount} EMERGENCY`,
      context:
        pendingCount > emergencyCount
          ? `${pendingCount} total pending`
          : undefined,
      severity: "critical",
    };
  }

  if (pendingCount > 0) {
    return {
      label: `${pendingCount} pending`,
      severity: "warn",
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labs
//   critical : any abnormal AND unsigned (something genuinely off + not seen)
//   warn     : unsigned exists, none flagged abnormal
//   ok       : everything signed
// ─────────────────────────────────────────────────────────────────────────────
export function computeLabsBadge(input: {
  unsignedCount: number;
  abnormalCount: number;
}): NavBadge | null {
  const { unsignedCount, abnormalCount } = input;

  if (unsignedCount <= 0) return null;

  if (abnormalCount > 0) {
    return {
      label: `${abnormalCount} abnormal`,
      context:
        unsignedCount > abnormalCount
          ? `${unsignedCount} unsigned total`
          : `${unsignedCount} unsigned`,
      severity: "critical",
    };
  }

  return {
    label: `${unsignedCount} unsigned`,
    severity: "warn",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Refills — never critical on its own; pending requests just need a sign-off.
//   warn : any pending
//   ok   : empty
// ─────────────────────────────────────────────────────────────────────────────
export function computeRefillsBadge(input: { pendingCount: number }): NavBadge | null {
  const { pendingCount } = input;
  if (pendingCount <= 0) return null;
  return {
    label: `${pendingCount} pending`,
    severity: "warn",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aging A/R
//   critical : > $10k past-due OR oldest > 60d
//   warn     : any past-due > $0
//   ok       : nothing past-due
// ─────────────────────────────────────────────────────────────────────────────
export function computeAgingBadge(input: {
  totalPastDueCents: number;
  oldestDays: number | null;
}): NavBadge | null {
  const { totalPastDueCents, oldestDays } = input;

  if (totalPastDueCents <= 0) return null;

  const overTenK = totalPastDueCents > 10_000 * 100;
  const veryAged = oldestDays !== null && oldestDays > 60;

  const dollars = formatDollarsShort(totalPastDueCents);

  if (overTenK || veryAged) {
    return {
      label: `${dollars} past-due`,
      context: veryAged ? `oldest ${oldestDays}d` : "over $10k threshold",
      severity: "critical",
    };
  }

  return {
    label: `${dollars} past-due`,
    context:
      oldestDays !== null && oldestDays > 0 ? `oldest ${oldestDays}d` : undefined,
    severity: "warn",
  };
}

/**
 * Compact dollar formatting for badges. $0–$999 → "$N", $1k+ → "$Nk", $1M+
 * → "$N.NM". Trims trailing zeroes for the M case so badges stay scannable.
 */
function formatDollarsShort(cents: number): string {
  const dollars = Math.round(cents / 100);
  if (dollars < 1_000) return `$${dollars}`;
  if (dollars < 1_000_000) return `$${Math.round(dollars / 1000)}k`;
  const millions = dollars / 1_000_000;
  const trimmed =
    millions >= 10
      ? Math.round(millions).toString()
      : (Math.round(millions * 10) / 10).toString();
  return `$${trimmed}M`;
}

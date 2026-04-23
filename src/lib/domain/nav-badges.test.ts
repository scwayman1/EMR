import { describe, expect, it } from "vitest";
import {
  aggregateBadge,
  computeAgingBadge,
  computeApprovalsBadge,
  computeDenialsBadge,
  computeLabsBadge,
  computeRefillsBadge,
  SEVERITY_RANK,
  type NavBadge,
} from "./nav-badges";

// ─────────────────────────────────────────────────────────────────────────────
// computeDenialsBadge
// ─────────────────────────────────────────────────────────────────────────────
describe("computeDenialsBadge", () => {
  it("returns null when there are no unresolved denials (silent green)", () => {
    expect(
      computeDenialsBadge({
        unresolvedCount: 0,
        oldestDays: null,
        criticalDeadlineHours: null,
      })
    ).toBeNull();
  });

  it("returns null even when negative unresolved count is somehow passed", () => {
    expect(
      computeDenialsBadge({
        unresolvedCount: -1,
        oldestDays: 10,
        criticalDeadlineHours: 5,
      })
    ).toBeNull();
  });

  it("flags critical when an appeal deadline is within 48h", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 1,
      oldestDays: 5,
      criticalDeadlineHours: 24,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.label).toBe("1 CRITICAL");
    expect(badge?.context).toBe("appeal due 24h");
  });

  it("treats 48h exactly as still critical (boundary)", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 3,
      oldestDays: 10,
      criticalDeadlineHours: 48,
    });
    expect(badge?.severity).toBe("critical");
  });

  it("flags critical when oldest unresolved is > 60d, regardless of deadline", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 2,
      oldestDays: 75,
      criticalDeadlineHours: null,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.context).toBe("oldest 75d");
  });

  it("does not flag critical at exactly 60d (boundary — must be strictly greater)", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 1,
      oldestDays: 60,
      criticalDeadlineHours: null,
    });
    expect(badge?.severity).toBe("warn");
  });

  it("flags warn when oldest is > 30d and < 60d", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 4,
      oldestDays: 45,
      criticalDeadlineHours: 200,
    });
    expect(badge?.severity).toBe("warn");
    expect(badge?.label).toBe("4 aging");
    expect(badge?.context).toBe("oldest 45d");
  });

  it("flags info when at least one unresolved but nothing aged", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 1,
      oldestDays: 5,
      criticalDeadlineHours: 240,
    });
    expect(badge?.severity).toBe("info");
    expect(badge?.label).toBe("1 pending");
  });

  it("rounds fractional deadline hours for display", () => {
    const badge = computeDenialsBadge({
      unresolvedCount: 1,
      oldestDays: 1,
      criticalDeadlineHours: 12.6,
    });
    expect(badge?.context).toBe("appeal due 13h");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeApprovalsBadge
// ─────────────────────────────────────────────────────────────────────────────
describe("computeApprovalsBadge", () => {
  it("returns null when queue is empty", () => {
    expect(
      computeApprovalsBadge({ pendingCount: 0, emergencyCount: 0 })
    ).toBeNull();
  });

  it("flags critical when an emergency is in the queue", () => {
    const badge = computeApprovalsBadge({
      pendingCount: 5,
      emergencyCount: 1,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.label).toBe("1 EMERGENCY");
    expect(badge?.context).toBe("5 total pending");
  });

  it("omits context when the emergency count equals the pending count", () => {
    const badge = computeApprovalsBadge({
      pendingCount: 2,
      emergencyCount: 2,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.context).toBeUndefined();
  });

  it("flags warn when only normal pending requests are present", () => {
    const badge = computeApprovalsBadge({
      pendingCount: 4,
      emergencyCount: 0,
    });
    expect(badge?.severity).toBe("warn");
    expect(badge?.label).toBe("4 pending");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeLabsBadge
// ─────────────────────────────────────────────────────────────────────────────
describe("computeLabsBadge", () => {
  it("returns null when nothing is unsigned", () => {
    expect(
      computeLabsBadge({ unsignedCount: 0, abnormalCount: 0 })
    ).toBeNull();
  });

  it("flags critical when an abnormal lab sits unsigned", () => {
    const badge = computeLabsBadge({
      unsignedCount: 5,
      abnormalCount: 2,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.label).toBe("2 abnormal");
    expect(badge?.context).toBe("5 unsigned total");
  });

  it("flags warn when unsigned exists but none are abnormal", () => {
    const badge = computeLabsBadge({
      unsignedCount: 3,
      abnormalCount: 0,
    });
    expect(badge?.severity).toBe("warn");
    expect(badge?.label).toBe("3 unsigned");
  });

  it("uses singular context when abnormal == unsigned (all abnormal)", () => {
    const badge = computeLabsBadge({
      unsignedCount: 2,
      abnormalCount: 2,
    });
    expect(badge?.context).toBe("2 unsigned");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeRefillsBadge
// ─────────────────────────────────────────────────────────────────────────────
describe("computeRefillsBadge", () => {
  it("returns null when nothing is pending", () => {
    expect(computeRefillsBadge({ pendingCount: 0 })).toBeNull();
  });

  it("flags warn for any pending refill", () => {
    const badge = computeRefillsBadge({ pendingCount: 1 });
    expect(badge?.severity).toBe("warn");
    expect(badge?.label).toBe("1 pending");
  });

  it("scales label with pending count", () => {
    const badge = computeRefillsBadge({ pendingCount: 25 });
    expect(badge?.label).toBe("25 pending");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAgingBadge
// ─────────────────────────────────────────────────────────────────────────────
describe("computeAgingBadge", () => {
  it("returns null when nothing is past due", () => {
    expect(
      computeAgingBadge({ totalPastDueCents: 0, oldestDays: null })
    ).toBeNull();
  });

  it("flags critical when past due exceeds $10k", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 12_500 * 100, // $12,500
      oldestDays: 20,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.label).toBe("$13k past-due");
    expect(badge?.context).toBe("over $10k threshold");
  });

  it("does NOT flag critical at exactly $10k (boundary — must be strictly greater)", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 10_000 * 100,
      oldestDays: 20,
    });
    expect(badge?.severity).toBe("warn");
  });

  it("flags critical when oldest is > 60d even if dollar amount is small", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 500 * 100, // $500
      oldestDays: 90,
    });
    expect(badge?.severity).toBe("critical");
    expect(badge?.context).toBe("oldest 90d");
  });

  it("flags warn for any past-due under both critical thresholds", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 250 * 100,
      oldestDays: 15,
    });
    expect(badge?.severity).toBe("warn");
    expect(badge?.context).toBe("oldest 15d");
  });

  it("formats dollars in millions for very large amounts", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 2_500_000 * 100,
      oldestDays: null,
    });
    expect(badge?.label).toBe("$2.5M past-due");
  });

  it("formats dollars under $1k as raw dollars", () => {
    const badge = computeAgingBadge({
      totalPastDueCents: 750 * 100,
      oldestDays: 10,
    });
    expect(badge?.label).toBe("$750 past-due");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// aggregateBadge — group rollup
// ─────────────────────────────────────────────────────────────────────────────
describe("aggregateBadge", () => {
  const critical: NavBadge = { label: "x", severity: "critical" };
  const warn: NavBadge = { label: "x", severity: "warn" };
  const info: NavBadge = { label: "x", severity: "info" };
  const ok: NavBadge = { label: "OK", severity: "ok" };

  it("returns null for an empty list", () => {
    expect(aggregateBadge([])).toBeNull();
  });

  it("returns null when all entries are null/undefined", () => {
    expect(aggregateBadge([null, undefined, null])).toBeNull();
  });

  it("picks critical over warn over info", () => {
    expect(aggregateBadge([info, warn, critical])?.severity).toBe("critical");
    expect(aggregateBadge([info, warn])?.severity).toBe("warn");
    expect(aggregateBadge([info])?.severity).toBe("info");
  });

  it("ignores nulls mixed in among badges", () => {
    expect(aggregateBadge([null, warn, null, info])?.severity).toBe("warn");
  });

  it("treats ok as the lowest severity", () => {
    expect(aggregateBadge([ok, info])?.severity).toBe("info");
    expect(aggregateBadge([ok, ok])?.severity).toBe("ok");
  });

  it("returns the first matching badge object when severities tie", () => {
    const a: NavBadge = { label: "first", severity: "warn" };
    const b: NavBadge = { label: "second", severity: "warn" };
    expect(aggregateBadge([a, b])?.label).toBe("first");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY_RANK exposure (sanity check for downstream consumers)
// ─────────────────────────────────────────────────────────────────────────────
describe("SEVERITY_RANK", () => {
  it("orders ok < info < warn < critical", () => {
    expect(SEVERITY_RANK.ok).toBeLessThan(SEVERITY_RANK.info);
    expect(SEVERITY_RANK.info).toBeLessThan(SEVERITY_RANK.warn);
    expect(SEVERITY_RANK.warn).toBeLessThan(SEVERITY_RANK.critical);
  });
});

import { describe, expect, it } from "vitest";
import {
  SIDE_EFFECT_CODES,
  SIDE_EFFECT_OPTIONS,
  groupBySeverity,
  isSideEffectCode,
  resolveLabel,
  severityBucket,
  topSideEffects,
  type SideEffectCode,
  type SideEffectReportLike,
} from "./side-effects";

function r(
  effect: SideEffectCode,
  severity: number,
  extra: Partial<SideEffectReportLike> = {}
): SideEffectReportLike {
  return { effect, severity, ...extra };
}

describe("SIDE_EFFECT_OPTIONS", () => {
  it("covers every enum code with a non-empty human label", () => {
    for (const code of SIDE_EFFECT_CODES) {
      const label = SIDE_EFFECT_OPTIONS[code];
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("includes the required clinical set", () => {
    // Sanity check vs CLAUDE.md's named options — guards against rename drift.
    expect(SIDE_EFFECT_OPTIONS.dry_mouth).toBe("Dry mouth");
    expect(SIDE_EFFECT_OPTIONS.memory_fog).toBe("Memory fog");
    expect(SIDE_EFFECT_OPTIONS.increased_appetite).toBe("Increased appetite");
    expect(SIDE_EFFECT_OPTIONS.other).toBe("Other");
  });
});

describe("severityBucket", () => {
  it("maps 1-3 → mild", () => {
    expect(severityBucket(1)).toBe("mild");
    expect(severityBucket(2)).toBe("mild");
    expect(severityBucket(3)).toBe("mild");
  });
  it("maps 4-6 → moderate", () => {
    expect(severityBucket(4)).toBe("moderate");
    expect(severityBucket(6)).toBe("moderate");
  });
  it("maps 7-10 → severe", () => {
    expect(severityBucket(7)).toBe("severe");
    expect(severityBucket(10)).toBe("severe");
  });
  it("clamps non-finite input to the lowest bucket", () => {
    expect(severityBucket(Number.NaN)).toBe("mild");
  });
});

describe("resolveLabel", () => {
  it("returns the canonical label for known codes", () => {
    expect(resolveLabel(r("dizziness", 5))).toBe("Dizziness");
  });

  it("honors customEffect when effect is 'other'", () => {
    expect(
      resolveLabel(r("other", 5, { customEffect: "  Tinnitus  " }))
    ).toBe("Tinnitus");
  });

  it("falls back to 'Other' when effect=other but customEffect is blank", () => {
    expect(resolveLabel(r("other", 5, { customEffect: "   " }))).toBe("Other");
    expect(resolveLabel(r("other", 5))).toBe("Other");
  });

  it("ignores customEffect for non-other codes", () => {
    expect(
      resolveLabel(r("headache", 8, { customEffect: "Weirdly specific" }))
    ).toBe("Headache");
  });
});

describe("groupBySeverity", () => {
  it("returns empty buckets for an empty list", () => {
    const out = groupBySeverity([]);
    expect(out).toEqual({ mild: [], moderate: [], severe: [] });
  });

  it("splits reports into the correct buckets", () => {
    const reports = [
      r("anxiety", 2), // mild
      r("headache", 5), // moderate
      r("dizziness", 9), // severe
      r("nausea", 7), // severe
      r("dry_mouth", 3), // mild
    ];
    const out = groupBySeverity(reports);
    expect(out.mild).toHaveLength(2);
    expect(out.moderate).toHaveLength(1);
    expect(out.severe).toHaveLength(2);
    expect(out.severe.map((x) => x.effect)).toEqual(["dizziness", "nausea"]);
  });
});

describe("topSideEffects", () => {
  it("returns [] when given no reports", () => {
    expect(topSideEffects([])).toEqual([]);
  });

  it("returns [] when limit is zero or negative", () => {
    expect(topSideEffects([r("anxiety", 5)], 0)).toEqual([]);
    expect(topSideEffects([r("anxiety", 5)], -1)).toEqual([]);
  });

  it("ranks by count, descending", () => {
    const reports = [
      r("dry_mouth", 2),
      r("dry_mouth", 3),
      r("dry_mouth", 4),
      r("anxiety", 6),
      r("anxiety", 7),
      r("nausea", 1),
    ];
    const out = topSideEffects(reports, 5);
    expect(out.map((e) => e.effect)).toEqual([
      "dry_mouth",
      "anxiety",
      "nausea",
    ]);
    expect(out[0].count).toBe(3);
    expect(out[1].count).toBe(2);
    expect(out[2].count).toBe(1);
  });

  it("computes avg severity rounded to 1 decimal", () => {
    const reports = [
      r("dry_mouth", 2),
      r("dry_mouth", 3),
      r("dry_mouth", 4), // avg = 3.0
      r("anxiety", 6),
      r("anxiety", 7), // avg = 6.5
    ];
    const out = topSideEffects(reports, 5);
    const dm = out.find((x) => x.effect === "dry_mouth");
    const ax = out.find((x) => x.effect === "anxiety");
    expect(dm?.avgSeverity).toBe(3);
    expect(ax?.avgSeverity).toBe(6.5);
  });

  it("tie-breaks equal counts by higher avg severity", () => {
    const reports = [
      r("headache", 2),
      r("headache", 2), // avg 2
      r("dizziness", 8),
      r("dizziness", 9), // avg 8.5
    ];
    const out = topSideEffects(reports, 5);
    expect(out[0].effect).toBe("dizziness");
    expect(out[1].effect).toBe("headache");
  });

  it("falls back to alphabetical label order when count and severity tie", () => {
    const reports = [r("anxiety", 5), r("headache", 5)];
    const out = topSideEffects(reports, 5);
    // "Anxiety" < "Headache"
    expect(out[0].effect).toBe("anxiety");
    expect(out[1].effect).toBe("headache");
  });

  it("respects the limit parameter", () => {
    const reports = [
      r("dry_mouth", 2),
      r("dry_mouth", 3),
      r("anxiety", 5),
      r("nausea", 6),
      r("headache", 7),
    ];
    const out = topSideEffects(reports, 2);
    expect(out).toHaveLength(2);
    expect(out[0].effect).toBe("dry_mouth");
  });

  it("attaches the human label on each entry", () => {
    const out = topSideEffects([r("memory_fog", 5)], 5);
    expect(out[0].label).toBe("Memory fog");
  });

  it("ignores non-finite severities when averaging", () => {
    const reports = [
      r("anxiety", 4),
      r("anxiety", Number.NaN),
    ];
    const out = topSideEffects(reports, 1);
    // NaN contributes 0 to the sum — avg = (4 + 0) / 2 = 2
    expect(out[0].count).toBe(2);
    expect(out[0].avgSeverity).toBe(2);
  });
});

describe("isSideEffectCode", () => {
  it("accepts every canonical code", () => {
    for (const c of SIDE_EFFECT_CODES) {
      expect(isSideEffectCode(c)).toBe(true);
    }
  });
  it("rejects unknown or non-string values", () => {
    expect(isSideEffectCode("not_a_thing")).toBe(false);
    expect(isSideEffectCode(42)).toBe(false);
    expect(isSideEffectCode(null)).toBe(false);
    expect(isSideEffectCode(undefined)).toBe(false);
  });
});

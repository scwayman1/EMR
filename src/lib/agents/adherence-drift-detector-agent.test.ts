import { describe, expect, it } from "vitest";
import {
  classifyAdherence,
  type LogInput,
  type RegimenInput,
} from "./adherence-drift-detector-agent";

const NOW = new Date("2026-04-19T09:00:00Z");

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function regimen(overrides: Partial<RegimenInput> = {}): RegimenInput {
  return {
    id: "reg-1",
    productName: "Test Tincture",
    frequencyPerDay: 2,
    startDate: daysAgo(30),
    ...overrides,
  };
}

function logs(...whens: Date[]): LogInput[] {
  return whens.map((loggedAt) => ({ loggedAt }));
}

describe("classifyAdherence", () => {
  it("returns null for healthy adherence (≥60% recent, no drift)", () => {
    // 12 doses in last 7 days on freq=2/day → expected 14, actual 12 = 86%
    const recent = Array.from({ length: 12 }, (_, i) => hoursAgo(6 + i * 6));
    // baseline 25 doses in prior 14 days → expected 28, actual 25 = 89%
    const baseline = Array.from({ length: 25 }, (_, i) => daysAgo(8 + i * 0.5));
    const result = classifyAdherence(regimen(), logs(...recent, ...baseline), NOW);
    expect(result).toBeNull();
  });

  it("flags urgent when regimen is >72h old AND last dose was >72h ago", () => {
    // Regimen 30 days old, last dose 4 days ago
    const result = classifyAdherence(
      regimen(),
      logs(daysAgo(4), daysAgo(10)),
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("urgent");
    expect(result!.metadata.checkKind).toBe("stalled");
  });

  it("does NOT flag urgent on a fresh regimen (<72h old) with no doses", () => {
    // Regimen started 48h ago, no doses yet
    const result = classifyAdherence(
      regimen({ startDate: hoursAgo(48) }),
      [],
      NOW,
    );
    // Falls through to other buckets; recentPct=0 so it should hit CONCERN
    // (under 30% is concern regardless of baseline). But importantly, not urgent.
    expect(result?.severity).not.toBe("urgent");
  });

  it("flags concern on a significant drift vs baseline (≥25pp drop)", () => {
    // Baseline very high: 25 doses in prior 14 days (89%)
    const baseline = Array.from({ length: 25 }, (_, i) => daysAgo(8 + i * 0.5));
    // Recent: 7 doses in last 7 days on freq=2/day → 50%. 89 → 50 = 39pp drop.
    const recent = Array.from({ length: 7 }, (_, i) => hoursAgo(6 + i * 18));
    const result = classifyAdherence(regimen(), logs(...recent, ...baseline), NOW);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("concern");
    expect(result!.metadata.checkKind).toBe("drift");
  });

  it("flags concern on severely low recent pace (<30%)", () => {
    // Recent: 3 doses in last 7 days on freq=2/day → 21%. Baseline also low.
    const recent = [hoursAgo(12), hoursAgo(36), hoursAgo(60)];
    const baseline: Date[] = [];
    const result = classifyAdherence(regimen(), logs(...recent, ...baseline), NOW);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("concern");
    expect(result!.metadata.checkKind).toBe("low_pace");
  });

  it("flags notable on chronic 30-60% adherence without a baseline drop", () => {
    // Baseline ~45%: 13 doses in prior 14 days → 13/28 = 46%
    const baseline = Array.from({ length: 13 }, (_, i) => daysAgo(8 + i * 1));
    // Recent ~50%: 7 doses in last 7 days → 50%. Drop = 46-50 = -4 (no drop).
    const recent = Array.from({ length: 7 }, (_, i) => hoursAgo(6 + i * 20));
    const result = classifyAdherence(regimen(), logs(...recent, ...baseline), NOW);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("notable");
    expect(result!.metadata.checkKind).toBe("chronic_low");
  });

  it("reports the stalled hoursSinceLastLog in metadata", () => {
    const result = classifyAdherence(regimen(), logs(hoursAgo(96)), NOW);
    expect(result?.severity).toBe("urgent");
    expect(result?.metadata.hoursSinceLastLog).toBe(96);
  });

  it("does not crash on frequencyPerDay=0 regimens", () => {
    const result = classifyAdherence(
      regimen({ frequencyPerDay: 0, startDate: daysAgo(30) }),
      [],
      NOW,
    );
    // Stalled check still applies (regimen old, no doses)
    expect(result?.severity).toBe("urgent");
  });
});

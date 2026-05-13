import { describe, expect, it } from "vitest";
import {
  DUAL_PROTOCOLS,
  buildTimeline,
  findInteractions,
  findProtocolForIcd10,
  type DualProtocol,
  type ProtocolStep,
} from "./dual-protocols";

// EMR-092 — dual treatment protocols (Western + Eastern)

const lbpProtocol = DUAL_PROTOCOLS.find(
  (p) => p.id === "chronic-low-back-pain",
)!;

describe("DUAL_PROTOCOLS catalogue", () => {
  it("includes at least the three Wave 15 seed protocols", () => {
    const ids = DUAL_PROTOCOLS.map((p) => p.id);
    expect(ids).toContain("chronic-low-back-pain");
    expect(ids).toContain("ptsd-night-symptoms");
    expect(ids).toContain("chemo-induced-nausea");
  });

  it("every protocol has both arms populated", () => {
    for (const p of DUAL_PROTOCOLS) {
      expect(p.westernSteps.length).toBeGreaterThan(0);
      expect(p.easternSteps.length).toBeGreaterThan(0);
      expect(p.goals.length).toBeGreaterThan(0);
    }
  });

  it("step ids are unique within a protocol", () => {
    for (const p of DUAL_PROTOCOLS) {
      const ids = [...p.westernSteps, ...p.easternSteps].map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("consent-gated steps refer to real step ids", () => {
    for (const p of DUAL_PROTOCOLS) {
      const allIds = new Set(
        [...p.westernSteps, ...p.easternSteps].map((s) => s.id),
      );
      for (const gated of p.consentGated) {
        expect(allIds.has(gated)).toBe(true);
      }
    }
  });
});

describe("buildTimeline", () => {
  it("merges and sorts both arms by start day", () => {
    const timeline = buildTimeline(lbpProtocol);
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i - 1]!.day).toBeLessThanOrEqual(timeline[i]!.day);
    }
  });

  it("returns one entry per step", () => {
    const count =
      lbpProtocol.westernSteps.length + lbpProtocol.easternSteps.length;
    expect(buildTimeline(lbpProtocol).length).toBe(count);
  });
});

describe("findInteractions", () => {
  it("flags warfarin + CBD as danger", () => {
    const protocol: DualProtocol = {
      id: "test-anticoag-cbd",
      condition: "Atrial fibrillation",
      icd10: ["I48.91"],
      description: "test",
      westernSteps: [
        {
          id: "w-anticoag",
          arm: "western",
          kind: "medication",
          label: "Warfarin 5mg daily",
          startDay: 0,
          cadence: "daily",
        },
      ],
      easternSteps: [
        {
          id: "e-cbd",
          arm: "eastern",
          kind: "cannabis",
          label: "Full-spectrum CBD tincture",
          startDay: 0,
          cadence: "daily",
        },
      ],
      goals: ["maintain INR"],
      consentGated: ["e-cbd"],
    };
    const conflicts = findInteractions(protocol);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0]!.severity).toBe("danger");
    expect(conflicts[0]!.explanation).toMatch(/CYP|INR/);
  });

  it("flags SSRI + St. John's wort as serotonin syndrome risk", () => {
    const protocol: DualProtocol = {
      id: "ssri-test",
      condition: "MDD",
      icd10: ["F33.0"],
      description: "test",
      westernSteps: [
        {
          id: "w-ssri",
          arm: "western",
          kind: "medication",
          label: "Sertraline 100mg daily",
          startDay: 0,
        },
      ],
      easternSteps: [
        {
          id: "e-sjw",
          arm: "eastern",
          kind: "herbal",
          label: "St John's wort 300mg TID",
          startDay: 0,
        },
      ],
      goals: ["remission"],
      consentGated: [],
    };
    const conflicts = findInteractions(protocol);
    expect(conflicts[0]!.severity).toBe("danger");
  });

  it("flags benzo + THC as caution", () => {
    const protocol: DualProtocol = {
      id: "bz-thc",
      condition: "Anxiety",
      icd10: ["F41.1"],
      description: "test",
      westernSteps: [
        {
          id: "w-bz",
          arm: "western",
          kind: "medication",
          label: "Lorazepam 0.5mg BID",
          startDay: 0,
        },
      ],
      easternSteps: [
        {
          id: "e-thc",
          arm: "eastern",
          kind: "cannabis",
          label: "THC-dominant tincture HS",
          startDay: 0,
        },
      ],
      goals: ["sleep"],
      consentGated: ["e-thc"],
    };
    const conflicts = findInteractions(protocol);
    expect(conflicts[0]!.severity).toBe("caution");
  });

  it("returns no conflicts for safe pairing", () => {
    const protocol: DualProtocol = {
      id: "safe-pair",
      condition: "HTN",
      icd10: ["I10"],
      description: "test",
      westernSteps: [
        {
          id: "w-amlo",
          arm: "western",
          kind: "medication",
          label: "Amlodipine 5mg daily",
          startDay: 0,
        },
      ],
      easternSteps: [
        {
          id: "e-yoga",
          arm: "eastern",
          kind: "movement",
          label: "Daily yoga 20 min",
          startDay: 0,
        },
      ],
      goals: ["BP < 130/80"],
      consentGated: [],
    };
    expect(findInteractions(protocol).length).toBe(0);
  });
});

describe("findProtocolForIcd10", () => {
  it("matches an exact code", () => {
    const p = findProtocolForIcd10("M54.5");
    expect(p?.id).toBe("chronic-low-back-pain");
  });

  it("matches a sibling subcode by prefix", () => {
    const p = findProtocolForIcd10("M54.99"); // not in list, but same M54 family
    expect(p?.id).toBe("chronic-low-back-pain");
  });

  it("is case-insensitive and trims whitespace", () => {
    const p = findProtocolForIcd10("  i48.91  "); // not a registered one
    expect(p).toBeNull(); // afib protocol isn't seeded
    const ptsd = findProtocolForIcd10("f43.10");
    expect(ptsd?.id).toBe("ptsd-night-symptoms");
  });

  it("returns null when no protocol exists for the code family", () => {
    expect(findProtocolForIcd10("E11.9")).toBeNull();
  });
});

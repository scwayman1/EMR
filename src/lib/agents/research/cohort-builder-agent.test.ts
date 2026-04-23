import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: { findMany: vi.fn() },
    outcomeLog: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import { cohortBuilderAgent } from "./cohort-builder-agent";

// Minimal AgentContext shim — the agent only calls ctx.log, so a spy suffices.
const makeCtx = () =>
  ({
    log: vi.fn(),
  }) as unknown as Parameters<typeof cohortBuilderAgent.run>[1];

function reset() {
  hoisted.mockPrisma.patient.findMany.mockReset();
  hoisted.mockPrisma.outcomeLog.findMany.mockReset();
}
beforeEach(reset);

describe("cohortBuilder", () => {
  it("returns an empty cohort when no patients match", async () => {
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([]);
    const result = await cohortBuilderAgent.run(
      { organizationId: "org_1" },
      makeCtx(),
    );
    expect(result.size).toBe(0);
    expect(result.patientIds).toEqual([]);
    expect(result.medianAgeDays).toBeNull();
    expect(result.metricBaselines).toEqual({});
    // outcomeLog.findMany should NOT be called if there are no patients.
    expect(hoisted.mockPrisma.outcomeLog.findMany).not.toHaveBeenCalled();
  });

  it("filters out patients below the minOutcomeLogs threshold", async () => {
    const now = Date.now();
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([
      { id: "p1", dateOfBirth: new Date(now - 30 * 365 * 86_400_000) },
      { id: "p2", dateOfBirth: new Date(now - 40 * 365 * 86_400_000) },
      { id: "p3", dateOfBirth: null },
    ]);
    hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([
      // p1: 2 logs → below threshold of 3
      { patientId: "p1", metric: "pain", value: 7 },
      { patientId: "p1", metric: "sleep", value: 3 },
      // p2: 4 logs → passes
      { patientId: "p2", metric: "pain", value: 5 },
      { patientId: "p2", metric: "pain", value: 4 },
      { patientId: "p2", metric: "sleep", value: 6 },
      { patientId: "p2", metric: "mood", value: 7 },
      // p3: 3 logs → passes
      { patientId: "p3", metric: "pain", value: 8 },
      { patientId: "p3", metric: "pain", value: 6 },
      { patientId: "p3", metric: "sleep", value: 5 },
    ]);

    const result = await cohortBuilderAgent.run(
      { organizationId: "org_1", minOutcomeLogs: 3 },
      makeCtx(),
    );

    expect(result.size).toBe(2);
    expect(result.patientIds.sort()).toEqual(["p2", "p3"]);
    // Baselines are computed across ALL cohort candidates (pre-filter),
    // since this is a research snapshot of the condition at intake.
    expect(result.metricBaselines.pain).toEqual({
      mean: Number(((7 + 5 + 4 + 8 + 6) / 5).toFixed(3)),
      sampleSize: 5,
    });
    expect(result.metricBaselines.sleep.sampleSize).toBe(3);
    expect(result.metricBaselines.mood).toEqual({ mean: 7, sampleSize: 1 });
  });

  it("computes median age in days across patients with known DOB only", async () => {
    const now = Date.now();
    const dob = (years: number) => new Date(now - years * 365 * 86_400_000);
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([
      { id: "p1", dateOfBirth: dob(25) }, // 9_125 days
      { id: "p2", dateOfBirth: dob(40) }, // 14_600 days → median of 3 sorted
      { id: "p3", dateOfBirth: dob(60) }, // 21_900 days
      { id: "p4", dateOfBirth: null },
    ]);
    hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([]);

    const result = await cohortBuilderAgent.run(
      { organizationId: "org_1", minOutcomeLogs: 0 },
      makeCtx(),
    );

    expect(result.size).toBe(4);
    // Median of [9125, 14600, 21900] = 14600 (index 1 = floor(3/2))
    expect(result.medianAgeDays).toBe(40 * 365);
  });

  it("honors the criteria echo on the result", async () => {
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([]);
    const result = await cohortBuilderAgent.run(
      {
        organizationId: "org_1",
        memoryTag: "sleep",
        activeRegimenOnly: true,
        minOutcomeLogs: 5,
        lookbackDays: 180,
      },
      makeCtx(),
    );
    expect(result.criteria).toEqual({
      memoryTag: "sleep",
      activeRegimenOnly: true,
      minOutcomeLogs: 5,
      lookbackDays: 180,
    });
  });

  it("threads memoryTag + activeRegimenOnly into the patient query", async () => {
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([]);
    await cohortBuilderAgent.run(
      {
        organizationId: "org_1",
        memoryTag: "pain",
        activeRegimenOnly: true,
      },
      makeCtx(),
    );
    const where = hoisted.mockPrisma.patient.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe("org_1");
    expect(where.patientMemories).toBeDefined();
    expect(where.patientMemories.some.tags).toEqual({ has: "pain" });
    expect(where.dosingRegimens).toEqual({ some: { active: true } });
  });
});

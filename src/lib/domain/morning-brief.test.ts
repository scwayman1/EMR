import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoist the prisma mock so the loader picks up the mock when we import
// the module under test.
const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    encounter: { count: vi.fn() },
    agentJob: { count: vi.fn() },
    labResult: { count: vi.fn() },
    messageThread: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import { buildBriefContext } from "./morning-brief";

const ORG = "org_test";
const CLINICIAN = "usr_clinician";
const TODAY = new Date("2026-04-20T12:00:00Z");

beforeEach(() => {
  hoisted.mockPrisma.encounter.count.mockReset();
  hoisted.mockPrisma.agentJob.count.mockReset();
  hoisted.mockPrisma.labResult.count.mockReset();
  hoisted.mockPrisma.messageThread.findMany.mockReset();
});

function resolveAll({
  appts = 0,
  approvals = 0,
  labs = 0,
  threads = [] as Array<{
    patient: { firstName: string | null; lastName: string | null };
    triageSummary: string | null;
  }>,
} = {}) {
  hoisted.mockPrisma.encounter.count.mockResolvedValueOnce(appts);
  hoisted.mockPrisma.agentJob.count.mockResolvedValueOnce(approvals);
  hoisted.mockPrisma.labResult.count.mockResolvedValueOnce(labs);
  hoisted.mockPrisma.messageThread.findMany.mockResolvedValueOnce(threads);
}

describe("buildBriefContext", () => {
  it("returns a zeroed context when there are no appointments, approvals, labs, or emergencies", async () => {
    resolveAll();
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.appointmentsToday).toBe(0);
    expect(ctx.pendingApprovals).toBe(0);
    expect(ctx.newLabsToday).toBe(0);
    expect(ctx.emergencyFlags).toEqual([]);
    expect(ctx.hasCriticalSignal).toBe(false);
  });

  it("scopes every query to the organization", async () => {
    resolveAll({ appts: 3 });
    await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(hoisted.mockPrisma.encounter.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      })
    );
    expect(hoisted.mockPrisma.agentJob.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      })
    );
    expect(hoisted.mockPrisma.labResult.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: ORG }),
      })
    );
    expect(hoisted.mockPrisma.messageThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patient: { organizationId: ORG },
        }),
      })
    );
  });

  it("computes the date boundary at local midnight (not the raw input time)", async () => {
    resolveAll({ appts: 1 });
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.date.getHours()).toBe(0);
    expect(ctx.date.getMinutes()).toBe(0);
    expect(ctx.date.getSeconds()).toBe(0);
  });

  it("includes emergency flags formatted as 'First L.' with the triage summary", async () => {
    resolveAll({
      threads: [
        {
          patient: { firstName: "Ada", lastName: "Lovelace" },
          triageSummary: "chest pain radiating to left arm",
        },
        {
          patient: { firstName: "Grace", lastName: "Hopper" },
          triageSummary: null,
        },
      ],
    });
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.emergencyFlags).toEqual([
      "Ada L.: chest pain radiating to left arm",
      "Grace H.",
    ]);
    expect(ctx.hasCriticalSignal).toBe(true);
  });

  it("marks hasCriticalSignal=true when pendingApprovals >= 5, even with no emergencies", async () => {
    resolveAll({ approvals: 7 });
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.pendingApprovals).toBe(7);
    expect(ctx.emergencyFlags).toEqual([]);
    expect(ctx.hasCriticalSignal).toBe(true);
  });

  it("keeps hasCriticalSignal=false for a busy-but-calm day (appointments only)", async () => {
    resolveAll({ appts: 14, approvals: 1, labs: 2 });
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.appointmentsToday).toBe(14);
    expect(ctx.hasCriticalSignal).toBe(false);
  });

  it("handles missing patient name parts without throwing", async () => {
    resolveAll({
      threads: [
        {
          patient: { firstName: null, lastName: null },
          triageSummary: "unresponsive after dosing",
        },
      ],
    });
    const ctx = await buildBriefContext(ORG, CLINICIAN, TODAY);
    expect(ctx.emergencyFlags).toHaveLength(1);
    expect(ctx.emergencyFlags[0]).toContain("unresponsive after dosing");
  });

  it("runs all four queries in parallel (Promise.all), not sequentially", async () => {
    // If the code awaited sequentially, mocks would still resolve one-by-one
    // in call order. We assert that all four mocks are invoked before any
    // of them resolves by using deferred resolvers.
    let resolveAppts!: (n: number) => void;
    let resolveApprovals!: (n: number) => void;
    let resolveLabs!: (n: number) => void;
    let resolveThreads!: (t: unknown[]) => void;

    hoisted.mockPrisma.encounter.count.mockReturnValueOnce(
      new Promise<number>((r) => {
        resolveAppts = r;
      })
    );
    hoisted.mockPrisma.agentJob.count.mockReturnValueOnce(
      new Promise<number>((r) => {
        resolveApprovals = r;
      })
    );
    hoisted.mockPrisma.labResult.count.mockReturnValueOnce(
      new Promise<number>((r) => {
        resolveLabs = r;
      })
    );
    hoisted.mockPrisma.messageThread.findMany.mockReturnValueOnce(
      new Promise<unknown[]>((r) => {
        resolveThreads = r;
      })
    );

    const p = buildBriefContext(ORG, CLINICIAN, TODAY);

    // Yield once so the async code can fire all four calls before we resolve.
    await Promise.resolve();

    expect(hoisted.mockPrisma.encounter.count).toHaveBeenCalledTimes(1);
    expect(hoisted.mockPrisma.agentJob.count).toHaveBeenCalledTimes(1);
    expect(hoisted.mockPrisma.labResult.count).toHaveBeenCalledTimes(1);
    expect(hoisted.mockPrisma.messageThread.findMany).toHaveBeenCalledTimes(1);

    resolveAppts(1);
    resolveApprovals(0);
    resolveLabs(0);
    resolveThreads([]);

    await p;
  });
});

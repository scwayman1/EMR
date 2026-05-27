import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patientMemory: { findMany: vi.fn() },
    patient: { findMany: vi.fn() },
    outcomeLog: { findMany: vi.fn() },
    dosingRegimen: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  listOrgMemoryTags,
  getCohortExplorerView,
  MIN_COHORT_SIZE,
} from "./cohort-explorer";

function reset() {
  hoisted.mockPrisma.patientMemory.findMany.mockReset();
  hoisted.mockPrisma.patient.findMany.mockReset();
  hoisted.mockPrisma.outcomeLog.findMany.mockReset();
  hoisted.mockPrisma.dosingRegimen.findMany.mockReset();
  hoisted.mockPrisma.product.findMany.mockReset();
}
beforeEach(reset);

describe("listOrgMemoryTags", () => {
  it("returns [] when no memories exist", async () => {
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([]);
    const result = await listOrgMemoryTags("org_1");
    expect(result).toEqual([]);
  });

  it("counts distinct patients per tag and sorts desc", async () => {
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([
      { patientId: "p1", tags: ["sleep", "anxiety"] },
      { patientId: "p1", tags: ["sleep"] }, // same patient, same tag → still 1
      { patientId: "p2", tags: ["sleep"] },
      { patientId: "p3", tags: ["sleep", "pain"] },
      { patientId: "p4", tags: ["pain"] },
      { patientId: "p5", tags: ["anxiety"] },
    ]);
    const result = await listOrgMemoryTags("org_1");
    expect(result).toEqual([
      { tag: "sleep", patientCount: 3 },
      { tag: "anxiety", patientCount: 2 },
      { tag: "pain", patientCount: 2 },
    ]);
  });

  it("trims whitespace + drops empty-string tags", async () => {
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([
      { patientId: "p1", tags: ["  sleep  ", "", "pain"] },
    ]);
    const result = await listOrgMemoryTags("org_1");
    expect(result.find((r) => r.tag === "sleep")).toBeDefined();
    expect(result.find((r) => r.tag === "")).toBeUndefined();
    expect(result.find((r) => r.tag === "  sleep  ")).toBeUndefined();
  });

  it("honors the limit parameter", async () => {
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([
      { patientId: "p1", tags: ["a"] },
      { patientId: "p2", tags: ["b"] },
      { patientId: "p3", tags: ["c"] },
      { patientId: "p4", tags: ["d"] },
    ]);
    const result = await listOrgMemoryTags("org_1", 2);
    expect(result).toHaveLength(2);
  });

  it("scopes the Prisma query to the org + active memories", async () => {
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([]);
    await listOrgMemoryTags("org_xyz");
    const where =
      hoisted.mockPrisma.patientMemory.findMany.mock.calls[0][0].where;
    expect(where.patient.organizationId).toBe("org_xyz");
    expect(where.patient.deletedAt).toBeNull();
    expect(where.tags).toEqual({ isEmpty: false });
    expect(where.OR).toBeDefined();
  });
});

describe("getCohortExplorerView", () => {
  it("returns belowMinCohort when fewer than MIN_COHORT_SIZE match", async () => {
    // cohortBuilderAgent queries patient + outcomeLog internally. Return a
    // tiny cohort.
    hoisted.mockPrisma.patient.findMany.mockResolvedValue([
      { id: "p1", dateOfBirth: null },
    ]);
    hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([]);

    const view = await getCohortExplorerView({
      organizationId: "org_1",
      memoryTag: "sleep",
    });

    expect(view.belowMinCohort).toBe(true);
    expect(view.cohortSize).toBe(1);
    expect(view.popularProducts).toEqual([]);
    expect(view.metricBaselines).toEqual([]);
    expect(view.clinicianPickUsageRate).toBeNull();
    // Neither of the downstream queries should run on a below-min cohort.
    expect(hoisted.mockPrisma.dosingRegimen.findMany).not.toHaveBeenCalled();
    expect(hoisted.mockPrisma.product.findMany).not.toHaveBeenCalled();
  });

  it("computes clinicianPickUsageRate from active regimens", async () => {
    const now = Date.now();
    hoisted.mockPrisma.patient.findMany.mockResolvedValue(
      ["p1", "p2", "p3", "p4", "p5"].map((id) => ({
        id,
        dateOfBirth: new Date(now - 30 * 365 * 86_400_000),
      })),
    );
    hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([
      { patientId: "p1", metric: "sleep", value: 4, loggedAt: new Date() },
      { patientId: "p2", metric: "sleep", value: 6, loggedAt: new Date() },
    ]);
    // 4 of 5 have active regimens; 3 of those 4 are on clinician picks.
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      {
        patientId: "p1",
        product: { marketplaceProduct: { clinicianPick: true } },
      },
      {
        patientId: "p2",
        product: { marketplaceProduct: { clinicianPick: true } },
      },
      {
        patientId: "p3",
        product: { marketplaceProduct: { clinicianPick: true } },
      },
      {
        patientId: "p4",
        product: { marketplaceProduct: { clinicianPick: false } },
      },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);

    const view = await getCohortExplorerView({
      organizationId: "org_1",
      memoryTag: "sleep",
    });

    expect(view.belowMinCohort).toBe(false);
    expect(view.activeRegimenPatientCount).toBe(4);
    expect(view.clinicianPickUsageRate).toBe(0.75);
  });

  it("sorts metric baselines by sampleSize desc", async () => {
    const now = Date.now();
    hoisted.mockPrisma.patient.findMany.mockResolvedValue(
      ["p1", "p2", "p3"].map((id) => ({
        id,
        dateOfBirth: new Date(now - 35 * 365 * 86_400_000),
      })),
    );
    hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([
      { patientId: "p1", metric: "sleep", value: 6, loggedAt: new Date() },
      { patientId: "p2", metric: "pain", value: 7, loggedAt: new Date() },
      { patientId: "p3", metric: "pain", value: 5, loggedAt: new Date() },
      { patientId: "p1", metric: "pain", value: 8, loggedAt: new Date() },
    ]);
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);

    const view = await getCohortExplorerView({
      organizationId: "org_1",
      memoryTag: "sleep",
    });

    expect(view.metricBaselines[0].metric).toBe("pain"); // 3 samples
    expect(view.metricBaselines[0].sampleSize).toBe(3);
    expect(view.metricBaselines[1].metric).toBe("sleep");
    expect(view.metricBaselines[1].sampleSize).toBe(1);
  });
});

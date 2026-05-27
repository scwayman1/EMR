import { describe, expect, it, beforeEach, vi } from "vitest";

import { routeCDSTriggers } from "./alerts";
import { prisma } from "../db/prisma";

vi.mock("../db/prisma", () => ({
  prisma: {
    task: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
  },
}));

describe("routeCDSTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a task if no duplicate exists", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      organizationId: "org1",
    } as any);

    await routeCDSTriggers([
      {
        patientId: "p1",
        ruleName: "OvertrainingRisk",
        severity: "notable",
        description: "Test description",
      },
    ]);

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "[CDS Alert] OvertrainingRisk",
          status: "open",
          patientId: "p1",
          organizationId: "org1",
        }),
      }),
    );
  });

  it("should skip task creation if duplicate exists within 24 hours", async () => {
    vi.mocked(prisma.task.findFirst).mockResolvedValue({
      id: "existing-task",
    } as any);

    await routeCDSTriggers([
      {
        patientId: "p1",
        ruleName: "OvertrainingRisk",
        severity: "notable",
        description: "Test description",
      },
    ]);

    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});

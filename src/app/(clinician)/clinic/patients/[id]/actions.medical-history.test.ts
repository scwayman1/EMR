import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: {
      findFirst: vi.fn(),
    },
    pastMedicalCondition: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    pastSurgery: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const mockUser = {
    id: "user_1",
    email: "clinician@example.com",
    firstName: "Cli",
    lastName: "Nician",
    roles: ["clinician"],
    organizationId: "org_1",
    organizationName: "Clinic",
  };

  return {
    mockPrisma,
    requireUserMock: vi.fn(async () => mockUser),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: () => hoisted.requireUserMock(),
}));

vi.mock("@/lib/orchestration/dispatch", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/lib/observability/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  addPastMedicalConditionAction,
  addPastSurgeryAction,
  deletePastMedicalConditionAction,
  deletePastSurgeryAction,
} from "./actions";

const { mockPrisma, requireUserMock } = hoisted;

function resetAll() {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({
    id: "user_1",
    email: "clinician@example.com",
    firstName: "Cli",
    lastName: "Nician",
    roles: ["clinician"],
    organizationId: "org_1",
    organizationName: "Clinic",
  });
  mockPrisma.patient.findFirst.mockResolvedValue({ id: "patient_1" });
  mockPrisma.pastMedicalCondition.create.mockResolvedValue({ id: "pmh_1" });
  mockPrisma.pastMedicalCondition.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.pastSurgery.create.mockResolvedValue({ id: "psh_1" });
  mockPrisma.pastSurgery.updateMany.mockResolvedValue({ count: 1 });
}

describe("patient medical history actions", () => {
  beforeEach(resetAll);

  it("rejects adding PMH when the patient is outside the clinician org", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      addPastMedicalConditionAction("foreign_patient", "Hypertension", 2019, null),
    ).rejects.toThrow("Patient not found");

    expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: "foreign_patient", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
    expect(mockPrisma.pastMedicalCondition.create).not.toHaveBeenCalled();
  });

  it("authenticates and scopes surgery creates to the clinician org", async () => {
    await addPastSurgeryAction("patient_1", "Appendectomy", "2017", null);

    expect(requireUserMock).toHaveBeenCalled();
    expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: "patient_1", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
    expect(mockPrisma.pastSurgery.create).toHaveBeenCalledWith({
      data: {
        patientId: "patient_1",
        procedure: "Appendectomy",
        performedDateText: "2017",
        notes: null,
        source: "clinician",
      },
    });
  });

  it("soft-deletes PMH only when the row belongs to the requested patient", async () => {
    await deletePastMedicalConditionAction("patient_1", "pmh_1");

    expect(requireUserMock).toHaveBeenCalled();
    expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: "patient_1", organizationId: "org_1", deletedAt: null },
      select: { id: true },
    });
    expect(mockPrisma.pastMedicalCondition.updateMany).toHaveBeenCalledWith({
      where: { id: "pmh_1", patientId: "patient_1", deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("throws when a surgery delete did not match the requested patient", async () => {
    mockPrisma.pastSurgery.updateMany.mockResolvedValue({ count: 0 });

    await expect(deletePastSurgeryAction("patient_1", "foreign_psh")).rejects.toThrow(
      "Surgical history item not found",
    );
  });
});

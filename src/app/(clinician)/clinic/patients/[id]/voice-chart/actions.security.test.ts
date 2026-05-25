import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: { findFirst: vi.fn() },
    encounter: { findFirst: vi.fn(), update: vi.fn() },
    note: { create: vi.fn() },
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
    completeMock: vi.fn(async () =>
      JSON.stringify({
        summary: "Visit summary",
        findings: "Findings",
        assessment: "Assessment",
        plan: "Plan",
        confidence: 0.8,
      }),
    ),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: () => hoisted.requireUserMock(),
}));

vi.mock("@/lib/orchestration/model-client", () => ({
  resolveModelClient: () => ({ complete: hoisted.completeMock }),
}));

vi.mock("@/lib/observability/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { processTranscript, saveTranscriptToEncounter } from "./actions";

const { mockPrisma, completeMock } = hoisted;

function resetAll() {
  vi.clearAllMocks();
  mockPrisma.patient.findFirst.mockResolvedValue({
    id: "patient_1",
    firstName: "Maya",
    lastName: "Patel",
    dateOfBirth: new Date("1980-01-01"),
    presentingConcerns: "Pain",
    treatmentGoals: "Sleep",
    cannabisHistory: null,
    chartSummary: { summaryMd: "Stable" },
  });
  mockPrisma.encounter.findFirst.mockResolvedValue({
    id: "enc_1",
    patientId: "patient_1",
    organizationId: "org_1",
  });
  mockPrisma.note.create.mockResolvedValue({ id: "note_1" });
  mockPrisma.encounter.update.mockResolvedValue({ id: "enc_1" });
}

describe("voice chart action security", () => {
  beforeEach(resetAll);

  it("does not create a note when the encounter does not belong to the patient/org", async () => {
    mockPrisma.encounter.findFirst.mockResolvedValue(null);

    const result = await processTranscript("foreign_enc", "patient reports pain", "patient_1");

    expect(result).toEqual({ ok: false, error: "Encounter not found." });
    expect(completeMock).not.toHaveBeenCalled();
    expect(mockPrisma.note.create).not.toHaveBeenCalled();
  });

  it("checks encounter ownership before creating a note", async () => {
    await processTranscript("enc_1", "patient reports pain", "patient_1");

    expect(mockPrisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: "enc_1",
        patientId: "patient_1",
        organizationId: "org_1",
        patient: { deletedAt: null },
      },
      select: { id: true, patientId: true, organizationId: true },
    });
    expect(mockPrisma.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ encounterId: "enc_1" }),
      }),
    );
  });

  it("saves transcript only to a same-org encounter", async () => {
    mockPrisma.encounter.findFirst.mockResolvedValue(null);

    await expect(saveTranscriptToEncounter("foreign_enc", [])).rejects.toThrow(
      "Encounter not found.",
    );
    expect(mockPrisma.encounter.update).not.toHaveBeenCalled();
  });
});

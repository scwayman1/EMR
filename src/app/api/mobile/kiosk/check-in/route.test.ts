import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    encounter: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    patient: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  return { mockPrisma, logger };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/observability/log", () => ({
  logger: hoisted.logger,
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("https://example.com/api/mobile/kiosk/check-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mobile/kiosk/check-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    hoisted.mockPrisma.patient.update.mockResolvedValue({ id: "pat_1" });
    hoisted.mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects mismatched encounter and patient ids", async () => {
    hoisted.mockPrisma.encounter.findFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ encounterId: "enc_1", patientId: "wrong_pat" }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Encounter not found for patient" });
    expect(hoisted.mockPrisma.encounter.update).not.toHaveBeenCalled();
    expect(hoisted.mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("moves a verified scheduled encounter to checked_in and audits it", async () => {
    const scheduledFor = new Date("2026-05-30T16:00:00.000Z");
    hoisted.mockPrisma.encounter.findFirst.mockResolvedValue({
      id: "enc_1",
      patientId: "pat_1",
      organizationId: "org_1",
      status: "scheduled",
      scheduledFor,
      checkedInAt: null,
      patient: {
        id: "pat_1",
        organizationId: "org_1",
        intakeAnswers: { existing: true },
      },
    });
    hoisted.mockPrisma.encounter.update.mockResolvedValue({
      id: "enc_1",
      patientId: "pat_1",
      organizationId: "org_1",
      status: "checked_in",
    });

    const res = await POST(makeRequest({ encounterId: "enc_1", patientId: "pat_1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, status: "checked_in" });
    expect(hoisted.mockPrisma.encounter.update).toHaveBeenCalledWith({
      where: { id: "enc_1" },
      data: expect.objectContaining({
        status: "checked_in",
        checkedInAt: expect.any(Date),
      }),
    });
    expect(hoisted.mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        action: "encounter.kiosk_check_in.completed",
        subjectType: "Encounter",
        subjectId: "enc_1",
      }),
    });
  });

  it("verifies encounter ownership before updating state", async () => {
    hoisted.mockPrisma.encounter.findFirst.mockResolvedValue(null);

    await POST(makeRequest({ encounterId: "enc_1", patientId: "pat_1" }));

    expect(hoisted.mockPrisma.encounter.findFirst).toHaveBeenCalledWith({
      where: {
        id: "enc_1",
        patientId: "pat_1",
      },
      include: {
        patient: {
          select: {
            id: true,
            intakeAnswers: true,
            organizationId: true,
          },
        },
      },
    });
  });

  it("merges signed forms into intake answers instead of replacing them", async () => {
    hoisted.mockPrisma.encounter.findFirst.mockResolvedValue({
      id: "enc_1",
      patientId: "pat_1",
      organizationId: "org_1",
      status: "scheduled",
      checkedInAt: null,
      patient: {
        id: "pat_1",
        organizationId: "org_1",
        intakeAnswers: { demographics: { confirmed: true } },
      },
    });
    hoisted.mockPrisma.encounter.update.mockResolvedValue({
      id: "enc_1",
      patientId: "pat_1",
      organizationId: "org_1",
      status: "checked_in",
    });

    await POST(
      makeRequest({
        encounterId: "enc_1",
        patientId: "pat_1",
        signedForms: { consent: { signedAt: "2026-05-30T16:00:00.000Z" } },
      }),
    );

    expect(hoisted.mockPrisma.patient.update).toHaveBeenCalledWith({
      where: { id: "pat_1" },
      data: {
        intakeAnswers: {
          demographics: { confirmed: true },
          signedForms: {
            consent: { signedAt: "2026-05-30T16:00:00.000Z" },
          },
        },
      },
    });
  });
});

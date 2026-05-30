import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hardening sprint — startVisitWithBriefing must reach parity with startVisit:
 * same permission + chart-privacy gates, reuse today's encounter, and MERGE
 * (never overwrite) briefingContext so rooming/demeanor data survives.
 */
const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: { findFirst: vi.fn() },
    encounter: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    note: { findFirst: vi.fn() },
    agentJob: { findMany: vi.fn() },
    provider: { findFirst: vi.fn() },
  };
  return { mockPrisma, requireUserMock: vi.fn(), dispatchMock: vi.fn() };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`redirect:${href}`);
  }),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: hoisted.mockPrisma }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => hoisted.requireUserMock() }));
vi.mock("@/lib/orchestration/dispatch", () => ({ dispatch: hoisted.dispatchMock }));
vi.mock("@/lib/agents/pre-visit-intelligence-agent", () => ({
  preVisitIntelligenceAgent: { run: vi.fn() },
}));
vi.mock("@/lib/orchestration/model-client", () => ({ resolveModelClient: vi.fn() }));
vi.mock("@/lib/orchestration/tool-registry", () => ({ buildToolRegistry: vi.fn() }));

import { startVisitWithBriefing } from "./actions";

const { mockPrisma, requireUserMock, dispatchMock } = hoisted;

const TODAY = new Date("2026-05-29T15:00:00.000Z");

function clinician(over: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    email: "doc@example.com",
    firstName: "Cli",
    lastName: "Nician",
    roles: ["clinician"],
    organizationId: "org_1",
    organizationName: "Clinic",
    ...over,
  };
}

function patient(over: Record<string, unknown> = {}) {
  return {
    id: "patient_1",
    organizationId: "org_1",
    chartRestricted: false,
    restrictedProviderIds: [],
    chartRestrictedReason: null,
    ...over,
  };
}

function scheduledEncounter(over: Record<string, unknown> = {}) {
  return {
    id: "sched_1",
    organizationId: "org_1",
    patientId: "patient_1",
    status: "scheduled",
    scheduledFor: TODAY,
    startedAt: null,
    completedAt: null,
    briefingContext: null,
    createdAt: TODAY,
    ...over,
  };
}

const BRIEFING = {
  patientSummary: "62yo chronic low back pain",
  lastVisitSummary: null,
  talkingPoints: ["tolerability"],
  sections: [],
  riskFlags: [],
  confidence: 0.8,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(clinician());
  mockPrisma.patient.findFirst.mockResolvedValue(patient());
  mockPrisma.encounter.findFirst.mockResolvedValue(null);
  mockPrisma.encounter.findMany.mockResolvedValue([]);
  mockPrisma.encounter.update.mockImplementation(async ({ where, data }: any) => ({
    ...scheduledEncounter(),
    id: where.id,
    ...data,
  }));
  mockPrisma.encounter.create.mockResolvedValue(
    scheduledEncounter({ id: "new_enc", status: "in_visit" }),
  );
  mockPrisma.note.findFirst.mockResolvedValue(null);
  mockPrisma.agentJob.findMany.mockResolvedValue([]);
  mockPrisma.provider.findFirst.mockResolvedValue(null);
  dispatchMock.mockResolvedValue([]);
});

describe("startVisitWithBriefing — permission + chart-privacy parity", () => {
  it("denies users without notes.edit (front office)", async () => {
    requireUserMock.mockResolvedValue(clinician({ roles: ["front_office"] }));
    await expect(startVisitWithBriefing("patient_1", BRIEFING)).rejects.toThrow(
      /error=unauthorized/,
    );
    expect(mockPrisma.encounter.create).not.toHaveBeenCalled();
    expect(mockPrisma.encounter.update).not.toHaveBeenCalled();
  });

  it("denies a restricted chart when the user is not allowlisted", async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(
      patient({ chartRestricted: true, restrictedProviderIds: ["other_doc"] }),
    );
    await expect(startVisitWithBriefing("patient_1", BRIEFING)).rejects.toThrow(
      /error=restricted/,
    );
    expect(mockPrisma.encounter.create).not.toHaveBeenCalled();
  });
});

describe("startVisitWithBriefing — encounter selection", () => {
  it("reuses today's scheduled encounter instead of creating a duplicate", async () => {
    mockPrisma.encounter.findMany.mockResolvedValue([scheduledEncounter()]);
    await expect(startVisitWithBriefing("patient_1", BRIEFING)).rejects.toThrow(/redirect:/);
    expect(mockPrisma.encounter.create).not.toHaveBeenCalled();
  });
});

describe("startVisitWithBriefing — briefingContext merge", () => {
  it("preserves existing rooming/demeanor keys while attaching the briefing", async () => {
    mockPrisma.encounter.findMany.mockResolvedValue([
      scheduledEncounter({
        briefingContext: {
          patientDemeanor: "calm",
          patientDemeanorRecordedAt: "2026-05-29T14:00:00.000Z",
          intakeCompleted: true,
        },
      }),
    ]);

    await expect(startVisitWithBriefing("patient_1", BRIEFING)).rejects.toThrow(/redirect:/);

    // The merged briefingContext must keep demeanor/intake AND add the briefing.
    expect(mockPrisma.encounter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          briefingContext: expect.objectContaining({
            patientDemeanor: "calm",
            intakeCompleted: true,
            patientSummary: "62yo chronic low back pain",
          }),
        }),
      }),
    );
  });
});

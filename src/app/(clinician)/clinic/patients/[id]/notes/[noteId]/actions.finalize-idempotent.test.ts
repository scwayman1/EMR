import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hardening sprint — note finalization must be idempotent:
 *  - note.finalized dispatched only on the transition into finalized
 *  - encounter.completed dispatched only on the transition into complete
 *  - one timestamp shared by DB writes and the event payload
 */
const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: { findFirst: vi.fn() },
    encounter: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    note: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return { mockPrisma, requireUserMock: vi.fn(), dispatchMock: vi.fn() };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: hoisted.mockPrisma }));
vi.mock("@/lib/auth/session", () => ({ requireUser: () => hoisted.requireUserMock() }));
vi.mock("@/lib/orchestration/dispatch", () => ({ dispatch: hoisted.dispatchMock }));
vi.mock("@/lib/orchestration/runner", () => ({ runTick: vi.fn(), runJob: vi.fn() }));
vi.mock("@/lib/orchestration/model-client", () => ({
  resolveModelClient: vi.fn(),
  isModelError: vi.fn(() => false),
}));
vi.mock("@/lib/observability/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { finalizeNote, saveAndFinalizeNote } from "./actions";

const { mockPrisma, requireUserMock, dispatchMock } = hoisted;

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

function note(over: Record<string, unknown> = {}) {
  return {
    id: "note_1",
    encounterId: "enc_1",
    status: "draft",
    aiDrafted: false,
    blocks: [],
    authorUserId: null,
    encounter: { id: "enc_1", patientId: "patient_1", status: "in_visit" },
    ...over,
  };
}

function encounter(over: Record<string, unknown> = {}) {
  return {
    id: "enc_1",
    organizationId: "org_1",
    patientId: "patient_1",
    status: "in_visit",
    startedAt: new Date("2026-05-29T15:00:00.000Z"),
    completedAt: null,
    ...over,
  };
}

function dispatchCount(name: string) {
  return dispatchMock.mock.calls.filter((c) => c[0]?.name === name).length;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue(clinician());
  mockPrisma.patient.findFirst.mockResolvedValue(patient());
  mockPrisma.encounter.findFirst.mockResolvedValue(encounter());
  mockPrisma.encounter.update.mockImplementation(async ({ where, data }: any) => ({
    ...encounter(),
    id: where.id,
    ...data,
  }));
  mockPrisma.encounter.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.note.findUnique.mockResolvedValue(note());
  mockPrisma.note.update.mockResolvedValue(note({ status: "finalized" }));
  mockPrisma.note.count.mockResolvedValue(0);
  mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" });
  dispatchMock.mockResolvedValue([]);
});

describe("finalizeNote idempotency", () => {
  it("dispatches note.finalized + encounter.completed once on a fresh finalize", async () => {
    const res = await finalizeNote("note_1");
    expect(res).toEqual({ ok: true, status: "finalized" });
    expect(dispatchCount("note.finalized")).toBe(1);
    expect(dispatchCount("encounter.completed")).toBe(1);
  });

  it("does NOT re-dispatch when the note is already finalized", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(note({ status: "finalized" }));

    const res = await finalizeNote("note_1");

    expect(res.ok).toBe(true);
    expect(dispatchCount("note.finalized")).toBe(0);
    expect(dispatchCount("encounter.completed")).toBe(0);
    expect(mockPrisma.note.update).not.toHaveBeenCalled();
  });

  it("dispatches note.finalized but NOT encounter.completed when the encounter is already complete", async () => {
    // Second note on an encounter that a prior note already completed.
    mockPrisma.note.findUnique.mockResolvedValue(
      note({ id: "note_2", encounter: { id: "enc_1", patientId: "patient_1", status: "complete" } }),
    );
    mockPrisma.encounter.findFirst.mockResolvedValue(encounter({ status: "complete", completedAt: new Date() }));

    await finalizeNote("note_2");

    expect(dispatchCount("note.finalized")).toBe(1);
    expect(dispatchCount("encounter.completed")).toBe(0);
  });

  it("uses one shared timestamp for the note write, encounter write, and event payload", async () => {
    await finalizeNote("note_1");

    const noteFinalizedAt = mockPrisma.note.update.mock.calls
      .map((c) => c[0]?.data?.finalizedAt)
      .find(Boolean) as Date;
    const encounterCompletedAt = mockPrisma.encounter.update.mock.calls
      .map((c) => c[0]?.data?.completedAt)
      .find(Boolean) as Date;
    const eventCompletedAt = dispatchMock.mock.calls
      .map((c) => (c[0]?.name === "encounter.completed" ? c[0].completedAt : undefined))
      .find(Boolean) as Date;

    expect(noteFinalizedAt).toBeInstanceOf(Date);
    expect(encounterCompletedAt.getTime()).toBe(noteFinalizedAt.getTime());
    expect(eventCompletedAt.getTime()).toBe(noteFinalizedAt.getTime());
  });

  it("stamps chartingCompletedAt only when not already set, with the shared timestamp", async () => {
    await finalizeNote("note_1");

    expect(mockPrisma.encounter.updateMany).toHaveBeenCalledWith({
      where: { id: "enc_1", chartingCompletedAt: null },
      data: { chartingCompletedAt: expect.any(Date) },
    });
    const chartingAt = mockPrisma.encounter.updateMany.mock.calls[0][0].data.chartingCompletedAt;
    const noteFinalizedAt = mockPrisma.note.update.mock.calls
      .map((c) => c[0]?.data?.finalizedAt)
      .find(Boolean) as Date;
    expect(chartingAt.getTime()).toBe(noteFinalizedAt.getTime());
  });
});

describe("saveAndFinalizeNote idempotency", () => {
  const BLOCKS = [{ heading: "Subjective", body: "patient reports..." }];

  it("dispatches note.finalized + encounter.completed once on a fresh save+finalize", async () => {
    const res = await saveAndFinalizeNote("note_1", BLOCKS);
    expect(res).toEqual({ ok: true, status: "finalized" });
    expect(dispatchCount("note.finalized")).toBe(1);
    expect(dispatchCount("encounter.completed")).toBe(1);
  });

  it("does NOT re-dispatch or re-write when the note is already finalized", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(note({ status: "finalized" }));

    const res = await saveAndFinalizeNote("note_1", BLOCKS);

    expect(res.ok).toBe(true);
    expect(dispatchCount("note.finalized")).toBe(0);
    expect(dispatchCount("encounter.completed")).toBe(0);
    expect(mockPrisma.note.update).not.toHaveBeenCalled();
  });

  it("does not re-fire encounter.completed when the encounter is already complete", async () => {
    mockPrisma.note.findUnique.mockResolvedValue(
      note({ id: "note_2", encounter: { id: "enc_1", patientId: "patient_1", status: "complete" } }),
    );
    mockPrisma.encounter.findFirst.mockResolvedValue(encounter({ status: "complete", completedAt: new Date() }));

    await saveAndFinalizeNote("note_2", BLOCKS);

    expect(dispatchCount("note.finalized")).toBe(1);
    expect(dispatchCount("encounter.completed")).toBe(0);
  });
});

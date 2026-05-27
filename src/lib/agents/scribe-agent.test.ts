import { describe, expect, it, vi, beforeEach } from "vitest";
import { tryParseJSON, scribeAgent } from "./scribe-agent";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => {
  const mockPrisma = {
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    patientMemory: {
      create: vi.fn().mockImplementation((args) => Promise.resolve({ id: "mem-new", ...args.data })),
      findMany: vi.fn().mockResolvedValue([]),
    },
    clinicalObservation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    encounter: {
      findUnique: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
    },
    note: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    outcomeLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    agentReasoning: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
  return { prisma: mockPrisma };
});

describe("tryParseJSON", () => {
  it("parses clean JSON objects", () => {
    const raw = '{"summary":"Visit summary","findings":"Key findings","assessment":"Assessment text","plan":"Plan text","followUp":"Follow-up text","suggestedCodes":[],"confidence":0.9}';
    const parsed = tryParseJSON(raw);
    expect(parsed).toEqual({
      summary: "Visit summary",
      findings: "Key findings",
      assessment: "Assessment text",
      plan: "Plan text",
      followUp: "Follow-up text",
      suggestedCodes: [],
      confidence: 0.9,
    });
  });

  it("extracts JSON embedded inside markdown blocks", () => {
    const raw = '```json\n{"summary":"Visit summary"}\n```';
    const parsed = tryParseJSON(raw);
    expect(parsed).toEqual({
      summary: "Visit summary",
    });
  });

  it("returns null for malformed JSON or non-JSON input", () => {
    expect(tryParseJSON("Not JSON at all")).toBeNull();
  });
});

describe("scribeAgent.run", () => {
  const mockCtx = {
    jobId: "job-scribe-123",
    organizationId: "org-scribe-123",
    log: vi.fn(),
    emit: vi.fn(),
    assertCan: vi.fn(),
    model: {
      complete: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully drafts note and records memory when LLM returns valid JSON", async () => {
    const mockEncounterData = {
      id: "enc-123",
      patientId: "pat-123",
      modality: "video",
      reason: "Anxiety",
      patient: {
        id: "pat-123",
        firstName: "Sarah",
        lastName: "Connor",
        dateOfBirth: new Date("1985-05-27T00:00:00Z"),
        chartSummary: { summaryMd: "Has moderate anxiety." },
        organizationId: "org-123",
      },
    };

    (prisma.encounter.findUnique as any).mockResolvedValue(mockEncounterData);
    (prisma.patientMemory.findMany as any).mockResolvedValue([
      { id: "mem-1", kind: "preference", content: "Prefers email." },
    ]);
    (prisma.clinicalObservation.findMany as any).mockResolvedValue([
      { id: "obs-1", severity: "notable", summary: "Noticed slight improvement." },
    ]);
    (prisma.note.create as any).mockResolvedValue({ id: "note-123" });

    const mockResponse = JSON.stringify({
      summary: "Patient checked in.",
      findings: "Patient reports better sleep.",
      assessment: "Responding well.",
      plan: "Continue CBD oil.",
      followUp: "Check back in 2 weeks.",
      suggestedCodes: [{ code: "F41.1", label: "Generalized anxiety disorder" }],
      confidence: 0.95,
      newMemory: {
        kind: "working",
        content: "CBD oil 10mg before bed helps anxiety.",
        tags: ["anxiety", "sleep"],
      },
    });
    mockCtx.model.complete.mockResolvedValue(mockResponse);

    const result = await scribeAgent.run({ encounterId: "enc-123" }, mockCtx);

    expect(result.noteId).toBe("note-123");
    expect(result.confidence).toBe(0.95);
    expect(result.suggestedCodes).toEqual([{ code: "F41.1", label: "Generalized anxiety disorder" }]);

    expect(prisma.patientMemory.findMany).toHaveBeenCalled();
    expect(prisma.clinicalObservation.findMany).toHaveBeenCalled();
    expect(prisma.note.create).toHaveBeenCalled();
    expect(prisma.patientMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "pat-123",
          kind: "working",
          content: "CBD oil 10mg before bed helps anxiety.",
        }),
      })
    );
  });

  it("falls back to a deterministic draft if the LLM call throws", async () => {
    const mockEncounterData = {
      id: "enc-123",
      patientId: "pat-123",
      modality: "video",
      reason: "Anxiety",
      patient: {
        id: "pat-123",
        firstName: "Sarah",
        lastName: "Connor",
        dateOfBirth: new Date("1985-05-27T00:00:00Z"),
        chartSummary: { summaryMd: "Has moderate anxiety." },
        organizationId: "org-123",
      },
    };

    (prisma.encounter.findUnique as any).mockResolvedValue(mockEncounterData);
    (prisma.note.create as any).mockResolvedValue({ id: "note-fallback" });
    mockCtx.model.complete.mockRejectedValue(new Error("LLM timeout"));

    const result = await scribeAgent.run({ encounterId: "enc-123" }, mockCtx);

    expect(result.noteId).toBe("note-fallback");
    expect(result.confidence).toBe(0.7);
    expect(result.blocks.find(b => b.type === "summary")?.body).toContain("Sarah Connor presented for a video visit");
    expect(prisma.note.create).toHaveBeenCalled();
    expect(prisma.patientMemory.create).not.toHaveBeenCalled();
  });
});

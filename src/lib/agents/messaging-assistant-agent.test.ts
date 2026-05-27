import { describe, expect, it, vi, beforeEach } from "vitest";
import { tryParseJSON, messagingAssistantAgent } from "./messaging-assistant-agent";
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
    patient: {
      findUnique: vi.fn(),
    },
    messageThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    message: {
      create: vi.fn(),
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
    const raw = '{"draftBody":"Hello Sam","tone":"warm"}';
    const parsed = tryParseJSON(raw);
    expect(parsed).toEqual({
      draftBody: "Hello Sam",
      tone: "warm",
    });
  });

  it("extracts JSON embedded inside markdown blocks", () => {
    const raw = '```json\n{"draftBody":"Hello Sam","tone":"warm"}\n```';
    const parsed = tryParseJSON(raw);
    expect(parsed).toEqual({
      draftBody: "Hello Sam",
      tone: "warm",
    });
  });

  it("returns null for malformed JSON or non-JSON input", () => {
    expect(tryParseJSON("Not JSON at all")).toBeNull();
  });
});

describe("messagingAssistantAgent.run", () => {
  const mockCtx = {
    jobId: "job-msg-123",
    organizationId: "org-msg-123",
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

  it("successfully drafts a message and records memory when LLM returns valid JSON", async () => {
    const mockPatientData = {
      id: "pat-123",
      firstName: "Sarah",
      lastName: "Connor",
      presentingConcerns: "Anxiety",
      treatmentGoals: "Better sleep",
      organizationId: "org-123",
      chartSummary: { summaryMd: "Has moderate anxiety." },
      medications: [],
      dosingRegimens: [],
      outcomeLogs: [],
    };

    (prisma.patient.findUnique as any).mockResolvedValue(mockPatientData);
    (prisma.patientMemory.findMany as any).mockResolvedValue([
      { id: "mem-1", kind: "preference", content: "Prefers text message check-ins." },
    ]);
    (prisma.clinicalObservation.findMany as any).mockResolvedValue([]);
    (prisma.messageThread.findFirst as any).mockResolvedValue({ id: "thread-123" });
    (prisma.message.create as any).mockResolvedValue({ id: "msg-123" });

    const mockResponse = JSON.stringify({
      draftBody: "Hi Sarah, checking in on your sleep this week.",
      tone: "warm",
      newMemory: {
        kind: "preference",
        content: "Prefers check-ins on Thursdays.",
        tags: ["schedule"],
      },
    });
    mockCtx.model.complete.mockResolvedValue(mockResponse);

    const result = await messagingAssistantAgent.run(
      { patientId: "pat-123", intent: "follow_up" },
      mockCtx
    );

    expect(result.draftMessageId).toBe("msg-123");
    expect(result.draftBody).toBe("Hi Sarah, checking in on your sleep this week.");
    expect(result.tone).toBe("warm");

    expect(prisma.patientMemory.findMany).toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          threadId: "thread-123",
          body: "Hi Sarah, checking in on your sleep this week.",
        }),
      })
    );
    expect(prisma.patientMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "pat-123",
          kind: "preference",
          content: "Prefers check-ins on Thursdays.",
        }),
      })
    );
  });

  it("falls back to a template-based message if the LLM call throws", async () => {
    const mockPatientData = {
      id: "pat-123",
      firstName: "Sarah",
      lastName: "Connor",
      presentingConcerns: "Anxiety",
      treatmentGoals: "Better sleep",
      organizationId: "org-123",
      chartSummary: { summaryMd: "Has moderate anxiety." },
      medications: [],
      dosingRegimens: [],
      outcomeLogs: [],
    };

    (prisma.patient.findUnique as any).mockResolvedValue(mockPatientData);
    (prisma.messageThread.findFirst as any).mockResolvedValue(null);
    (prisma.messageThread.create as any).mockResolvedValue({ id: "thread-created" });
    (prisma.message.create as any).mockResolvedValue({ id: "msg-fallback" });
    mockCtx.model.complete.mockRejectedValue(new Error("LLM failure"));

    const result = await messagingAssistantAgent.run(
      { patientId: "pat-123", intent: "intake_nudge" },
      mockCtx
    );

    expect(result.draftMessageId).toBe("msg-fallback");
    expect(result.draftBody).toContain("Hi Sarah, we noticed your intake is almost complete");
    expect(result.tone).toBe("warm");

    expect(prisma.messageThread.create).toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalled();
    expect(prisma.patientMemory.create).not.toHaveBeenCalled();
  });
});

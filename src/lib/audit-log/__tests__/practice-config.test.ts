/**
 * PracticeConfigAuditEvent helper tests — EMR-470
 *
 * Acceptance:
 *   1. recordAuditEvent inserts a row with the correct shape.
 *   2. getAuditEvents returns rows filtered by practiceId + optional action/since.
 *   3. The helper module exposes ONLY append (recordAuditEvent) and read
 *      (getAuditEvents, exportAuditEventsJsonl). No update/delete export.
 *   4. exportAuditEventsJsonl yields one JSON line per event, terminated with
 *      `\n`, suitable for piping to a `.jsonl` file.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type AuditRow = {
  id: string;
  practiceId: string;
  actorId: string;
  action: string;
  targetId: string;
  before: unknown | null;
  after: unknown | null;
  reason: string | null;
  createdAt: Date;
};

const createMock = vi.fn<(args: { data: Partial<AuditRow> }) => Promise<AuditRow>>();
const findManyMock =
  vi.fn<(args: unknown) => Promise<AuditRow[]>>();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    practiceConfigAuditEvent: {
      create: (args: { data: Partial<AuditRow> }) => createMock(args),
      findMany: (args: unknown) => findManyMock(args),
    },
  },
}));

beforeEach(() => {
  createMock.mockReset();
  findManyMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// recordAuditEvent
// ────────────────────────────────────────────────────────────────────────────

describe("recordAuditEvent", () => {
  it("inserts a row with the canonical field mapping", async () => {
    createMock.mockResolvedValue({
      id: "audit-1",
      practiceId: "p-1",
      actorId: "u-1",
      action: "FIELD_CHANGE",
      targetId: "cfg-1",
      before: { foo: 1 },
      after: { foo: 2 },
      reason: "test",
      createdAt: new Date("2026-05-18T00:00:00Z"),
    });

    const { recordAuditEvent } = await import(
      "@/lib/audit-log/practice-config"
    );

    const out = await recordAuditEvent({
      practiceId: "p-1",
      actorId: "u-1",
      action: "FIELD_CHANGE",
      targetId: "cfg-1",
      before: { foo: 1 },
      after: { foo: 2 },
      reason: "test",
    });

    expect(out.id).toBe("audit-1");
    expect(createMock).toHaveBeenCalledOnce();
    const data = createMock.mock.calls[0][0].data;
    expect(data.practiceId).toBe("p-1");
    expect(data.actorId).toBe("u-1");
    expect(data.action).toBe("FIELD_CHANGE");
    expect(data.targetId).toBe("cfg-1");
    expect(data.reason).toBe("test");
  });

  it("rejects an unknown action value", async () => {
    const { recordAuditEvent } = await import(
      "@/lib/audit-log/practice-config"
    );

    await expect(
      recordAuditEvent({
        practiceId: "p-1",
        actorId: "u-1",
        // @ts-expect-error — invalid action on purpose
        action: "INVALID_ACTION",
        targetId: "cfg-1",
      }),
    ).rejects.toThrow(/action/i);

    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects an empty practiceId", async () => {
    const { recordAuditEvent } = await import(
      "@/lib/audit-log/practice-config"
    );

    await expect(
      recordAuditEvent({
        practiceId: "",
        actorId: "u-1",
        action: "STATE_TRANSITION",
        targetId: "cfg-1",
      }),
    ).rejects.toThrow(/practiceId/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Module surface
// ────────────────────────────────────────────────────────────────────────────

describe("module surface", () => {
  it("does not export an update or delete helper", async () => {
    const mod = await import("@/lib/audit-log/practice-config");

    expect(mod).toHaveProperty("recordAuditEvent");
    expect(mod).toHaveProperty("getAuditEvents");
    expect(mod).toHaveProperty("exportAuditEventsJsonl");

    // Belt-and-suspenders: no export name even hints at mutation.
    for (const name of Object.keys(mod)) {
      expect(name).not.toMatch(/^(update|delete|remove|drop|destroy)/i);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getAuditEvents
// ────────────────────────────────────────────────────────────────────────────

describe("getAuditEvents", () => {
  it("filters by practiceId + action + since and orders by createdAt desc", async () => {
    findManyMock.mockResolvedValue([]);
    const { getAuditEvents } = await import(
      "@/lib/audit-log/practice-config"
    );

    const since = new Date("2026-05-01T00:00:00Z");
    await getAuditEvents({
      practiceId: "p-1",
      action: "MODALITY_TOGGLE",
      since,
      limit: 50,
    });

    expect(findManyMock).toHaveBeenCalledOnce();
    const args = findManyMock.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: { createdAt: "desc" };
      take: number;
    };
    expect(args.where.practiceId).toBe("p-1");
    expect(args.where.action).toBe("MODALITY_TOGGLE");
    expect(args.where.createdAt).toEqual({ gte: since });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(50);
  });

  it("uses a sane default limit when none is supplied", async () => {
    findManyMock.mockResolvedValue([]);
    const { getAuditEvents } = await import(
      "@/lib/audit-log/practice-config"
    );

    await getAuditEvents({ practiceId: "p-1" });

    const args = findManyMock.mock.calls[0][0] as { take: number };
    expect(args.take).toBeGreaterThan(0);
    expect(args.take).toBeLessThanOrEqual(500);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// exportAuditEventsJsonl
// ────────────────────────────────────────────────────────────────────────────

describe("exportAuditEventsJsonl", () => {
  it("yields one JSON line per event, terminated with \\n", async () => {
    const rows: AuditRow[] = [
      {
        id: "a",
        practiceId: "p-1",
        actorId: "u-1",
        action: "STATE_TRANSITION",
        targetId: "cfg-1",
        before: null,
        after: { status: "published" },
        reason: null,
        createdAt: new Date("2026-05-18T00:00:00Z"),
      },
      {
        id: "b",
        practiceId: "p-1",
        actorId: "u-2",
        action: "FIELD_CHANGE",
        targetId: "cfg-1",
        before: { foo: 1 },
        after: { foo: 2 },
        reason: "edit",
        createdAt: new Date("2026-05-18T01:00:00Z"),
      },
    ];
    findManyMock.mockResolvedValue(rows);

    const { exportAuditEventsJsonl } = await import(
      "@/lib/audit-log/practice-config"
    );

    const chunks: string[] = [];
    for await (const line of exportAuditEventsJsonl({
      practiceId: "p-1",
      since: new Date("2026-05-01T00:00:00Z"),
      until: new Date("2026-06-01T00:00:00Z"),
    })) {
      chunks.push(line);
    }

    expect(chunks).toHaveLength(2);
    for (const chunk of chunks) {
      expect(chunk.endsWith("\n")).toBe(true);
      const parsed = JSON.parse(chunk.slice(0, -1));
      expect(parsed).toHaveProperty("id");
      expect(parsed).toHaveProperty("practiceId", "p-1");
      expect(parsed).toHaveProperty("createdAt");
    }

    // The findMany query must have used the supplied since/until window.
    const args = findManyMock.mock.calls[0][0] as {
      where: { createdAt: { gte: Date; lt: Date } };
      orderBy: { createdAt: "asc" };
    };
    expect(args.where.createdAt.gte).toEqual(new Date("2026-05-01T00:00:00Z"));
    expect(args.where.createdAt.lt).toEqual(new Date("2026-06-01T00:00:00Z"));
    // Streaming export uses ascending order so JSONL can be appended/diffed.
    expect(args.orderBy).toEqual({ createdAt: "asc" });
  });
});

/**
 * Modality API Guard tests — EMR-441
 *
 * Strengthens the EMR-410 guard to:
 *   - Accept a `withModality(modality, handler)` wrapper that adapts both
 *     Next.js route handlers (positional `req, ctx` args) and server actions
 *     (arbitrary positional args, must include a `practiceId` parameter or
 *     a function that resolves one).
 *   - Return `{ error: "modality_disabled", modality, message }` with HTTP 403
 *     when the modality is off, with `message` populated from MODALITY_META.
 *   - Emit a structured `modality.rejected` telemetry event recording
 *     `{ practiceId, modality, route, timestamp }`.
 *
 * The Prisma client and the modality lookup are mocked at the module level so
 * these run pure-unit, no DB.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type PublishedRow = {
  id: string;
  version: number;
  enabledModalities: string[];
  disabledModalities: string[];
} | null;

const findFirstMock = vi.fn<() => Promise<PublishedRow>>();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    practiceConfiguration: {
      findFirst: (..._args: unknown[]) => findFirstMock(),
    },
  },
}));

// Telemetry emitter is mocked so we can assert the structured payload without
// asserting against console.* directly (which would be brittle).
const recordRejectionMock = vi.fn();
vi.mock("@/lib/modality/telemetry", () => ({
  recordModalityRejection: (payload: unknown) =>
    recordRejectionMock(payload),
}));

beforeEach(() => {
  findFirstMock.mockReset();
  recordRejectionMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// withModality — route handler form
// ────────────────────────────────────────────────────────────────────────────

describe("withModality (route handler)", () => {
  it("invokes the wrapped handler when the modality is enabled", async () => {
    findFirstMock.mockResolvedValue({
      id: "cfg-on",
      version: 1,
      enabledModalities: ["cannabis-medicine"],
      disabledModalities: [],
    });
    vi.resetModules();
    const { withModality } = await import("@/lib/modality/api-guard");

    const handler = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const wrapped = withModality("cannabis-medicine", handler, {
      getPracticeId: () => "practice-on",
    });

    const req = new Request("https://example.com/api/test", { method: "POST" });
    const res = (await wrapped(req, { params: {} })) as Response;

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    expect(recordRejectionMock).not.toHaveBeenCalled();
  });

  it("returns 403 modality_disabled with message + telemetry when off", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { withModality } = await import("@/lib/modality/api-guard");

    const handler = vi.fn();
    const wrapped = withModality("cannabis-medicine", handler, {
      getPracticeId: () => "practice-off",
      route: "/api/test/cannabis",
    });

    const req = new Request("https://example.com/api/test/cannabis", {
      method: "POST",
    });
    const res = (await wrapped(req, { params: {} })) as Response;

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "modality_disabled",
        modality: "cannabis-medicine",
        message: expect.any(String),
      }),
    );
    expect(body.message.length).toBeGreaterThan(0);
    expect(handler).not.toHaveBeenCalled();

    expect(recordRejectionMock).toHaveBeenCalledOnce();
    const payload = recordRejectionMock.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        practiceId: "practice-off",
        modality: "cannabis-medicine",
        route: "/api/test/cannabis",
        timestamp: expect.any(String),
      }),
    );
  });

  it("derives the route from the request URL when not supplied", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { withModality } = await import("@/lib/modality/api-guard");

    const wrapped = withModality("cannabis-medicine", async () => new Response("x"), {
      getPracticeId: () => "p1",
    });

    const req = new Request("https://example.com/api/agents/pharmacology", {
      method: "POST",
    });
    await wrapped(req, { params: {} });

    expect(recordRejectionMock).toHaveBeenCalledOnce();
    expect(recordRejectionMock.mock.calls[0][0].route).toBe(
      "/api/agents/pharmacology",
    );
  });

  it("resolves practiceId from an async getter", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { withModality } = await import("@/lib/modality/api-guard");

    const wrapped = withModality(
      "cannabis-medicine",
      async () => new Response("x"),
      {
        getPracticeId: async () => "p-async",
        route: "/api/test",
      },
    );

    const req = new Request("https://example.com/api/test", { method: "POST" });
    const res = (await wrapped(req, { params: {} })) as Response;

    expect(res.status).toBe(403);
    expect(recordRejectionMock.mock.calls[0][0].practiceId).toBe("p-async");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// withModality — server action form
// ────────────────────────────────────────────────────────────────────────────

describe("withModality (server action)", () => {
  it("forwards arguments to the wrapped action when enabled", async () => {
    findFirstMock.mockResolvedValue({
      id: "cfg",
      version: 1,
      enabledModalities: ["cannabis-medicine"],
      disabledModalities: [],
    });
    vi.resetModules();
    const { withModalityAction } = await import("@/lib/modality/api-guard");

    const action = vi.fn(async (a: number, b: number) => a + b);
    const wrapped = withModalityAction("cannabis-medicine", action, {
      getPracticeId: () => "p1",
      route: "action:submitCannabisCheckin",
    });

    const out = await wrapped(2, 3);
    expect(out).toBe(5);
    expect(action).toHaveBeenCalledWith(2, 3);
  });

  it("throws ModalityDisabledError with a structured payload when off", async () => {
    findFirstMock.mockResolvedValue(null);
    vi.resetModules();
    const { withModalityAction, ModalityDisabledError } = await import(
      "@/lib/modality/api-guard"
    );

    const action = vi.fn();
    const wrapped = withModalityAction("cannabis-medicine", action, {
      getPracticeId: () => "p1",
      route: "action:cannabisSubmit",
    });

    let caught: unknown = null;
    try {
      await wrapped();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ModalityDisabledError);
    const err = caught as InstanceType<typeof ModalityDisabledError>;
    expect(err.modality).toBe("cannabis-medicine");
    expect(err.message).toMatch(/cannabis-medicine|disabled/i);
    expect(action).not.toHaveBeenCalled();

    expect(recordRejectionMock).toHaveBeenCalledOnce();
    expect(recordRejectionMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        practiceId: "p1",
        modality: "cannabis-medicine",
        route: "action:cannabisSubmit",
      }),
    );
  });
});

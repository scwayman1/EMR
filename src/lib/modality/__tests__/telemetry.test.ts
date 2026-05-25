/**
 * Modality telemetry tests — EMR-441
 *
 * The telemetry helper logs structured JSON via the project logger when a
 * `modality.rejected` event fires. We assert the wire-shape because the
 * `modality.rejected` event tag is what on-call greps for in aggregated logs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const warnMock = vi.fn();
vi.mock("@/lib/observability/log", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: (...args: unknown[]) => warnMock(...args),
    error: vi.fn(),
    with: vi.fn(),
  },
}));

beforeEach(() => {
  warnMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("recordModalityRejection", () => {
  it("emits a structured log keyed `modality.rejected`", async () => {
    const { recordModalityRejection } = await import(
      "@/lib/modality/telemetry"
    );

    recordModalityRejection({
      practiceId: "p-1",
      modality: "cannabis-medicine",
      route: "/api/agents/pharmacology",
    });

    expect(warnMock).toHaveBeenCalledOnce();
    const payload = warnMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.event).toBe("modality.rejected");
    expect(payload.practiceId).toBe("p-1");
    expect(payload.modality).toBe("cannabis-medicine");
    expect(payload.route).toBe("/api/agents/pharmacology");
    expect(typeof payload.timestamp).toBe("string");
    // ISO8601 string — Date should accept it round-trip.
    expect(new Date(payload.timestamp as string).toString()).not.toBe(
      "Invalid Date",
    );
  });

  it("accepts a caller-supplied timestamp without overriding it", async () => {
    const { recordModalityRejection } = await import(
      "@/lib/modality/telemetry"
    );

    const fixed = "2026-05-18T12:34:56.000Z";
    recordModalityRejection({
      practiceId: "p-2",
      modality: "commerce-leafmart",
      route: "/api/leafmart/checkout",
      timestamp: fixed,
    });

    expect(warnMock.mock.calls[0][0].timestamp).toBe(fixed);
  });
});

import { describe, expect, it } from "vitest";
import {
  advanceVisitState,
  isVisitSpineStatus,
  type VisitSpineStatus,
} from "./visit-state";

describe("visit-state", () => {
  it("allows scheduled visits to check in and stamps checkedInAt once", () => {
    const now = new Date("2026-05-30T16:00:00.000Z");
    const result = advanceVisitState(
      { status: "scheduled", checkedInAt: null },
      "checked_in",
      now,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("checked_in");
    expect(result.data.checkedInAt).toEqual(now);
  });

  it("does not replace an existing timestamp on idempotent transition", () => {
    const checkedInAt = new Date("2026-05-30T15:45:00.000Z");
    const now = new Date("2026-05-30T16:00:00.000Z");
    const result = advanceVisitState(
      { status: "checked_in", checkedInAt },
      "checked_in",
      now,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("checked_in");
    expect(result.data.checkedInAt).toEqual(checkedInAt);
  });

  it("rejects jumping from scheduled directly to complete", () => {
    const result = advanceVisitState(
      { status: "scheduled", completedAt: null },
      "complete",
      new Date("2026-05-30T16:00:00.000Z"),
    );

    expect(result).toEqual({
      ok: false,
      error: "Cannot transition visit from scheduled to complete.",
    });
  });

  it("keeps legacy in_progress compatible with active visit", () => {
    const now = new Date("2026-05-30T16:00:00.000Z");
    const result = advanceVisitState(
      { status: "in_progress", startedAt: null },
      "in_visit",
      now,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("in_visit");
    expect(result.data.startedAt).toEqual(now);
  });

  it("recognizes all canonical spine statuses", () => {
    const statuses: VisitSpineStatus[] = [
      "scheduled",
      "checked_in",
      "info_incomplete",
      "ready",
      "rooming",
      "roomed",
      "in_visit",
      "wrap_up",
      "complete",
      "cancelled",
      "no_show",
    ];

    expect(statuses.every(isVisitSpineStatus)).toBe(true);
    expect(isVisitSpineStatus("in_progress")).toBe(false);
  });
});

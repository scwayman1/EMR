import { describe, expect, it } from "vitest";
import { mapEncounterStatusToQueueStatus } from "./queue-board";

describe("queue-board status mapping", () => {
  it.each([
    ["scheduled", "scheduled"],
    ["checked_in", "arrived"],
    ["info_incomplete", "arrived"],
    ["ready", "arrived"],
    ["rooming", "rooming"],
    ["roomed", "rooming"],
    ["in_visit", "in_visit"],
    ["wrap_up", "checkout"],
    ["complete", "completed"],
    ["cancelled", "completed"],
    ["no_show", "completed"],
  ] as const)("maps %s to %s", (encounterStatus, queueStatus) => {
    expect(mapEncounterStatusToQueueStatus(encounterStatus)).toBe(queueStatus);
  });

  it("keeps legacy in_progress visible as in visit", () => {
    expect(mapEncounterStatusToQueueStatus("in_progress")).toBe("in_visit");
  });
});

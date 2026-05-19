import { describe, it, expect } from "vitest";
import { getDailyResetWindow } from "./daily-reset-window";

// EMR-575 — Daily reset boundary tests.
//
// All cases below use local-time Date constructors so the assertions stay
// stable across CI hosts (the helper itself is local-tz; the test
// constructs Dates the same way).

describe("getDailyResetWindow", () => {
  it("opens at yesterday 23:59 when now is mid-morning", () => {
    const now = new Date(2026, 4, 18, 10, 0, 0, 0); // 2026-05-18 10:00
    const { start, end } = getDailyResetWindow(now);

    const expectedStart = new Date(2026, 4, 17, 23, 59, 0, 0);
    expect(start.getTime()).toBe(expectedStart.getTime());
    expect(end.getTime()).toBe(now.getTime());
  });

  it("still opens at yesterday 23:59 when now is 23:58", () => {
    const now = new Date(2026, 4, 18, 23, 58, 0, 0);
    const { start } = getDailyResetWindow(now);

    const expectedStart = new Date(2026, 4, 17, 23, 59, 0, 0);
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it("opens at today 23:59 when now is 23:59:30 (just after the boundary)", () => {
    const now = new Date(2026, 4, 18, 23, 59, 30, 0);
    const { start } = getDailyResetWindow(now);

    const expectedStart = new Date(2026, 4, 18, 23, 59, 0, 0);
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it("opens at today 23:59 exactly when now is 23:59:00", () => {
    const now = new Date(2026, 4, 18, 23, 59, 0, 0);
    const { start } = getDailyResetWindow(now);
    expect(start.getTime()).toBe(now.getTime());
  });

  it("rolls correctly across a month boundary", () => {
    const now = new Date(2026, 5, 1, 0, 5, 0, 0); // 2026-06-01 00:05
    const { start } = getDailyResetWindow(now);
    const expectedStart = new Date(2026, 4, 31, 23, 59, 0, 0); // 2026-05-31 23:59
    expect(start.getTime()).toBe(expectedStart.getTime());
  });

  it("end equals the now anchor (not mutated)", () => {
    const now = new Date(2026, 4, 18, 14, 22, 11, 444);
    const { end } = getDailyResetWindow(now);
    expect(end.getTime()).toBe(now.getTime());
    expect(end).not.toBe(now);
  });
});

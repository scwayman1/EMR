import { describe, expect, it } from "vitest";
import {
  evaluateScreening,
  evaluateAllScreenings,
  fairytaleScreeningParagraph,
  SCREENINGS,
  dueScreenings,
  type PatientScreeningHistory,
} from "./uspstf-screenings";

// EMR-070 — USPSTF preventive screening engine

function findScreening(id: string) {
  const s = SCREENINGS.find((x) => x.id === id);
  if (!s) throw new Error(`screening ${id} missing from catalogue`);
  return s;
}

const TODAY = new Date();
const monthsAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
};

describe("dueScreenings (catalogue gate)", () => {
  it("includes mammogram for a 50yo female", () => {
    const ids = dueScreenings(50, "female").map((s) => s.id);
    expect(ids).toContain("mammogram");
    expect(ids).toContain("colonoscopy");
  });

  it("excludes mammogram for a 50yo male", () => {
    const ids = dueScreenings(50, "male").map((s) => s.id);
    expect(ids).not.toContain("mammogram");
    expect(ids).not.toContain("pap-smear");
  });

  it("excludes age-bounded screens for a 30yo", () => {
    const ids = dueScreenings(30, "female").map((s) => s.id);
    expect(ids).not.toContain("colonoscopy");
    expect(ids).not.toContain("dexa");
  });

  it("never-applicable AAA for a young woman", () => {
    const ids = dueScreenings(40, "female").map((s) => s.id);
    expect(ids).not.toContain("aaa");
  });
});

describe("evaluateScreening", () => {
  it("marks an applicable screening with no history as due", () => {
    const e = evaluateScreening(findScreening("mammogram"), { age: 55, sex: "F" });
    expect(e.status).toBe("due");
    expect(e.emojiBadge).toContain("⏰");
    expect(e.clinicianMessage.toLowerCase()).toContain("due");
  });

  it("marks an applicable screening recently completed as current", () => {
    const e = evaluateScreening(
      findScreening("mammogram"),
      { age: 55, sex: "F" },
      { screeningId: "mammogram", lastCompletedAt: monthsAgo(6) },
    );
    expect(e.status).toBe("current");
    expect(e.emojiBadge).toContain("✅");
  });

  it("marks long-overdue screens as overdue", () => {
    // mammogram cadence is every 2 years. 5 yrs ago → overdue
    const e = evaluateScreening(
      findScreening("mammogram"),
      { age: 55, sex: "F" },
      { screeningId: "mammogram", lastCompletedAt: monthsAgo(60) },
    );
    expect(e.status).toBe("overdue");
    expect(e.emojiBadge).toContain("🚨");
    expect(e.daysOffset).not.toBeNull();
    expect((e.daysOffset ?? 0) > 90).toBe(true);
  });

  it("respects patient_declined regardless of timing", () => {
    const e = evaluateScreening(
      findScreening("colonoscopy"),
      { age: 60, sex: "M" },
      {
        screeningId: "colonoscopy",
        lastCompletedAt: null,
        declined: true,
        note: "Family history concern overrode this year",
      },
    );
    expect(e.status).toBe("patient_declined");
    expect(e.clinicianMessage).toContain("Family history");
  });

  it("returns not_applicable for off-profile patients", () => {
    const e = evaluateScreening(findScreening("aaa"), { age: 30, sex: "F" });
    expect(e.status).toBe("not_applicable");
    expect(e.emojiBadge).toContain("➖");
  });

  it("one-time screen with prior completion is current forever", () => {
    const e = evaluateScreening(
      findScreening("hep-c"),
      { age: 40, sex: "M" },
      { screeningId: "hep-c", lastCompletedAt: monthsAgo(120) },
    );
    expect(e.status).toBe("current");
  });

  it("one-time screen never done is always due", () => {
    const e = evaluateScreening(findScreening("hep-c"), { age: 40, sex: "M" });
    expect(e.status).toBe("due");
    expect(e.daysOffset).toBe(0);
  });
});

describe("evaluateAllScreenings rollup", () => {
  it("produces a punch list sorted overdue-first", () => {
    const history: PatientScreeningHistory[] = [
      { screeningId: "mammogram", lastCompletedAt: monthsAgo(60) }, // overdue
      { screeningId: "bp", lastCompletedAt: monthsAgo(6) }, // current
    ];
    const r = evaluateAllScreenings({ age: 55, sex: "F" }, history);
    expect(r.punchList.length).toBeGreaterThan(0);
    expect(r.punchList[0]!.status).toBe("overdue");
    // checklist contains only applicable items
    for (const c of r.checklist) {
      expect(c.status).not.toBe("not_applicable");
    }
  });

  it("scores high when every periodic screen is current", () => {
    // "Every visit" cadence (tobacco counseling) is always due by design,
    // so we expect a high but not perfect score.
    const history: PatientScreeningHistory[] = SCREENINGS
      .filter((s) => s.isDue(40, "female") && s.frequency !== "Every visit")
      .map((s) => ({ screeningId: s.id, lastCompletedAt: monthsAgo(1) }));
    const r = evaluateAllScreenings({ age: 40, sex: "female" }, history);
    expect(r.healthMaintenanceScore).toBeGreaterThanOrEqual(90);
    // Every-visit screens are permanently due — we accept those in the punch list.
    expect(r.punchList.every((p) => p.screening.frequency === "Every visit")).toBe(true);
  });

  it("drops the score when items are overdue", () => {
    const r = evaluateAllScreenings({ age: 55, sex: "female" }, []);
    expect(r.healthMaintenanceScore).toBeLessThan(100);
  });
});

describe("fairytaleScreeningParagraph", () => {
  it("celebrates when everything periodic is current", () => {
    // Mark all applicable screens complete except "Every visit" ones — and
    // also mark tobacco as declined so nothing remains overdue/due.
    const applicable = SCREENINGS.filter((s) => s.isDue(40, "female"));
    const history: PatientScreeningHistory[] = applicable.map((s) =>
      s.frequency === "Every visit"
        ? { screeningId: s.id, lastCompletedAt: null, declined: true }
        : { screeningId: s.id, lastCompletedAt: monthsAgo(1) },
    );
    const r = evaluateAllScreenings({ age: 40, sex: "female" }, history);
    const para = fairytaleScreeningParagraph(r);
    expect(para).toMatch(/up to date|fantastic/i);
  });

  it("names overdue items by emoji + label", () => {
    const history: PatientScreeningHistory[] = [
      { screeningId: "mammogram", lastCompletedAt: monthsAgo(60) },
    ];
    const r = evaluateAllScreenings({ age: 55, sex: "female" }, history);
    const para = fairytaleScreeningParagraph(r);
    expect(para).toContain("Mammogram");
  });
});

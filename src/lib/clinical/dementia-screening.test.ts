import { describe, expect, it } from "vitest";
import {
  scoreMiniCog,
  scoreAd8,
  combineScreens,
  AD8_ITEMS,
  type Ad8Answers,
} from "./dementia-screening";

// EMR-079 — dementia / Alzheimer's screening (Mini-Cog + AD8)

describe("scoreMiniCog (Borson 2000)", () => {
  it("scores all 3 recall + normal clock as normal", () => {
    const r = scoreMiniCog({ recall: 3, clockNormal: true });
    expect(r.total).toBe(5);
    expect(r.severity).toBe("normal");
  });

  it("scores 0 recall + abnormal clock as concerning", () => {
    const r = scoreMiniCog({ recall: 0, clockNormal: false });
    expect(r.total).toBe(0);
    expect(r.severity).toBe("concerning");
  });

  it("scores 3 as borderline", () => {
    // 1 recall + normal clock (2) = 3 → borderline
    const r = scoreMiniCog({ recall: 1, clockNormal: true });
    expect(r.total).toBe(3);
    expect(r.severity).toBe("borderline");
  });

  it("clamps out-of-range recall counts", () => {
    const high = scoreMiniCog({ recall: 99, clockNormal: true });
    expect(high.total).toBe(5);
    const low = scoreMiniCog({ recall: -1, clockNormal: false });
    expect(low.total).toBe(0);
  });

  it("4+ is the negative-screen threshold", () => {
    const r = scoreMiniCog({ recall: 2, clockNormal: true });
    expect(r.total).toBe(4);
    expect(r.severity).toBe("normal");
  });
});

describe("scoreAd8 (Galvin 2005)", () => {
  it("all-no is normal with no unanswered items", () => {
    const answers: Ad8Answers = Object.fromEntries(
      AD8_ITEMS.map((i) => [i.key, false]),
    );
    const r = scoreAd8(answers);
    expect(r.total).toBe(0);
    expect(r.severity).toBe("normal");
    expect(r.unanswered).toEqual([]);
  });

  it("2+ items endorsed is concerning", () => {
    const r = scoreAd8({ judgment: true, repeats: true });
    expect(r.total).toBe(2);
    expect(r.severity).toBe("concerning");
  });

  it("1 endorsement is borderline", () => {
    const r = scoreAd8({ finances: true });
    expect(r.total).toBe(1);
    expect(r.severity).toBe("borderline");
  });

  it("reports unanswered items", () => {
    const r = scoreAd8({ judgment: false });
    expect(r.unanswered.length).toBe(AD8_ITEMS.length - 1);
    // unanswered does not include 'judgment'
    expect(r.unanswered).not.toContain("judgment");
  });
});

describe("combineScreens", () => {
  it("returns concerning when either screen is concerning", () => {
    const mc = scoreMiniCog({ recall: 0, clockNormal: false }); // concerning
    const ad8 = scoreAd8({ judgment: false }); // normal
    const r = combineScreens(mc, ad8);
    expect(r.composite).toBe("concerning");
    expect(r.flagForFollowUp).toBe(true);
    expect(r.recommendation).toMatch(/memory clinic|neurology/i);
  });

  it("returns borderline when only one is borderline", () => {
    const mc = scoreMiniCog({ recall: 1, clockNormal: true }); // 3 → borderline
    const ad8 = scoreAd8({}); // normal (0 endorsements)
    const r = combineScreens(mc, ad8);
    expect(r.composite).toBe("borderline");
    expect(r.flagForFollowUp).toBe(true);
  });

  it("returns normal only when both screens are normal", () => {
    const mc = scoreMiniCog({ recall: 3, clockNormal: true });
    const ad8 = scoreAd8(
      Object.fromEntries(AD8_ITEMS.map((i) => [i.key, false])),
    );
    const r = combineScreens(mc, ad8);
    expect(r.composite).toBe("normal");
    expect(r.flagForFollowUp).toBe(false);
  });

  it("handles missing informant (no AD8) gracefully", () => {
    const mc = scoreMiniCog({ recall: 3, clockNormal: true });
    const r = combineScreens(mc, null);
    expect(r.composite).toBe("normal");
    expect(r.ad8).toBeNull();
  });
});

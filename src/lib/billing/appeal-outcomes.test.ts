import { describe, expect, it } from "vitest";
import {
  rankArguments,
  recordOutcome,
  winRateByCarc,
  winRateByPayer,
  type OutcomeHistoryRow,
} from "./appeal-outcomes";

describe("recordOutcome", () => {
  const base = {
    organizationId: "org1",
    appealPacketId: "pkt1",
    claimId: "clm1",
    payerId: "60054",
    payerName: "Aetna",
    carcCode: "50",
    rarcCode: null,
    argumentTags: ["medical_necessity" as const, "policy_citation" as const],
    recoveredCents: 50000,
    decisionDate: new Date(),
  };

  it("emits a memory write per argument tag on a win", () => {
    const r = recordOutcome({ ...base, result: "overturned" });
    expect(r.memoryWrites).toHaveLength(2);
    expect(r.memoryWrites[0].content).toContain("WON");
    expect(r.memoryWrites[0].content).toContain("CARC 50");
    expect(r.memoryWrites[0].tags).toContain("appeal_outcome");
  });

  it("emits memory writes on losses too (negative learning)", () => {
    const r = recordOutcome({ ...base, result: "upheld", recoveredCents: 0 });
    expect(r.memoryWrites).toHaveLength(2);
    expect(r.memoryWrites[0].content).toContain("LOST");
  });

  it("emits no memory writes for pending / no_response (no signal)", () => {
    expect(recordOutcome({ ...base, result: "pending" }).memoryWrites).toHaveLength(0);
    expect(recordOutcome({ ...base, result: "no_response" }).memoryWrites).toHaveLength(0);
  });

  it("emits no memory writes when payerId or carcCode is missing", () => {
    expect(recordOutcome({ ...base, payerId: null, result: "overturned" }).memoryWrites).toHaveLength(0);
    expect(recordOutcome({ ...base, carcCode: null, result: "overturned" }).memoryWrites).toHaveLength(0);
  });
});

describe("rankArguments", () => {
  const history: OutcomeHistoryRow[] = [
    // Aetna + CARC 50 — medical_necessity wins 4x, policy_citation wins 1x
    ...Array(4).fill({ payerId: "60054", carcCode: "50", argumentTags: ["medical_necessity"], result: "overturned", recoveredCents: 50000 }),
    { payerId: "60054", carcCode: "50", argumentTags: ["policy_citation"], result: "overturned", recoveredCents: 30000 },
    { payerId: "60054", carcCode: "50", argumentTags: ["policy_citation"], result: "upheld", recoveredCents: 0 },
    { payerId: "60054", carcCode: "50", argumentTags: ["policy_citation"], result: "upheld", recoveredCents: 0 },
    { payerId: "60054", carcCode: "50", argumentTags: ["policy_citation"], result: "upheld", recoveredCents: 0 },
  ];

  it("returns scores ordered by win rate descending", () => {
    const scores = rankArguments({
      payerId: "60054",
      carcCode: "50",
      candidates: ["medical_necessity", "policy_citation"],
      history,
    });
    expect(scores[0].tag).toBe("medical_necessity");
    expect(scores[0].winRate).toBeGreaterThan(scores[1].winRate);
  });

  it("falls back to global history when payer-local samples < 3", () => {
    const scores = rankArguments({
      payerId: "99999", // unknown payer
      carcCode: "50",
      candidates: ["medical_necessity"],
      history,
    });
    expect(scores[0].reason).toContain("global");
    expect(scores[0].sampleSize).toBe(4);
  });

  it("returns smoothed score for never-seen arguments (cold start)", () => {
    const scores = rankArguments({
      payerId: "60054",
      carcCode: "50",
      candidates: ["timely_filing_proof"],
      history,
    });
    // Smoothed prior: 1 / (0 + 2) = 0.5
    expect(scores[0].winRate).toBeCloseTo(0.5, 1);
    expect(scores[0].sampleSize).toBe(0);
  });
});

describe("winRateByPayer", () => {
  it("aggregates across results and computes a smoothed-half-win rate", () => {
    const rows = [
      { payerName: "Aetna", result: "overturned" as const, recoveredCents: 30000 },
      { payerName: "Aetna", result: "partial" as const, recoveredCents: 15000 },
      { payerName: "Aetna", result: "upheld" as const, recoveredCents: 0 },
      { payerName: "BCBS", result: "overturned" as const, recoveredCents: 20000 },
    ];
    const stats = winRateByPayer(rows);
    const aetna = stats.find((s) => s.payerName === "Aetna");
    expect(aetna).toBeDefined();
    expect(aetna!.wins).toBe(1);
    expect(aetna!.partials).toBe(1);
    expect(aetna!.losses).toBe(1);
    // (1 + 0.5*1) / 3 = 0.5
    expect(aetna!.winRate).toBeCloseTo(0.5, 5);
    expect(aetna!.recoveredCents).toBe(45000);
  });

  it("orders by total volume descending", () => {
    const rows = [
      { payerName: "BCBS", result: "overturned" as const, recoveredCents: 0 },
      { payerName: "Aetna", result: "overturned" as const, recoveredCents: 0 },
      { payerName: "Aetna", result: "upheld" as const, recoveredCents: 0 },
    ];
    const stats = winRateByPayer(rows);
    expect(stats[0].payerName).toBe("Aetna");
  });
});

describe("winRateByCarc", () => {
  it("ignores rows with null CARC", () => {
    const stats = winRateByCarc([
      { carcCode: null, result: "overturned", recoveredCents: 0 },
      { carcCode: "50", result: "overturned", recoveredCents: 1000 },
      { carcCode: "50", result: "upheld", recoveredCents: 0 },
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].carcCode).toBe("50");
    expect(stats[0].winRate).toBe(0.5);
  });
});

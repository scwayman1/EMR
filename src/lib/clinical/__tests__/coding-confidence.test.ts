import { describe, expect, it } from "vitest";
import {
  applyGrounding,
  conceptTerms,
  groundCode,
  overallCodingConfidence,
  parseCodingResponse,
  parseCriticResponse,
  reconcileConfidence,
  runConfidenceLoop,
  type CandidateCode,
} from "../coding-confidence";

describe("conceptTerms", () => {
  it("drops generic descriptors, keeps clinical concepts", () => {
    expect(conceptTerms("Other chronic pain")).toEqual(["pain"]);
    expect(conceptTerms("Neoplasm related pain (chronic)")).toEqual(["neoplasm", "pain"]);
    expect(conceptTerms("Primary insomnia")).toEqual(["insomnia"]);
  });
});

describe("groundCode", () => {
  it("grounds a code whose concept (or synonym) is in the note", () => {
    const note = "Patient reports trouble with sleep and frequent waking.";
    const g = groundCode("Primary insomnia", note);
    expect(g.grounded).toBe(true);
    expect(g.matchedTerms).toContain("insomnia"); // matched via 'sleep' synonym
  });

  it("does NOT ground a code whose concept is absent", () => {
    const note = "Complaints regarding the scrotal and anal areas. Further evaluation needed.";
    expect(groundCode("Primary insomnia", note).grounded).toBe(false);
    expect(groundCode("Neoplasm related pain (chronic)", note).grounded).toBe(false);
  });

  it("treats concept-less labels as neutral (not dropped)", () => {
    const g = groundCode("Unspecified", "anything");
    expect(g.grounded).toBe(true);
    expect(g.score).toBe(0.5);
  });
});

describe("reconcileConfidence", () => {
  it("keeps ~model confidence when fully grounded and scales down partial support", () => {
    expect(reconcileConfidence(0.9, 1)).toBeCloseTo(0.9, 5);
    expect(reconcileConfidence(0.9, 0.5)).toBeCloseTo(0.63, 5);
    expect(reconcileConfidence(0.9, 0)).toBeCloseTo(0.36, 5);
  });
});

describe("applyGrounding — the screenshot scenario", () => {
  // The note from the report: scrotal/anal complaint, no pain/sleep/neoplasm.
  const note =
    "### Objective\n\n### Assessment\nThe patient presents with complaints regarding the scrotal and anal areas. Further evaluation is needed.\n\n### Plan\nSchedule a follow-up appointment for a comprehensive physical exam.";

  const candidates: CandidateCode[] = [
    { code: "G89.3", label: "Neoplasm related pain (chronic)", confidence: 0.92 },
    { code: "F51.01", label: "Primary insomnia", confidence: 0.88 },
  ];

  it("drops both mismatched codes that the note never supports", () => {
    const { kept, dropped } = applyGrounding(candidates, note);
    expect(kept).toHaveLength(0);
    expect(dropped.map((c) => c.code).sort()).toEqual(["F51.01", "G89.3"]);
    expect(overallCodingConfidence(kept)).toBe(0);
  });

  it("keeps a code that IS supported and reconciles its confidence", () => {
    const supportedNote = note + " Patient also reports chronic low back pain.";
    const { kept } = applyGrounding(
      [{ code: "G89.29", label: "Other chronic pain", confidence: 0.8 }],
      supportedNote,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].code).toBe("G89.29");
    expect(kept[0].grounded).toBe(true);
    expect(kept[0].confidence).toBeCloseTo(0.8, 5); // 'pain' present → full grounding
  });
});

describe("parseCriticResponse", () => {
  it("parses verdicts and missed codes", () => {
    const r = parseCriticResponse(
      '{"verdicts":[{"code":"G89.29","supported":true,"confidence":0.9,"evidence":"low back pain"}],"missed":[{"code":"F41.1","label":"Generalized anxiety disorder","confidence":0.8}]}',
    );
    expect(r?.verdicts[0]).toMatchObject({ code: "G89.29", supported: true });
    expect(r?.missed[0].code).toBe("F41.1");
  });
});

describe("runConfidenceLoop (aggressive critic loop)", () => {
  const note =
    "Assessment: chronic low back pain. Patient also reports anxiety.";
  const candidates: CandidateCode[] = [
    { code: "G89.29", label: "Other chronic pain", confidence: 0.8 },
    { code: "F51.01", label: "Primary insomnia", confidence: 0.88 },
  ];

  function scriptedComplete(responses: string[]) {
    let i = 0;
    return async () => responses[Math.min(i++, responses.length - 1)];
  }

  it("drops ungrounded codes, adds critic-surfaced missed codes, and stabilises", async () => {
    const complete = scriptedComplete([
      // round 1: pain supported, anxiety surfaced as missed
      '{"verdicts":[{"code":"G89.29","supported":true,"confidence":0.9,"evidence":"low back pain"}],"missed":[{"code":"F41.1","label":"Generalized anxiety disorder","confidence":0.8,"rationale":"reports anxiety"}]}',
      // round 2: both supported, nothing missed → stable
      '{"verdicts":[{"code":"G89.29","supported":true,"confidence":0.9},{"code":"F41.1","supported":true,"confidence":0.8}],"missed":[]}',
    ]);
    const res = await runConfidenceLoop({ noteText: note, candidates, complete });
    const codes = res.kept.map((c) => c.code).sort();
    expect(codes).toEqual(["F41.1", "G89.29"]);
    expect(res.dropped.some((d) => d.code === "F51.01")).toBe(true); // insomnia gone
    expect(res.rounds).toBe(2);
  });

  it("drops a code the critic marks unsupported", async () => {
    const complete = scriptedComplete([
      '{"verdicts":[{"code":"G89.29","supported":false,"confidence":0.2}],"missed":[]}',
    ]);
    const res = await runConfidenceLoop({
      noteText: note,
      candidates: [{ code: "G89.29", label: "Other chronic pain", confidence: 0.8 }],
      complete,
    });
    expect(res.kept).toHaveLength(0);
  });

  it("applies the aggressive confidence floor with the critic disabled", async () => {
    const res = await runConfidenceLoop({
      noteText: "Patient reports mild nausea.",
      candidates: [{ code: "R11.0", label: "Nausea", confidence: 0.3 }],
      complete: async () => {
        throw new Error("critic should not be called");
      },
      options: { enableCritic: false, confidenceFloor: 0.5 },
    });
    expect(res.rounds).toBe(0);
    expect(res.kept).toHaveLength(0); // 0.3 < floor
    expect(res.dropped.some((d) => d.code === "R11.0")).toBe(true);
  });
});

describe("parseCodingResponse", () => {
  it("parses fenced JSON into a normalized shape", () => {
    const res = parseCodingResponse(
      '```json\n{"icd10":[{"code":"G47.00","label":"Insomnia, unspecified","confidence":0.7}],"emLevel":"99214","emRationale":"moderate","overallConfidence":0.7}\n```',
    );
    expect(res?.icd10).toHaveLength(1);
    expect(res?.icd10[0].code).toBe("G47.00");
    expect(res?.emLevel).toBe("99214");
    expect(res?.overallConfidence).toBe(0.7);
  });

  it("returns null on unusable output", () => {
    expect(parseCodingResponse("no json here")).toBeNull();
  });
});

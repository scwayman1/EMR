import { describe, expect, it } from "vitest";
import {
  FIXED_COLUMNS,
  buildHeader,
  collectMetricNames,
  escapeCell,
  streamCohortCsv,
  toCohortCsv,
  toCohortCsvStream,
} from "./cohort-csv";
import type { CohortRow } from "./cohort-export";

function row(overrides: Partial<CohortRow> = {}): CohortRow {
  return {
    pseudonymId: "aaaaaaaaaaaaaaaa",
    ageBucket: "30-34",
    gender: "female",
    state: "CA",
    condition: "Chronic pain",
    icd10Code: "G89.4",
    treatmentSummary: "THC 10mg/day",
    cannabinoids: ["CBD", "THC"],
    outcomes: [],
    outcomeEventCount: 0,
    ...overrides,
  };
}

describe("escapeCell", () => {
  it("returns empty string for null / undefined", () => {
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(undefined)).toBe("");
  });

  it("passes simple strings through unchanged", () => {
    expect(escapeCell("hello")).toBe("hello");
    expect(escapeCell(42)).toBe("42");
  });

  it("quotes strings containing a comma", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
  });

  it("quotes and doubles embedded quotes", () => {
    expect(escapeCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes strings containing newlines and carriage returns", () => {
    expect(escapeCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });
});

describe("collectMetricNames + buildHeader", () => {
  it("returns sorted distinct metric names", () => {
    const rows: CohortRow[] = [
      row({
        outcomes: [
          { metric: "pain", count: 1, mean: 5, min: 5, max: 5 },
          { metric: "sleep", count: 1, mean: 7, min: 7, max: 7 },
        ],
      }),
      row({
        pseudonymId: "bbbbbbbbbbbbbbbb",
        outcomes: [
          { metric: "anxiety", count: 1, mean: 4, min: 4, max: 4 },
          { metric: "pain", count: 1, mean: 3, min: 3, max: 3 },
        ],
      }),
    ];
    expect(collectMetricNames(rows)).toEqual(["anxiety", "pain", "sleep"]);
  });

  it("builds a header with fixed columns then metric_<name>_{count,mean,min,max}", () => {
    const rows: CohortRow[] = [
      row({
        outcomes: [{ metric: "pain", count: 1, mean: 5, min: 5, max: 5 }],
      }),
    ];
    const header = buildHeader(rows);
    expect(header.slice(0, FIXED_COLUMNS.length)).toEqual([...FIXED_COLUMNS]);
    expect(header.slice(FIXED_COLUMNS.length)).toEqual([
      "metric_pain_count",
      "metric_pain_mean",
      "metric_pain_min",
      "metric_pain_max",
    ]);
  });

  it("produces only fixed columns when no outcomes exist anywhere", () => {
    expect(buildHeader([])).toEqual([...FIXED_COLUMNS]);
    expect(buildHeader([row({ outcomes: [] })])).toEqual([...FIXED_COLUMNS]);
  });
});

describe("toCohortCsv", () => {
  it("produces a header-only CSV when rows is empty", () => {
    const csv = toCohortCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(FIXED_COLUMNS.join(","));
    // Trailing newline after the header + the split-induced empty final element.
    expect(lines[1]).toBe("");
    expect(lines).toHaveLength(2);
  });

  it("emits one row per patient with correct fixed columns", () => {
    const csv = toCohortCsv([
      row({
        pseudonymId: "abcdef0123456789",
        ageBucket: "30-34",
        gender: "female",
        state: "CA",
        condition: "Chronic pain",
        icd10Code: "G89.4",
        treatmentSummary: "THC 10mg/day",
        cannabinoids: ["CBD", "THC"],
        outcomes: [],
        outcomeEventCount: 0,
      }),
    ]);
    const lines = csv.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      "abcdef0123456789,30-34,female,CA,Chronic pain,G89.4,THC 10mg/day,CBD;THC,0",
    );
  });

  it("joins cannabinoids with ';' inside a single CSV cell", () => {
    const csv = toCohortCsv([row({ cannabinoids: ["CBD", "CBG", "THC"] })]);
    const line = csv.split("\n")[1];
    expect(line).toContain(",CBD;CBG;THC,");
  });

  it("renders null ageBucket / gender / state as empty cells (no 'null' string)", () => {
    const csv = toCohortCsv([
      row({
        pseudonymId: "0000000000000000",
        ageBucket: null,
        gender: null,
        state: null,
        condition: null,
        icd10Code: null,
        treatmentSummary: null,
        cannabinoids: [],
      }),
    ]);
    expect(csv).not.toContain("null");
    const line = csv.split("\n")[1];
    expect(line).toBe("0000000000000000,,,,,,,,0");
  });

  it("escapes cells that contain commas or quotes", () => {
    const csv = toCohortCsv([
      row({
        treatmentSummary: 'THC "pen", 2.5mg/puff',
        condition: "pain, chronic",
      }),
    ]);
    expect(csv).toContain('"pain, chronic"');
    expect(csv).toContain('"THC ""pen"", 2.5mg/puff"');
  });

  it("fills outcome cells per-metric; missing metrics render as empty", () => {
    const csv = toCohortCsv([
      row({
        pseudonymId: "1111111111111111",
        outcomes: [{ metric: "pain", count: 3, mean: 4.5, min: 3, max: 7 }],
      }),
      row({
        pseudonymId: "2222222222222222",
        outcomes: [{ metric: "sleep", count: 2, mean: 6, min: 5, max: 7 }],
      }),
    ]);
    const lines = csv.trimEnd().split("\n");
    // Header columns: 9 fixed + 4 (pain) + 4 (sleep) = 17
    expect(lines[0].split(",")).toHaveLength(17);
    // Row for pseudonym 1111... — has pain, no sleep
    expect(lines[1]).toContain(",3,4.5,3,7,,,,");
    // Row for pseudonym 2222... — has sleep, no pain
    expect(lines[2]).toContain(",,,,,2,6,5,7");
  });

  it("has a trailing newline on each emitted line", () => {
    let chunks = 0;
    let endsWithNewline = true;
    for (const line of streamCohortCsv([row()])) {
      chunks++;
      if (!line.endsWith("\n")) endsWithNewline = false;
    }
    expect(chunks).toBe(2); // header + 1 row
    expect(endsWithNewline).toBe(true);
  });
});

describe("toCohortCsvStream", () => {
  it("pipes the same bytes as toCohortCsv", async () => {
    const rows = [
      row({
        pseudonymId: "cccccccccccccccc",
        outcomes: [{ metric: "pain", count: 1, mean: 5, min: 5, max: 5 }],
      }),
    ];
    const stream = toCohortCsvStream(rows);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value);
    }
    expect(full).toBe(toCohortCsv(rows));
  });
});

describe("column order (documented contract)", () => {
  it("pins the first 9 fixed columns in the exact documented sequence", () => {
    expect([...FIXED_COLUMNS]).toEqual([
      "pseudonym_id",
      "age_bucket",
      "gender",
      "state",
      "condition",
      "icd10_code",
      "treatment_summary",
      "cannabinoids",
      "outcome_event_count",
    ]);
  });
});

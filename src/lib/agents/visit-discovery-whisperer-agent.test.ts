import { describe, expect, it } from "vitest";
import {
  coerceCategory,
  coerceSeverity,
  parseDiscoveryResponse,
  renderNoteForPrompt,
} from "./visit-discovery-whisperer-agent";

describe("parseDiscoveryResponse", () => {
  it("parses a clean found response", () => {
    const raw = JSON.stringify({
      discovery: "found",
      category: "medication_response",
      severity: "concern",
      summary: "Patient reports new sedation on the higher evening dose.",
      actionSuggested: "Consider dose reduction.",
    });
    const parsed = parseDiscoveryResponse(raw);
    expect(parsed).toEqual({
      discovery: "found",
      category: "medication_response",
      severity: "concern",
      summary: "Patient reports new sedation on the higher evening dose.",
      actionSuggested: "Consider dose reduction.",
    });
  });

  it("parses a clean none response", () => {
    const raw = JSON.stringify({ discovery: "none" });
    expect(parseDiscoveryResponse(raw)).toEqual({ discovery: "none" });
  });

  it("strips markdown fences around JSON", () => {
    const raw = '```json\n{"discovery":"none"}\n```';
    expect(parseDiscoveryResponse(raw)).toEqual({ discovery: "none" });
  });

  it("strips leading prose before a JSON object", () => {
    const raw = 'Sure! Here is the JSON:\n{"discovery":"none"}\nLet me know if you need more.';
    expect(parseDiscoveryResponse(raw)).toEqual({ discovery: "none" });
  });

  it("returns null on malformed JSON", () => {
    expect(parseDiscoveryResponse("not json at all")).toBeNull();
    expect(parseDiscoveryResponse("{")).toBeNull();
    expect(parseDiscoveryResponse("{discovery: 'none'}")).toBeNull();
  });

  it("returns null when discovery field is missing or unknown", () => {
    expect(parseDiscoveryResponse('{"foo":"bar"}')).toBeNull();
    expect(parseDiscoveryResponse('{"discovery":"maybe"}')).toBeNull();
  });

  it("drops non-string category/severity/summary fields", () => {
    const raw = JSON.stringify({
      discovery: "found",
      category: 42,
      severity: null,
      summary: ["a", "b"],
    });
    const parsed = parseDiscoveryResponse(raw);
    expect(parsed).toEqual({
      discovery: "found",
      category: undefined,
      severity: undefined,
      summary: undefined,
      actionSuggested: undefined,
    });
  });
});

describe("coerceCategory", () => {
  it("accepts valid enum values", () => {
    expect(coerceCategory("medication_response")).toBe("medication_response");
    expect(coerceCategory("red_flag")).toBe("red_flag");
  });

  it("is case-insensitive", () => {
    expect(coerceCategory("SYMPTOM_TREND")).toBe("symptom_trend");
    expect(coerceCategory("  adherence  ")).toBe("adherence");
  });

  it("rejects unknown values", () => {
    expect(coerceCategory("concerning")).toBeNull();
    expect(coerceCategory("")).toBeNull();
    expect(coerceCategory(undefined)).toBeNull();
  });
});

describe("coerceSeverity", () => {
  it("accepts the four valid levels", () => {
    expect(coerceSeverity("info")).toBe("info");
    expect(coerceSeverity("notable")).toBe("notable");
    expect(coerceSeverity("concern")).toBe("concern");
    expect(coerceSeverity("urgent")).toBe("urgent");
  });

  it("rejects unknown severities", () => {
    expect(coerceSeverity("critical")).toBeNull();
    expect(coerceSeverity("low")).toBeNull();
    expect(coerceSeverity(undefined)).toBeNull();
  });
});

describe("renderNoteForPrompt", () => {
  it("joins block heading + body with blank-line separators", () => {
    const blocks = [
      { heading: "Assessment", body: "Pain well-controlled." },
      { heading: "Plan", body: "Continue current regimen." },
    ];
    const rendered = renderNoteForPrompt(blocks, null);
    expect(rendered).toBe(
      "Assessment:\nPain well-controlled.\n\nPlan:\nContinue current regimen.",
    );
  });

  it("falls back to block type when heading is missing", () => {
    const blocks = [{ type: "assessment", body: "Stable." }];
    const rendered = renderNoteForPrompt(blocks, null);
    expect(rendered).toBe("assessment:\nStable.");
  });

  it("appends narrative when present", () => {
    const rendered = renderNoteForPrompt(
      [{ heading: "Plan", body: "Follow up in 4 weeks." }],
      "Patient is doing well overall.",
    );
    expect(rendered).toContain("Plan:\nFollow up in 4 weeks.");
    expect(rendered).toContain("Narrative:\nPatient is doing well overall.");
  });

  it("handles non-array blocks gracefully", () => {
    expect(renderNoteForPrompt(null, "just a narrative")).toBe(
      "Narrative:\njust a narrative",
    );
    expect(renderNoteForPrompt(undefined, null)).toBe("");
  });

  it("skips blocks with empty bodies", () => {
    const blocks = [
      { heading: "Assessment", body: "" },
      { heading: "Plan", body: "Continue." },
    ];
    const rendered = renderNoteForPrompt(blocks, null);
    expect(rendered).toBe("Plan:\nContinue.");
  });
});

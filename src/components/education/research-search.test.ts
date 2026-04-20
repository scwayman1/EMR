import { describe, expect, it } from "vitest";
import { formatAuthors, applyCannabisFilter } from "./research-search";

describe("formatAuthors", () => {
  it("returns 'Unknown authors' for an empty list", () => {
    expect(formatAuthors([])).toBe("Unknown authors");
  });

  it("joins up to three authors with a comma", () => {
    expect(formatAuthors(["A", "B"])).toBe("A, B");
    expect(formatAuthors(["A", "B", "C"])).toBe("A, B, C");
  });

  it("appends 'et al.' for four or more authors", () => {
    expect(formatAuthors(["A", "B", "C", "D"])).toBe("A, B, C et al.");
  });
});

describe("applyCannabisFilter", () => {
  it("is a no-op when disabled", () => {
    expect(applyCannabisFilter("sleep quality", false)).toBe("sleep quality");
  });

  it("adds cannabis to queries that don't mention it", () => {
    expect(applyCannabisFilter("chronic pain", true)).toBe("chronic pain cannabis");
  });

  it("does not add cannabis if it's already in the query (any casing)", () => {
    expect(applyCannabisFilter("CBD epilepsy", true)).toBe("CBD epilepsy");
    expect(applyCannabisFilter("Cannabis use disorder", true)).toBe(
      "Cannabis use disorder"
    );
    expect(applyCannabisFilter("marijuana adolescents", true)).toBe(
      "marijuana adolescents"
    );
  });
});

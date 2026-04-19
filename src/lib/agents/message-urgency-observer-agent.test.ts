import { describe, expect, it } from "vitest";
import { truncate } from "./message-urgency-observer-agent";

describe("truncate", () => {
  it("leaves short strings unchanged", () => {
    expect(truncate("hello", 20)).toBe("hello");
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("collapses internal whitespace runs", () => {
    expect(truncate("hello   world", 20)).toBe("hello world");
    expect(truncate("line\n\nbreak", 20)).toBe("line break");
  });

  it("trims leading and trailing whitespace", () => {
    expect(truncate("   padded   ", 20)).toBe("padded");
  });

  it("truncates with an ellipsis when the message exceeds max", () => {
    const result = truncate("a".repeat(100), 10);
    expect(result.length).toBe(10);
    expect(result.endsWith("…")).toBe(true);
  });

  it("does not include trailing spaces before the ellipsis", () => {
    const result = truncate("hello world and more text here", 12);
    expect(result.endsWith(" …")).toBe(false);
    expect(result.endsWith("…")).toBe(true);
  });
});

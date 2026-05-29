import { describe, expect, it } from "vitest";
import {
  formatPhoneNumber,
  isValidPhone,
  normalizePhoneDigits,
  toCanonicalPhone,
} from "../phone";

describe("normalizePhoneDigits", () => {
  it("strips separators down to significant digits", () => {
    expect(normalizePhoneDigits("(303) 555-1212")).toBe("3035551212");
    expect(normalizePhoneDigits("303.555.1212")).toBe("3035551212");
    expect(normalizePhoneDigits("303 555 1212")).toBe("3035551212");
  });

  it("drops a leading US country code on an 11-digit number", () => {
    expect(normalizePhoneDigits("+1 (303) 555-1212")).toBe("3035551212");
    expect(normalizePhoneDigits("13035551212")).toBe("3035551212");
  });

  it("does NOT truncate overlong input — overflow must stay visible", () => {
    // The reviewer's case: a typo'd 11-digit number that is not a US "+1".
    // Truncating to the first 10 would silently produce a wrong-but-valid
    // number; instead we surface all 11 so validation rejects it.
    expect(normalizePhoneDigits("30355512123")).toBe("30355512123");
    expect(normalizePhoneDigits("303555121299")).toBe("303555121299");
  });
});

describe("isValidPhone", () => {
  it("accepts exactly 10 significant digits (with or without +1)", () => {
    expect(isValidPhone("(303) 555-1212")).toBe(true);
    expect(isValidPhone("+1 303 555 1212")).toBe(true);
  });

  it("rejects overlong or short input rather than truncating", () => {
    expect(isValidPhone("30355512123")).toBe(false); // 11 digits, not +1
    expect(isValidPhone("303555121299")).toBe(false); // extension/typo
    expect(isValidPhone("3035551")).toBe(false); // too short
    expect(isValidPhone("")).toBe(false);
  });
});

describe("formatPhoneNumber", () => {
  it("formats progressively as digits are entered", () => {
    expect(formatPhoneNumber("")).toBe("");
    expect(formatPhoneNumber("303")).toBe("303");
    expect(formatPhoneNumber("30355")).toBe("(303) 55");
    expect(formatPhoneNumber("3035551212")).toBe("(303) 555-1212");
    expect(formatPhoneNumber("+1 3035551212")).toBe("(303) 555-1212");
  });

  it("renders overlong input as raw digits, not a fake-valid number", () => {
    // Must not become "(303) 555-1212" — that would hide the typo.
    expect(formatPhoneNumber("30355512123")).toBe("30355512123");
  });
});

describe("toCanonicalPhone", () => {
  it("renders the first 10 digits in canonical form", () => {
    expect(toCanonicalPhone("3035551212")).toBe("(303) 555-1212");
  });
});

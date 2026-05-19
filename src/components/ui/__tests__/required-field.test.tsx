import { describe, it, expect } from "vitest";
import util from "util";
import React from "react";
import {
  RequiredFieldHelper,
  RequiredField,
  requiredFieldClasses,
  REQUIRED_FIELD_MESSAGE,
} from "../required-field";

/**
 * EMR-586 — required-field validation primitives.
 *
 * Tests run in the node Vitest environment (no DOM). We assert on either
 * pure-utility return values or the shape of the React element tree using
 * `util.inspect`, matching the pattern used by other component tests in the
 * repo (e.g. src/app/(clinician)/clinic/page.test.tsx).
 */

describe("requiredFieldClasses", () => {
  it("returns the red border + ring classes when invalid", () => {
    const out = requiredFieldClasses(true);
    expect(out).toContain("border-red-500");
    expect(out).toContain("ring-red-500");
  });

  it("returns an empty string when valid", () => {
    expect(requiredFieldClasses(false)).toBe("");
  });
});

describe("RequiredFieldHelper", () => {
  it("renders the lowercase helper copy when visible", () => {
    const element = RequiredFieldHelper({ visible: true });
    const dump = util.inspect(element, { depth: null });
    expect(dump).toContain(REQUIRED_FIELD_MESSAGE);
    expect(REQUIRED_FIELD_MESSAGE).toBe("please complete each field");
  });

  it("renders nothing (null) when not visible", () => {
    const element = RequiredFieldHelper({ visible: false });
    expect(element).toBeNull();
  });
});

describe("RequiredField wrapper", () => {
  it("renders children unchanged when there is no error", () => {
    const child = React.createElement("input", { id: "x" });
    const tree = RequiredField({ error: undefined, children: child });
    const dump = util.inspect(tree, { depth: null });
    // No helper text when error is absent
    expect(dump).not.toContain(REQUIRED_FIELD_MESSAGE);
  });

  it("renders the helper + invalid styling when error is set", () => {
    const child = React.createElement("input", { id: "x" });
    const tree = RequiredField({ error: "required", children: child });
    const dump = util.inspect(tree, { depth: null });
    // The wrapper should mark itself with the invalid token so consumers
    // (and CSS) can target the red treatment consistently.
    expect(dump).toContain("data-invalid");
    // It should mount a RequiredFieldHelper with visible: true. The helper
    // itself is unit-tested separately for the message copy.
    expect(dump).toContain("RequiredFieldHelper");
    expect(dump).toContain("visible: true");
  });
});

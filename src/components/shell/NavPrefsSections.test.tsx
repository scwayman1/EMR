import * as React from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NavPrefsValue } from "./NavPrefsContext";

/**
 * Render-level tests for the pinned + recent sidebar strips.
 *
 * Strategy: we mock `./NavPrefsContext` so the component sees a fully
 * hydrated context with deterministic pins/recents (the real provider is
 * effect-driven, which `renderToString` does not run). No JSDOM required —
 * we assert against the server HTML only.
 */

// Module-level state the mock reads from; each test mutates this before
// calling renderToString.
let mockValue: NavPrefsValue | null = null;

vi.mock("./NavPrefsContext", () => ({
  useNavPrefs: () => mockValue,
}));

// Import AFTER the mock is registered so the component binds to the mocked
// hook.
import { NavPrefsSections } from "./NavPrefsSections";

function makeValue(overrides: Partial<NavPrefsValue>): NavPrefsValue {
  return {
    pins: [],
    recents: [],
    pin: () => {},
    unpin: () => {},
    isPinned: () => false,
    visit: () => {},
    clearAll: () => {},
    hydrated: true,
    ...overrides,
  };
}

describe("NavPrefsSections (render)", () => {
  beforeEach(() => {
    mockValue = null;
  });

  it("returns null when the provider is missing", () => {
    mockValue = null;
    const html = renderToString(<NavPrefsSections />);
    expect(html).toBe("");
  });

  it("renders the silent placeholder before hydration (no pin hint yet)", () => {
    mockValue = makeValue({ hydrated: false });
    const html = renderToString(<NavPrefsSections />);
    // aria-hidden placeholder keeps the rail layout stable.
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("star any page to pin it");
    expect(html).not.toContain("Pinned");
  });

  it("renders the empty hint when pins are empty", () => {
    mockValue = makeValue({ pins: [], recents: [], hydrated: true });
    const html = renderToString(<NavPrefsSections />);
    expect(html).toContain("Pinned");
    expect(html).toContain("⌘K + star any page to pin it");
  });

  it("hides the Manage button when both lists are empty", () => {
    mockValue = makeValue({ pins: [], recents: [], hydrated: true });
    const html = renderToString(<NavPrefsSections />);
    expect(html).not.toContain(">Manage<");
    expect(html).not.toContain('aria-label="Clear pinned and recent"');
  });

  it("shows the Manage button when pins exist", () => {
    mockValue = makeValue({
      pins: [{ href: "/ops/billing", label: "Billing", pinnedAt: 1 }],
      recents: [],
      hydrated: true,
    });
    const html = renderToString(<NavPrefsSections />);
    expect(html).toContain(">Manage<");
    expect(html).toContain('aria-label="Clear pinned and recent"');
  });

  it("renders a pin row when pins exist and omits the empty hint", () => {
    mockValue = makeValue({
      pins: [{ href: "/ops/billing", label: "Billing", pinnedAt: 1 }],
      recents: [],
      hydrated: true,
    });
    const html = renderToString(<NavPrefsSections />);
    expect(html).toContain('href="/ops/billing"');
    expect(html).toContain(">Billing<");
    expect(html).not.toContain("star any page to pin it");
  });

  it("does not render the Recent section when recents is empty", () => {
    mockValue = makeValue({
      pins: [{ href: "/a", label: "A", pinnedAt: 1 }],
      recents: [],
      hydrated: true,
    });
    const html = renderToString(<NavPrefsSections />);
    expect(html).not.toContain(">Recent<");
  });

  it("renders the Recent section with rows when recents exist", () => {
    mockValue = makeValue({
      pins: [],
      recents: [
        { href: "/clinic/patients/1", label: "Patient 1", visitedAt: 2 },
        { href: "/clinic/patients/2", label: "Patient 2", visitedAt: 1 },
      ],
      hydrated: true,
    });
    const html = renderToString(<NavPrefsSections />);
    expect(html).toContain(">Recent<");
    expect(html).toContain('href="/clinic/patients/1"');
    expect(html).toContain('href="/clinic/patients/2"');
    // Manage is visible because recents is non-empty.
    expect(html).toContain(">Manage<");
  });
});

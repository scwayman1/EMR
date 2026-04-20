import { describe, expect, it } from "vitest";
import {
  aggregateSectionBadge,
  collapseStorageKey,
  flattenSectionItems,
  itemMatchesPath,
  readPersistedCollapseState,
  resolveInitialCollapseState,
  sectionContainsPath,
  toggleCollapseState,
  type NavSection,
} from "./nav-sections";

describe("aggregateSectionBadge", () => {
  it("returns null when no items have counts", () => {
    const section: NavSection = {
      label: "Ops",
      items: [
        { label: "A", href: "/a" },
        { label: "B", href: "/b", count: 0 },
      ],
    };
    expect(aggregateSectionBadge(section)).toBeNull();
  });

  it("sums counts across items", () => {
    const section: NavSection = {
      label: "Billing",
      items: [
        { label: "Denials", href: "/denials", count: 3 },
        { label: "Aging", href: "/aging", count: 2 },
        { label: "Scrub", href: "/scrub", count: 0 },
      ],
    };
    expect(aggregateSectionBadge(section)).toEqual({ count: 5, tone: "highlight" });
  });

  it("picks the loudest tone among contributing items", () => {
    const section: NavSection = {
      label: "Review",
      items: [
        { label: "A", href: "/a", count: 1, countTone: "highlight" },
        { label: "B", href: "/b", count: 2, countTone: "accent" },
        { label: "C", href: "/c", count: 1, countTone: "danger" },
      ],
    };
    expect(aggregateSectionBadge(section)).toEqual({ count: 4, tone: "danger" });
  });

  it("ignores tone of zero-count items", () => {
    const section: NavSection = {
      label: "Review",
      items: [
        // A danger-toned item with zero count should NOT elevate the group.
        { label: "A", href: "/a", count: 0, countTone: "danger" },
        { label: "B", href: "/b", count: 4, countTone: "highlight" },
      ],
    };
    expect(aggregateSectionBadge(section)).toEqual({ count: 4, tone: "highlight" });
  });
});

describe("itemMatchesPath", () => {
  it("matches on exact pathname", () => {
    expect(itemMatchesPath("/ops/billing", "/ops/billing")).toBe(true);
  });

  it("matches nested routes", () => {
    expect(itemMatchesPath("/ops/billing", "/ops/billing/123")).toBe(true);
  });

  it("does not let top-level hrefs match every nested path", () => {
    // "/clinic" (one segment) should only match itself exactly.
    expect(itemMatchesPath("/clinic", "/clinic/patients")).toBe(false);
    expect(itemMatchesPath("/clinic", "/clinic")).toBe(true);
  });

  it("does not match unrelated paths", () => {
    expect(itemMatchesPath("/ops/billing", "/ops/billings")).toBe(false);
    expect(itemMatchesPath("/ops/billing", "/ops")).toBe(false);
  });
});

describe("sectionContainsPath", () => {
  it("returns true when any item matches", () => {
    const section: NavSection = {
      label: "Billing",
      items: [
        { label: "Scrub", href: "/ops/scrub" },
        { label: "Denials", href: "/ops/denials" },
      ],
    };
    expect(sectionContainsPath(section, "/ops/denials/42")).toBe(true);
  });

  it("returns false when no item matches", () => {
    const section: NavSection = {
      label: "Billing",
      items: [
        { label: "Scrub", href: "/ops/scrub" },
        { label: "Denials", href: "/ops/denials" },
      ],
    };
    expect(sectionContainsPath(section, "/ops/staff-schedule")).toBe(false);
  });
});

describe("resolveInitialCollapseState", () => {
  const sections: NavSection[] = [
    { items: [{ label: "Overview", href: "/ops" }] }, // unlabeled tier-1
    {
      label: "Billing",
      items: [
        { label: "Scrub", href: "/ops/scrub" },
        { label: "Denials", href: "/ops/denials" },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Staff", href: "/ops/staff-schedule" },
        { label: "Policies", href: "/ops/policies" },
      ],
      defaultCollapsed: true,
    },
    {
      label: "System",
      items: [
        { label: "Webhooks", href: "/ops/webhooks" },
        { label: "Backups", href: "/ops/backups" },
      ],
      defaultCollapsed: true,
    },
  ];

  it("skips unlabeled sections", () => {
    const out = resolveInitialCollapseState({ sections, pathname: "/ops", persisted: {} });
    expect(Object.keys(out).sort()).toEqual(["Billing", "Operations", "System"]);
  });

  it("expands the section containing the current pathname, overriding default", () => {
    const out = resolveInitialCollapseState({
      sections,
      pathname: "/ops/staff-schedule",
      persisted: {},
    });
    expect(out.Operations).toBe(false); // forced open despite defaultCollapsed
    expect(out.Billing).toBe(false); // default expanded
    expect(out.System).toBe(true); // default collapsed
  });

  it("honors persisted state when the section does not contain the current path", () => {
    const out = resolveInitialCollapseState({
      sections,
      pathname: "/ops",
      persisted: { Billing: true, System: false },
    });
    expect(out.Billing).toBe(true);
    expect(out.Operations).toBe(true); // default collapsed, nothing persisted
    expect(out.System).toBe(false); // user override wins over default
  });

  it("persisted state cannot keep the active section collapsed", () => {
    const out = resolveInitialCollapseState({
      sections,
      pathname: "/ops/denials",
      persisted: { Billing: true }, // user previously collapsed, but now in Billing
    });
    expect(out.Billing).toBe(false);
  });

  it("uses defaultCollapsed as the final fallback", () => {
    const out = resolveInitialCollapseState({
      sections,
      pathname: "/ops",
      persisted: {},
    });
    expect(out.Billing).toBe(false); // no default → expanded
    expect(out.Operations).toBe(true); // default collapsed
    expect(out.System).toBe(true); // default collapsed
  });
});

describe("readPersistedCollapseState", () => {
  const sections: NavSection[] = [
    { label: "Billing", items: [{ label: "X", href: "/x" }] },
    { label: "Operations", items: [{ label: "Y", href: "/y" }] },
    { label: "System", items: [{ label: "Z", href: "/z" }] },
    { items: [{ label: "Top", href: "/top" }] }, // unlabeled, ignored
  ];

  it("round-trips booleans through the storage key convention", () => {
    const store = new Map<string, string>();
    store.set(collapseStorageKey("Billing"), "true");
    store.set(collapseStorageKey("Operations"), "false");
    const out = readPersistedCollapseState(sections, (k) => store.get(k) ?? null);
    expect(out).toEqual({ Billing: true, Operations: false });
  });

  it("ignores malformed values", () => {
    const store = new Map<string, string>();
    store.set(collapseStorageKey("Billing"), "yes"); // not "true"/"false"
    store.set(collapseStorageKey("System"), "true");
    const out = readPersistedCollapseState(sections, (k) => store.get(k) ?? null);
    expect(out).toEqual({ System: true });
  });

  it("returns empty when nothing is persisted", () => {
    const out = readPersistedCollapseState(sections, () => null);
    expect(out).toEqual({});
  });
});

describe("toggleCollapseState", () => {
  it("flips an existing key without mutating the input", () => {
    const before = { Billing: true, Operations: false };
    const after = toggleCollapseState(before, "Billing");
    expect(before).toEqual({ Billing: true, Operations: false }); // unmutated
    expect(after).toEqual({ Billing: false, Operations: false });
  });

  it("treats an absent key as expanded (undefined → true)", () => {
    const after = toggleCollapseState({}, "System");
    expect(after).toEqual({ System: true });
  });
});

describe("flattenSectionItems", () => {
  it("preserves order across sections", () => {
    const sections: NavSection[] = [
      { items: [{ label: "A", href: "/a" }] },
      {
        label: "Group",
        items: [
          { label: "B", href: "/b" },
          { label: "C", href: "/c" },
        ],
      },
    ];
    expect(flattenSectionItems(sections).map((i) => i.label)).toEqual(["A", "B", "C"]);
  });
});

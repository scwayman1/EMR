import { describe, expect, it } from "vitest";
import {
  PINS_MAX,
  PINS_STORAGE_KEY,
  RECENT_MAX,
  RECENT_STORAGE_KEY,
  addPin,
  parsePins,
  parseRecents,
  recordVisit,
  removePin,
  reorderPin,
  type PinnedEntry,
  type RecentEntry,
} from "./nav-prefs";

describe("addPin", () => {
  it("adds a new pin at the top", () => {
    const next = addPin([], { href: "/clinic/queue", label: "Queue" }, 1000);
    expect(next).toEqual([
      { href: "/clinic/queue", label: "Queue", pinnedAt: 1000 },
    ]);
  });

  it("dedupes by href and bumps the existing entry to the top with a fresh timestamp", () => {
    const start: PinnedEntry[] = [
      { href: "/a", label: "A", pinnedAt: 100 },
      { href: "/b", label: "B", pinnedAt: 200 },
    ];
    const next = addPin(start, { href: "/a", label: "A renamed" }, 500);
    expect(next).toEqual([
      { href: "/a", label: "A renamed", pinnedAt: 500 },
      { href: "/b", label: "B", pinnedAt: 200 },
    ]);
  });

  it("caps the list at PINS_MAX", () => {
    let pins: PinnedEntry[] = [];
    for (let i = 0; i < PINS_MAX + 3; i++) {
      pins = addPin(pins, { href: `/p/${i}`, label: `P${i}` }, i);
    }
    expect(pins).toHaveLength(PINS_MAX);
    // Most recent pin is at the head
    expect(pins[0].href).toBe(`/p/${PINS_MAX + 2}`);
    // Earliest additions have fallen off
    expect(pins.some((p) => p.href === "/p/0")).toBe(false);
  });

  it("preserves insertion order (newest first) when adding distinct pins", () => {
    let pins: PinnedEntry[] = [];
    pins = addPin(pins, { href: "/a", label: "A" }, 1);
    pins = addPin(pins, { href: "/b", label: "B" }, 2);
    pins = addPin(pins, { href: "/c", label: "C" }, 3);
    expect(pins.map((p) => p.href)).toEqual(["/c", "/b", "/a"]);
  });
});

describe("removePin", () => {
  it("removes a pin matched by href", () => {
    const pins: PinnedEntry[] = [
      { href: "/a", label: "A", pinnedAt: 1 },
      { href: "/b", label: "B", pinnedAt: 2 },
    ];
    const next = removePin(pins, "/a");
    expect(next).toEqual([{ href: "/b", label: "B", pinnedAt: 2 }]);
  });

  it("is a no-op (same reference) when href is not present", () => {
    const pins: PinnedEntry[] = [{ href: "/a", label: "A", pinnedAt: 1 }];
    const next = removePin(pins, "/missing");
    expect(next).toBe(pins);
  });

  it("removes from an empty array as a no-op", () => {
    const pins: PinnedEntry[] = [];
    const next = removePin(pins, "/nope");
    expect(next).toBe(pins);
  });
});

describe("reorderPin", () => {
  const start: PinnedEntry[] = [
    { href: "/a", label: "A", pinnedAt: 1 },
    { href: "/b", label: "B", pinnedAt: 2 },
    { href: "/c", label: "C", pinnedAt: 3 },
  ];

  it("moves a middle pin up by one position", () => {
    const next = reorderPin(start, "/b", "up");
    expect(next.map((p) => p.href)).toEqual(["/b", "/a", "/c"]);
  });

  it("moves a middle pin down by one position", () => {
    const next = reorderPin(start, "/b", "down");
    expect(next.map((p) => p.href)).toEqual(["/a", "/c", "/b"]);
  });

  it("is a no-op (same reference) when moving the first pin up", () => {
    const next = reorderPin(start, "/a", "up");
    expect(next).toBe(start);
  });

  it("is a no-op (same reference) when moving the last pin down", () => {
    const next = reorderPin(start, "/c", "down");
    expect(next).toBe(start);
  });

  it("is a no-op when the href is not in the list", () => {
    const next = reorderPin(start, "/missing", "up");
    expect(next).toBe(start);
  });

  it("preserves pinnedAt timestamps on both swapped entries", () => {
    const next = reorderPin(start, "/c", "up");
    expect(next).toEqual([
      { href: "/a", label: "A", pinnedAt: 1 },
      { href: "/c", label: "C", pinnedAt: 3 },
      { href: "/b", label: "B", pinnedAt: 2 },
    ]);
  });

  it("is pure — the input array is not mutated", () => {
    const snapshot = start.map((p) => ({ ...p }));
    reorderPin(start, "/b", "up");
    expect(start).toEqual(snapshot);
  });

  it("handles a single-element list as a no-op in either direction", () => {
    const one: PinnedEntry[] = [{ href: "/a", label: "A", pinnedAt: 1 }];
    expect(reorderPin(one, "/a", "up")).toBe(one);
    expect(reorderPin(one, "/a", "down")).toBe(one);
  });
});

describe("recordVisit", () => {
  it("adds a new recent at the top", () => {
    const next = recordVisit([], { href: "/x", label: "X" }, 1000);
    expect(next).toEqual([{ href: "/x", label: "X", visitedAt: 1000 }]);
  });

  it("dedupes by href — repeat visits bump the entry to the top", () => {
    const start: RecentEntry[] = [
      { href: "/a", label: "A", visitedAt: 100 },
      { href: "/b", label: "B", visitedAt: 200 },
      { href: "/c", label: "C", visitedAt: 300 },
    ];
    const next = recordVisit(start, { href: "/a", label: "A" }, 999);
    expect(next).toEqual([
      { href: "/a", label: "A", visitedAt: 999 },
      { href: "/b", label: "B", visitedAt: 200 },
      { href: "/c", label: "C", visitedAt: 300 },
    ]);
  });

  it("caps at RECENT_MAX", () => {
    let recents: RecentEntry[] = [];
    for (let i = 0; i < RECENT_MAX + 4; i++) {
      recents = recordVisit(recents, { href: `/r/${i}`, label: `R${i}` }, i);
    }
    expect(recents).toHaveLength(RECENT_MAX);
    expect(recents[0].href).toBe(`/r/${RECENT_MAX + 3}`);
    expect(recents.at(-1)?.href).toBe(`/r/${RECENT_MAX + 3 - (RECENT_MAX - 1)}`);
  });

  it("keeps ordering newest-first across distinct hrefs", () => {
    let recents: RecentEntry[] = [];
    recents = recordVisit(recents, { href: "/a", label: "A" }, 1);
    recents = recordVisit(recents, { href: "/b", label: "B" }, 2);
    recents = recordVisit(recents, { href: "/c", label: "C" }, 3);
    expect(recents.map((r) => r.href)).toEqual(["/c", "/b", "/a"]);
  });
});

describe("parsePins", () => {
  it("returns [] for null, empty, or malformed JSON", () => {
    expect(parsePins(null)).toEqual([]);
    expect(parsePins("")).toEqual([]);
    expect(parsePins("{not json")).toEqual([]);
    expect(parsePins("\"just a string\"")).toEqual([]);
    expect(parsePins("42")).toEqual([]);
  });

  it("strips individual malformed entries but preserves valid siblings", () => {
    const raw = JSON.stringify([
      { href: "/a", label: "A", pinnedAt: 1 },
      { href: 42, label: "bad" },
      null,
      { href: "/b", label: "B", pinnedAt: 2 },
    ]);
    expect(parsePins(raw)).toEqual([
      { href: "/a", label: "A", pinnedAt: 1 },
      { href: "/b", label: "B", pinnedAt: 2 },
    ]);
  });

  it("clamps to PINS_MAX on read", () => {
    const payload = Array.from({ length: PINS_MAX + 5 }, (_, i) => ({
      href: `/p/${i}`,
      label: `P${i}`,
      pinnedAt: i,
    }));
    expect(parsePins(JSON.stringify(payload))).toHaveLength(PINS_MAX);
  });
});

describe("parseRecents", () => {
  it("returns [] for null / malformed JSON / wrong shape", () => {
    expect(parseRecents(null)).toEqual([]);
    expect(parseRecents("nope")).toEqual([]);
    expect(parseRecents(JSON.stringify({ not: "array" }))).toEqual([]);
  });

  it("clamps to RECENT_MAX on read", () => {
    const payload = Array.from({ length: RECENT_MAX + 3 }, (_, i) => ({
      href: `/r/${i}`,
      label: `R${i}`,
      visitedAt: i,
    }));
    expect(parseRecents(JSON.stringify(payload))).toHaveLength(RECENT_MAX);
  });
});

describe("storage keys", () => {
  it("are versioned so future migrations can coexist", () => {
    expect(PINS_STORAGE_KEY).toBe("nav:pins:v1");
    expect(RECENT_STORAGE_KEY).toBe("nav:recent:v1");
  });
});

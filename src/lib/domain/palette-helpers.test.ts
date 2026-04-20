import { describe, expect, it, vi } from "vitest";
import {
  debounceAsync,
  filterCommands,
  filterNavByRole,
  fuzzyScore,
  groupCommands,
  type ActionCommand,
  type Command,
  type NavigationCommand,
  type PatientCommand,
} from "./palette-helpers";
import { filterActionsByRole, PALETTE_ACTIONS } from "./palette-actions";

// ─── Fixtures ─────────────────────────────────────────────

const navPatients: NavigationCommand = {
  kind: "navigation",
  id: "go-patients",
  label: "Go to patients",
  href: "/clinic/patients",
  keywords: ["roster"],
  roles: ["clinician", "practice_owner"],
};
const navAging: NavigationCommand = {
  kind: "navigation",
  id: "go-aging",
  label: "Open AR aging",
  href: "/ops/aging",
  keywords: ["aging", "ar"],
  roles: ["practice_owner"],
};
const navPortal: NavigationCommand = {
  kind: "navigation",
  id: "go-portal-home",
  label: "Open my portal",
  href: "/portal",
  roles: ["patient"],
};

const actToggle: ActionCommand = {
  kind: "action",
  id: "act-toggle-dark-mode",
  label: "Toggle dark mode",
  status: "real",
  keywords: ["theme"],
  run: () => {},
};
const patientMaya: PatientCommand = {
  kind: "patient",
  id: "patient-1",
  patientId: "p1",
  label: "Maya Reyes · 40y",
  description: "Last visit Apr 12 · 3 visits",
};

// ─── fuzzyScore ─────────────────────────────────────────────

describe("fuzzyScore", () => {
  it("returns 0 for an empty query", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });

  it("rewards contiguous matches over scattered subsequences", () => {
    const contig = fuzzyScore("aging", "open ar aging");
    const scattered = fuzzyScore("aing", "open ar aging");
    expect(contig).toBeGreaterThan(scattered);
  });

  it("returns -Infinity when query characters are not all present", () => {
    expect(fuzzyScore("xyz", "patients")).toBe(-Infinity);
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("PAT", "patients")).toBeGreaterThan(0);
    expect(fuzzyScore("pat", "PATIENTS")).toBeGreaterThan(0);
  });

  it("matches keywords through a joined haystack", () => {
    const haystack = "open ar aging aging ar";
    expect(fuzzyScore("ar", haystack)).toBeGreaterThan(0);
  });
});

// ─── filterCommands ───────────────────────────────────────────

describe("filterCommands", () => {
  const all: Command[] = [navPatients, navAging, actToggle, patientMaya];

  it("returns the input list verbatim for empty queries", () => {
    expect(filterCommands(all, "").length).toBe(all.length);
    expect(filterCommands(all, "   ").length).toBe(all.length);
  });

  it("filters across labels and keywords", () => {
    const out = filterCommands(all, "roster");
    // 'roster' is a keyword of navPatients only.
    expect(out.map((c) => c.id)).toContain("go-patients");
    expect(out.map((c) => c.id)).not.toContain("go-aging");
  });

  it("includes patient hits when query matches patient label", () => {
    const out = filterCommands(all, "maya");
    expect(out[0]?.id).toBe("patient-1");
  });

  it("ranks tighter matches first", () => {
    // 'theme' matches actToggle's keyword exactly.
    const out = filterCommands(all, "theme");
    expect(out[0]?.id).toBe("act-toggle-dark-mode");
  });
});

// ─── filterNavByRole ───────────────────────────────────────────

describe("filterNavByRole", () => {
  const nav = [navPatients, navAging, navPortal];

  it("hides practice_owner-only nav from clinician role", () => {
    const out = filterNavByRole(nav, ["clinician"]);
    expect(out.map((n) => n.id)).toEqual(["go-patients"]);
  });

  it("shows operator nav to practice_owner role", () => {
    const out = filterNavByRole(nav, ["practice_owner"]);
    expect(out.map((n) => n.id).sort()).toEqual(
      ["go-aging", "go-patients"].sort(),
    );
  });

  it("hides clinical/operator nav from patient role", () => {
    const out = filterNavByRole(nav, ["patient"]);
    expect(out.map((n) => n.id)).toEqual(["go-portal-home"]);
  });

  it("treats nav with undefined roles as visible to everyone", () => {
    const universal: NavigationCommand = {
      kind: "navigation",
      id: "universal",
      label: "Open help",
      href: "/help",
    };
    expect(filterNavByRole([universal], ["patient"]).length).toBe(1);
    expect(filterNavByRole([universal], ["clinician"]).length).toBe(1);
  });
});

// ─── filterActionsByRole ───────────────────────────────────────

describe("filterActionsByRole", () => {
  it("hides practice_owner-only actions from a clinician palette", () => {
    const clinicianActions = filterActionsByRole(PALETTE_ACTIONS, ["clinician"]);
    const ids = clinicianActions.map((a) => a.id);
    expect(ids).not.toContain("act-export-revenue-csv");
    expect(ids).not.toContain("act-pause-rcm-fleet");
    // Universal actions should remain.
    expect(ids).toContain("act-toggle-dark-mode");
    // Clinician-tagged actions should remain.
    expect(ids).toContain("act-sign-my-drafts");
  });

  it("shows everything to a practice owner", () => {
    const owner = filterActionsByRole(PALETTE_ACTIONS, ["practice_owner"]);
    expect(owner.map((a) => a.id)).toContain("act-export-revenue-csv");
    expect(owner.map((a) => a.id)).toContain("act-sign-my-drafts");
    expect(owner.map((a) => a.id)).toContain("act-toggle-dark-mode");
  });

  it("hides clinical and ops actions from a patient palette", () => {
    const patient = filterActionsByRole(PALETTE_ACTIONS, ["patient"]);
    const ids = patient.map((a) => a.id);
    expect(ids).not.toContain("act-sign-my-drafts");
    expect(ids).not.toContain("act-export-revenue-csv");
    // Universal actions still visible.
    expect(ids).toContain("act-toggle-dark-mode");
    expect(ids).toContain("act-keyboard-help");
  });
});

// ─── groupCommands ─────────────────────────────────────────────

describe("groupCommands", () => {
  it("groups in canonical order: patients → actions → navigate", () => {
    const sections = groupCommands([navPatients, actToggle, patientMaya]);
    expect(sections.map((s) => s.kind)).toEqual([
      "patient",
      "action",
      "navigation",
    ]);
  });

  it("omits empty sections", () => {
    const sections = groupCommands([navPatients]);
    expect(sections.length).toBe(1);
    expect(sections[0].kind).toBe("navigation");
  });

  it("preserves intra-section order", () => {
    const second: NavigationCommand = {
      ...navPatients,
      id: "second",
      label: "Second",
    };
    const sections = groupCommands([navPatients, second]);
    expect(sections[0].items.map((i) => i.id)).toEqual([
      "go-patients",
      "second",
    ]);
  });
});

// ─── PALETTE_ACTIONS registry ────────────────────────────────────

describe("PALETTE_ACTIONS registry", () => {
  it("ships at least 10 actions (per PR scope)", () => {
    expect(PALETTE_ACTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("every action has a unique id", () => {
    const ids = PALETTE_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every action has a run handler", () => {
    for (const a of PALETTE_ACTIONS) {
      expect(typeof a.run).toBe("function");
    }
  });

  it("declares both real and stubbed actions", () => {
    expect(PALETTE_ACTIONS.some((a) => a.status === "real")).toBe(true);
    expect(PALETTE_ACTIONS.some((a) => a.status === "stub")).toBe(true);
  });
});

// ─── debounceAsync ─────────────────────────────────────────────

describe("debounceAsync", () => {
  it("waits for the configured delay before calling the underlying fn", async () => {
    vi.useFakeTimers();
    const inner = vi.fn().mockResolvedValue("ok");
    const debounced = debounceAsync(inner, 200);

    const p = debounced("query").catch(() => undefined);

    expect(inner).not.toHaveBeenCalled();
    vi.advanceTimersByTime(199);
    expect(inner).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    await Promise.resolve(); // flush microtasks queued by setTimeout
    expect(inner).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledWith("query");

    vi.useRealTimers();
    await p;
  });

  it("only fires the most recent call when invoked rapidly", async () => {
    vi.useFakeTimers();
    const inner = vi.fn().mockResolvedValue("ok");
    const debounced = debounceAsync(inner, 200);

    debounced("a").catch(() => undefined);
    vi.advanceTimersByTime(100);
    debounced("b").catch(() => undefined);
    vi.advanceTimersByTime(100);
    debounced("c").catch(() => undefined);
    vi.advanceTimersByTime(200);

    await Promise.resolve();
    expect(inner).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledWith("c");

    vi.useRealTimers();
  });

  it("cancel() prevents the underlying fn from firing", async () => {
    vi.useFakeTimers();
    const inner = vi.fn().mockResolvedValue("ok");
    const debounced = debounceAsync(inner, 200);

    debounced("a").catch(() => undefined);
    debounced.cancel();
    vi.advanceTimersByTime(500);

    await Promise.resolve();
    expect(inner).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

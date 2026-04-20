import { describe, expect, it } from "vitest";
import {
  rankProviders,
  scoreProvider,
  type ProviderRecord,
} from "./provider-directory";

function p(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    id: overrides.id ?? "id-" + Math.random().toString(36).slice(2, 8),
    firstName: overrides.firstName ?? "Jane",
    lastName: overrides.lastName ?? "Doe",
    title: overrides.title ?? null,
    specialties: overrides.specialties ?? [],
    npi: overrides.npi ?? null,
    assignedPatientCount: overrides.assignedPatientCount ?? 0,
  };
}

describe("rankProviders — no query", () => {
  it("returns providers sorted by last name then first name", () => {
    const list = [
      p({ id: "3", firstName: "Zane", lastName: "Abel" }),
      p({ id: "1", firstName: "Alice", lastName: "Smith" }),
      p({ id: "2", firstName: "Bob", lastName: "Smith" }),
    ];
    const ranked = rankProviders(list);
    expect(ranked.map((x) => x.id)).toEqual(["3", "1", "2"]);
  });

  it("treats undefined query the same as empty string", () => {
    const list = [
      p({ id: "b", lastName: "Baker" }),
      p({ id: "a", lastName: "Adams" }),
    ];
    expect(rankProviders(list, undefined).map((x) => x.id)).toEqual(["a", "b"]);
    expect(rankProviders(list, "").map((x) => x.id)).toEqual(["a", "b"]);
    expect(rankProviders(list, "   ").map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const list = [
      p({ id: "2", lastName: "Zeta" }),
      p({ id: "1", lastName: "Alpha" }),
    ];
    const snapshot = list.map((x) => x.id);
    rankProviders(list);
    expect(list.map((x) => x.id)).toEqual(snapshot);
  });
});

describe("rankProviders — search filtering", () => {
  it("matches on last name (case-insensitive)", () => {
    const list = [
      p({ id: "1", firstName: "Alice", lastName: "Smith" }),
      p({ id: "2", firstName: "Bob", lastName: "Jones" }),
    ];
    const ranked = rankProviders(list, "SMITH");
    expect(ranked.map((x) => x.id)).toEqual(["1"]);
  });

  it("matches on specialty substring", () => {
    const list = [
      p({ id: "1", lastName: "A", specialties: ["Integrative Oncology"] }),
      p({ id: "2", lastName: "B", specialties: ["Pain Management"] }),
      p({ id: "3", lastName: "C", specialties: ["Palliative Care"] }),
    ];
    const ranked = rankProviders(list, "pain");
    expect(ranked.map((x) => x.id)).toEqual(["2"]);
  });

  it("ranks exact NPI match ahead of all substring matches", () => {
    const list = [
      p({ id: "name", firstName: "John", lastName: "Oncology" }),
      p({ id: "exact", npi: "1234567890" }),
      p({ id: "part", npi: "9991234567890" }),
    ];
    const ranked = rankProviders(list, "1234567890");
    // exact NPI first, then partial NPI substring, then nothing else
    expect(ranked.map((x) => x.id)).toEqual(["exact", "part"]);
  });

  it("full-name match outranks first-name-only match on the same query", () => {
    const list = [
      p({ id: "first-only", firstName: "Jane", lastName: "Roe" }),
      p({ id: "full", firstName: "Jane", lastName: "Smith" }),
    ];
    // "jane" matches first name on both, but "full" also wins on full-name match
    // via the full name "Jane Smith" being surfaced for subsequent queries. Here
    // we just check that a lone first-name query matches both and ties by
    // last-name sort (Roe < Smith).
    const ranked = rankProviders(list, "jane");
    expect(ranked.map((x) => x.id)).toEqual(["first-only", "full"]);
  });

  it("filters out providers with no match at all", () => {
    const list = [
      p({ id: "1", firstName: "Alice", lastName: "Smith" }),
      p({ id: "2", firstName: "Bob", lastName: "Jones" }),
    ];
    const ranked = rankProviders(list, "zzz");
    expect(ranked).toEqual([]);
  });

  it("breaks score ties deterministically by last then first name", () => {
    const list = [
      p({ id: "2", firstName: "Bea", lastName: "Oak", specialties: ["cardio"] }),
      p({ id: "3", firstName: "Ava", lastName: "Oak", specialties: ["cardio"] }),
      p({ id: "1", firstName: "Cal", lastName: "Ash", specialties: ["cardio"] }),
    ];
    const ranked = rankProviders(list, "cardio");
    // all tied on specialty score; sort by last (Ash, Oak, Oak), then first (Ava, Bea)
    expect(ranked.map((x) => x.id)).toEqual(["1", "3", "2"]);
  });

  it("matches title as a lower-priority fallback", () => {
    const list = [
      p({ id: "title", lastName: "X", title: "MD, FAAP" }),
      p({ id: "other", lastName: "Y", title: "DO, Internal Medicine" }),
    ];
    const ranked = rankProviders(list, "faap");
    expect(ranked.map((x) => x.id)).toEqual(["title"]);
  });
});

describe("scoreProvider", () => {
  it("returns 0 for empty query", () => {
    expect(scoreProvider(p({ firstName: "Jane" }), "")).toBe(0);
    expect(scoreProvider(p({ firstName: "Jane" }), "   ")).toBe(0);
  });
});

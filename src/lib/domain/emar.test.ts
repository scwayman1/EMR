import { describe, expect, it } from "vitest";
import {
  FORMULARY,
  searchFormulary,
  decodeAdministrationLog,
  EMAR_AUDIT_ACTION,
} from "./emar";

// EMR-077 — Modular EMAR formulary + administration log decoder

describe("FORMULARY catalogue", () => {
  it("contains common chronic-care drugs", () => {
    const names = FORMULARY.map((e) => e.generic);
    for (const expected of ["metformin", "lisinopril", "atorvastatin", "sertraline"]) {
      expect(names).toContain(expected);
    }
  });

  it("has no duplicate generic names", () => {
    const generics = FORMULARY.map((e) => e.generic.toLowerCase());
    expect(new Set(generics).size).toBe(generics.length);
  });

  it("every entry has a valid route + unit", () => {
    const validRoutes = new Set([
      "oral",
      "iv",
      "im",
      "topical",
      "subq",
      "inhaled",
      "sublingual",
    ]);
    for (const e of FORMULARY) {
      expect(validRoutes.has(e.route)).toBe(true);
      expect(e.unit.length).toBeGreaterThan(0);
    }
  });
});

describe("searchFormulary", () => {
  it("matches by brand name case-insensitively", () => {
    const r = searchFormulary("Lipitor");
    expect(r.some((e) => e.generic === "atorvastatin")).toBe(true);
  });

  it("matches by generic substring", () => {
    const r = searchFormulary("met");
    const generics = r.map((e) => e.generic);
    expect(generics).toContain("metformin");
    expect(generics).toContain("metoprolol");
  });

  it("returns the first 12 entries when query is empty", () => {
    const r = searchFormulary("");
    expect(r.length).toBe(12);
  });

  it("caps results at 12 even on broad queries", () => {
    const r = searchFormulary("in"); // matches many
    expect(r.length).toBeLessThanOrEqual(12);
  });

  it("returns empty when nothing matches", () => {
    const r = searchFormulary("zzznotadrug");
    expect(r).toEqual([]);
  });
});

describe("decodeAdministrationLog", () => {
  it("decodes a well-formed audit log row", () => {
    const decoded = decodeAdministrationLog({
      id: "log-1",
      actorUserId: "user-1",
      actor: { firstName: "Ada", lastName: "Lovelace" },
      metadata: {
        medicationLabel: "atorvastatin 20mg",
        amount: 20,
        unit: "mg",
        route: "oral",
        administeredAtIso: "2026-05-12T10:00:00Z",
      },
      createdAt: new Date("2026-05-12T10:00:00Z"),
    });
    expect(decoded?.medicationLabel).toBe("atorvastatin 20mg");
    expect(decoded?.administeredByName).toBe("Ada Lovelace");
    expect(decoded?.amount).toBe(20);
  });

  it("returns null when metadata is missing the label", () => {
    const decoded = decodeAdministrationLog({
      id: "log-2",
      actorUserId: "user-1",
      actor: null,
      metadata: { amount: 5 },
      createdAt: new Date(),
    });
    expect(decoded).toBeNull();
  });

  it("falls back to createdAt when administeredAtIso is absent", () => {
    const at = new Date("2026-05-12T08:00:00Z");
    const decoded = decodeAdministrationLog({
      id: "log-3",
      actorUserId: "user-1",
      actor: null,
      metadata: { medicationLabel: "ibuprofen 400mg" },
      createdAt: at,
    });
    expect(decoded?.administeredAtIso).toBe(at.toISOString());
  });

  it("returns null when metadata is not an object", () => {
    const decoded = decodeAdministrationLog({
      id: "log-4",
      actorUserId: "user-1",
      actor: null,
      metadata: null,
      createdAt: new Date(),
    });
    expect(decoded).toBeNull();
  });
});

describe("audit action identifier", () => {
  it("is the canonical med.administered string", () => {
    expect(EMAR_AUDIT_ACTION).toBe("med.administered");
  });
});

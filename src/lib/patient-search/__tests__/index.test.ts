// EMR-646 — Universal patient search tests.
//
// Covers the parsing helpers + Prisma where-clause builder. The DB-touching
// `searchPatients()` is exercised via a fake prisma client to keep these
// tests pure (no DATABASE_URL, no network).

import { describe, it, expect, vi } from "vitest";
import {
  parseQuery,
  buildPatientWhereClause,
  searchPatients,
  type PatientSearchPrisma,
} from "../index";

describe("parseQuery", () => {
  it("returns empty arrays for empty input", () => {
    const out = parseQuery("");
    expect(out.tokens).toEqual([]);
    expect(out.dates).toEqual([]);
    expect(out.phones).toEqual([]);
  });

  it("returns empty arrays for whitespace-only input", () => {
    const out = parseQuery("    ");
    expect(out.tokens).toEqual([]);
    expect(out.dates).toEqual([]);
    expect(out.phones).toEqual([]);
  });

  it("tokenizes a simple name query", () => {
    const out = parseQuery("Reyes");
    expect(out.tokens).toContain("Reyes");
    expect(out.dates).toEqual([]);
    expect(out.phones).toEqual([]);
  });

  it("parses MM/DD/YYYY dates", () => {
    const out = parseQuery("05/17/1980");
    expect(out.dates).toHaveLength(1);
    const d = out.dates[0]!;
    expect(d.getUTCFullYear()).toBe(1980);
    expect(d.getUTCMonth()).toBe(4); // May = 4
    expect(d.getUTCDate()).toBe(17);
  });

  it("parses M/D/YY dates with 2-digit year expansion", () => {
    const out = parseQuery("5/17/80");
    expect(out.dates).toHaveLength(1);
    // 2-digit years: <=current-year-rollover → 1900s; standard is 80 → 1980.
    expect(out.dates[0]!.getUTCFullYear()).toBe(1980);
  });

  it("parses ISO YYYY-MM-DD dates", () => {
    const out = parseQuery("1980-05-17");
    expect(out.dates).toHaveLength(1);
    const d = out.dates[0]!;
    expect(d.getUTCFullYear()).toBe(1980);
    expect(d.getUTCMonth()).toBe(4);
    expect(d.getUTCDate()).toBe(17);
  });

  it("normalizes phone numbers with separators", () => {
    expect(parseQuery("(555) 123-4567").phones).toContain("5551234567");
    expect(parseQuery("555-123-4567").phones).toContain("5551234567");
    expect(parseQuery("5551234567").phones).toContain("5551234567");
  });

  it("ignores short digit sequences as phone numbers", () => {
    // A 4-digit token alone shouldn't be treated as a phone — it's far
    // more likely a year fragment or partial. Phone detection requires
    // at least 7 digits after normalization.
    const out = parseQuery("1234");
    expect(out.phones).toEqual([]);
  });

  it("combines name and date in 'Reyes 1990'", () => {
    const out = parseQuery("Reyes 1990");
    expect(out.tokens).toContain("Reyes");
    // 1990 is a bare year — treated as a date hint (year-only) rather
    // than a name. We surface it as a date.
    expect(out.dates.length).toBeGreaterThan(0);
  });
});

describe("buildPatientWhereClause", () => {
  it("returns an impossible match for empty input", () => {
    const where = buildPatientWhereClause("");
    // Sentinel: an explicit `id: { in: [] }` clause that always returns
    // zero rows — safer than returning `{}` and accidentally listing
    // every patient in the database.
    expect(where).toMatchObject({ id: { in: [] } });
  });

  it("single partial name produces an OR over first/last name", () => {
    const where = buildPatientWhereClause("rey");
    // Top-level wraps in AND of one group; inside that group the
    // partial-name token expands to OR(firstName ILIKE, lastName ILIKE).
    expect(where.AND).toBeDefined();
    const groups = where.AND as Array<{ OR?: unknown[] }>;
    expect(groups).toHaveLength(1);
    const or = groups[0]!.OR as Array<Record<string, unknown>>;
    expect(or).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          firstName: { contains: "rey", mode: "insensitive" },
        }),
        expect.objectContaining({
          lastName: { contains: "rey", mode: "insensitive" },
        }),
      ]),
    );
  });

  it("combined 'Reyes 1990' produces an AND of two OR groups", () => {
    const where = buildPatientWhereClause("Reyes 1990");
    expect(where.AND).toBeDefined();
    const groups = where.AND as Array<{ OR?: unknown[] }>;
    // One group for "Reyes", one for "1990" — both must match.
    expect(groups.length).toBeGreaterThanOrEqual(2);
    // The name group should reference firstName/lastName.
    const nameGroup = groups.find((g) =>
      JSON.stringify(g).includes("firstName"),
    );
    expect(nameGroup).toBeDefined();
    // The date group should reference dateOfBirth.
    const dobGroup = groups.find((g) =>
      JSON.stringify(g).includes("dateOfBirth"),
    );
    expect(dobGroup).toBeDefined();
  });

  it("phone query produces a dateOfBirth-free OR with phone digits", () => {
    const where = buildPatientWhereClause("(555) 123-4567");
    const groups = where.AND as Array<{ OR?: unknown[] }>;
    // The phone digits should appear inside one of the OR branches.
    const phoneGroup = groups.find((g) =>
      JSON.stringify(g).includes("5551234567"),
    );
    expect(phoneGroup).toBeDefined();
  });

  it("date-only query produces a dateOfBirth equality clause", () => {
    const where = buildPatientWhereClause("1980-05-17");
    const groups = where.AND as Array<{ OR?: unknown[] }>;
    const dobGroup = groups.find((g) =>
      JSON.stringify(g).includes("dateOfBirth"),
    );
    expect(dobGroup).toBeDefined();
  });
});

describe("searchPatients", () => {
  function fakePrisma(rows: Array<Record<string, unknown>>): PatientSearchPrisma {
    return {
      patient: {
        findMany: vi.fn().mockResolvedValue(rows),
      },
    } as unknown as PatientSearchPrisma;
  }

  it("returns no rows for an empty query and does not call findMany", async () => {
    const findMany = vi.fn();
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    const out = await searchPatients(db, { query: "" });
    expect(out).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("forwards the limit and where clause to prisma", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    await searchPatients(db, { query: "rey", limit: 5 });
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0]![0] as { take?: number };
    expect(args.take).toBe(5);
  });

  it("clamps the limit to a sane ceiling", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    await searchPatients(db, { query: "rey", limit: 9999 });
    const args = findMany.mock.calls[0]![0] as { take?: number };
    expect(args.take).toBeLessThanOrEqual(100);
  });

  it("scopes to organizationId when scope is provided", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    await searchPatients(db, {
      query: "rey",
      scope: { organizationId: "org-123" },
    });
    const args = findMany.mock.calls[0]![0] as {
      where?: { AND?: unknown[]; organizationId?: string };
    };
    expect(args.where?.organizationId).toBe("org-123");
  });

  it("excludes soft-deleted patients by default", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    await searchPatients(db, { query: "rey" });
    const args = findMany.mock.calls[0]![0] as {
      where?: { deletedAt?: unknown };
    };
    expect(args.where?.deletedAt).toEqual(null);
  });

  it("hydrates a small subset of patient fields", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "p1",
        firstName: "Reyes",
        lastName: "Mendoza",
        dateOfBirth: new Date("1990-01-15"),
        phone: "5551234567",
        email: null,
      },
    ]);
    const db: PatientSearchPrisma = {
      patient: { findMany },
    } as unknown as PatientSearchPrisma;
    const out = await fakePrismaSearch(db);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ firstName: "Reyes" });
  });

  async function fakePrismaSearch(db: PatientSearchPrisma) {
    return searchPatients(db, { query: "Reyes" });
  }
});

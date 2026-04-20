import { describe, expect, it } from "vitest";
import {
  AUDIT_PAGE_SIZE,
  buildPrismaWhere,
  parseAuditFilters,
  serializeAuditFilters,
} from "./audit-trail-filters";

describe("parseAuditFilters", () => {
  it("returns all-null defaults for empty searchParams", () => {
    const out = parseAuditFilters({});
    expect(out).toEqual({
      actor: null,
      action: null,
      entity: null,
      from: null,
      to: null,
      q: null,
      cursor: null,
      take: AUDIT_PAGE_SIZE,
    });
  });

  it("parses every filter field together and clamps take to the page size", () => {
    const out = parseAuditFilters({
      actor: "user_123",
      action: "READ",
      entity: "Patient",
      from: "2026-04-01",
      to: "2026-04-20",
      q: "dr. patel",
      cursor: "log_abc",
      take: "999",
    });
    expect(out.actor).toBe("user_123");
    expect(out.action).toBe("READ");
    expect(out.entity).toBe("Patient");
    expect(out.from?.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(out.to?.toISOString().slice(0, 10)).toBe("2026-04-20");
    expect(out.q).toBe("dr. patel");
    expect(out.cursor).toBe("log_abc");
    expect(out.take).toBe(AUDIT_PAGE_SIZE); // clamped from 999
  });

  it("normalizes action casing and rejects unknown verbs", () => {
    expect(parseAuditFilters({ action: "read" }).action).toBe("READ");
    expect(parseAuditFilters({ action: "Update" }).action).toBe("UPDATE");
    // invalid verb → null, not a throw
    expect(parseAuditFilters({ action: "WHATEVER" }).action).toBeNull();
    expect(parseAuditFilters({ action: "   " }).action).toBeNull();
  });

  it("rejects invalid ISO dates and whitespace-only strings", () => {
    // bad date → zod refine fails → throws
    expect(() =>
      parseAuditFilters({ from: "not-a-date" }),
    ).toThrow();
    // whitespace-only is treated as absent
    expect(parseAuditFilters({ q: "   " }).q).toBeNull();
    expect(parseAuditFilters({ actor: "" }).actor).toBeNull();
  });

  it("clamps take to positive integers only, defaulting when invalid", () => {
    expect(parseAuditFilters({ take: "10" }).take).toBe(10);
    expect(parseAuditFilters({ take: "0" }).take).toBe(AUDIT_PAGE_SIZE);
    expect(parseAuditFilters({ take: "-5" }).take).toBe(AUDIT_PAGE_SIZE);
    expect(parseAuditFilters({ take: "notanumber" }).take).toBe(
      AUDIT_PAGE_SIZE,
    );
  });

  it("flattens array searchParams by taking the first value", () => {
    const out = parseAuditFilters({
      action: ["UPDATE", "DELETE"],
      q: ["alpha", "beta"],
    });
    expect(out.action).toBe("UPDATE");
    expect(out.q).toBe("alpha");
  });
});

describe("buildPrismaWhere", () => {
  const ORG = "org_leaf";

  it("always pins organizationId — even when every filter is null", () => {
    const where = buildPrismaWhere(
      {
        actor: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.organizationId).toBe(ORG);
    // No AND clauses when nothing is filtered.
    expect(where.AND).toBeUndefined();
  });

  it("maps actor → actorUserId equality", () => {
    const where = buildPrismaWhere(
      {
        actor: "user_42",
        action: null,
        entity: null,
        from: null,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.organizationId).toBe(ORG);
    expect(where.AND).toEqual([{ actorUserId: "user_42" }]);
  });

  it("expands an action verb into a substring OR across the free-form column", () => {
    const where = buildPrismaWhere(
      {
        actor: null,
        action: "READ",
        entity: null,
        from: null,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    const clause = (where.AND as Array<Record<string, unknown>>)[0];
    expect(clause).toHaveProperty("OR");
    const or = (clause as { OR: Array<{ action: { contains: string } }> }).OR;
    const substrings = or.map((c) => c.action.contains);
    expect(substrings).toEqual(["read", "view", "list"]);
  });

  it("passes entity through as a case-insensitive subjectType equals", () => {
    const where = buildPrismaWhere(
      {
        actor: null,
        action: null,
        entity: "Patient",
        from: null,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.AND).toEqual([
      { subjectType: { equals: "Patient", mode: "insensitive" } },
    ]);
  });

  it("builds a bounded createdAt range when both from and to are set", () => {
    const from = new Date("2026-04-01T00:00:00.000Z");
    const to = new Date("2026-04-20T23:59:59.000Z");
    const where = buildPrismaWhere(
      {
        actor: null,
        action: null,
        entity: null,
        from,
        to,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.AND).toEqual([{ createdAt: { gte: from, lte: to } }]);
  });

  it("builds an open-ended range when only one endpoint is provided", () => {
    const from = new Date("2026-04-01T00:00:00.000Z");
    const where = buildPrismaWhere(
      {
        actor: null,
        action: null,
        entity: null,
        from,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.AND).toEqual([{ createdAt: { gte: from } }]);
  });

  it("applies freetext q as an OR across action, subjectType, subjectId, actorAgent", () => {
    const where = buildPrismaWhere(
      {
        actor: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        q: "scribe",
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    const clause = (where.AND as Array<Record<string, unknown>>)[0];
    const or = (
      clause as {
        OR: Array<Record<string, { contains: string; mode: string }>>;
      }
    ).OR;
    expect(or.map((c) => Object.keys(c)[0])).toEqual([
      "action",
      "subjectType",
      "subjectId",
      "actorAgent",
    ]);
    for (const c of or) {
      const key = Object.keys(c)[0];
      expect(c[key]).toEqual({ contains: "scribe", mode: "insensitive" });
    }
  });

  it("composes every filter into a single AND without dropping any", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-12-31T00:00:00.000Z");
    const where = buildPrismaWhere(
      {
        actor: "user_1",
        action: "DELETE",
        entity: "Note",
        from,
        to,
        q: "revoke",
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      ORG,
    );
    expect(where.organizationId).toBe(ORG);
    const and = where.AND as Array<Record<string, unknown>>;
    expect(and).toHaveLength(5);
    expect(and[0]).toEqual({ actorUserId: "user_1" });
    expect(and[2]).toEqual({
      subjectType: { equals: "Note", mode: "insensitive" },
    });
    expect(and[3]).toEqual({ createdAt: { gte: from, lte: to } });
  });

  it("cannot be coerced to another org no matter what the parsed filters say", () => {
    // This guards against a future regression where someone adds an `orgId`
    // override to the filters type. The function signature takes org as a
    // separate argument, and the returned where object must use THAT value.
    const where = buildPrismaWhere(
      {
        actor: "user_1",
        action: "READ",
        entity: null,
        from: null,
        to: null,
        q: null,
        cursor: null,
        take: AUDIT_PAGE_SIZE,
      },
      "org_real",
    );
    expect(where.organizationId).toBe("org_real");
  });
});

describe("serializeAuditFilters", () => {
  it("returns the empty string when the patch is empty", () => {
    expect(serializeAuditFilters({})).toBe("");
    expect(
      serializeAuditFilters({
        actor: null,
        action: null,
        entity: null,
        from: null,
        to: null,
        q: null,
        cursor: null,
      }),
    ).toBe("");
  });

  it("serializes every set field in a stable order", () => {
    const qs = serializeAuditFilters({
      actor: "u1",
      action: "READ",
      entity: "Patient",
      from: new Date("2026-04-01T00:00:00.000Z"),
      to: new Date("2026-04-20T00:00:00.000Z"),
      q: "scribe",
      cursor: "log_9",
    });
    expect(qs.startsWith("?")).toBe(true);
    const parsed = new URLSearchParams(qs.slice(1));
    expect(parsed.get("actor")).toBe("u1");
    expect(parsed.get("action")).toBe("READ");
    expect(parsed.get("entity")).toBe("Patient");
    expect(parsed.get("from")).toBe("2026-04-01");
    expect(parsed.get("to")).toBe("2026-04-20");
    expect(parsed.get("q")).toBe("scribe");
    expect(parsed.get("cursor")).toBe("log_9");
  });
});

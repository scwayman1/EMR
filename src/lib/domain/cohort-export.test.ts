import { describe, expect, it } from "vitest";
import {
  bucketAge,
  deidentifyPatient,
  exportCohort,
  pseudonymize,
  type CohortDataSource,
  type CohortPatientInput,
} from "./cohort-export";
import { toCohortCsv } from "./cohort-csv";

// ──────────────────────────────────────────────────────────────────────
// Shared fixture — contains REAL names / emails / phones / addresses.
// The PII-leak regression test below scans the final CSV output to
// guarantee none of these strings ever reach the export.
// ──────────────────────────────────────────────────────────────────────

const ORG_A = "org_alpha";
const ORG_B = "org_bravo";
const SALT = "cohort-export-test-salt-v1";

// Realistic-looking PII. If ANY of these strings ever appear in the
// export, the regression test fails.
const PII_STRINGS = [
  "Alice",
  "Anderson",
  "Bob",
  "Brown",
  "Carol",
  "Chavez",
  "alice.anderson@example.com",
  "bob.brown@example.test",
  "carol.chavez@example.org",
  "+1-555-111-2222",
  "555-333-4444",
  "555.555.7777",
  "123 Maple Street",
  "456 Oak Avenue",
  "Apt 4B",
  "Unit 7",
  "Springfield",
  "Shelbyville",
  "94110",
  "02139",
];

function seededPatients(): CohortPatientInput[] {
  // Stable DOBs — chosen so the 5-year bucket is predictable.
  return [
    {
      id: "pat_001",
      organizationId: ORG_A,
      firstName: "Alice",
      lastName: "Anderson",
      email: "alice.anderson@example.com",
      phone: "+1-555-111-2222",
      addressLine1: "123 Maple Street",
      addressLine2: "Apt 4B",
      city: "Springfield",
      postalCode: "94110",
      state: "CA",
      dateOfBirth: new Date("1990-01-15"), // ~35 in 2026
      gender: "female",
      primaryCondition: "Chronic pain",
      icd10Code: "G89.4",
      treatmentSummary: "THC 10mg/day + CBD 20mg/day sublingual",
      cannabinoids: ["THC", "CBD"],
      outcomes: [
        { metric: "pain", value: 7, loggedAt: new Date("2026-01-10") },
        { metric: "pain", value: 5, loggedAt: new Date("2026-02-10") },
        { metric: "pain", value: 3, loggedAt: new Date("2026-03-10") },
        { metric: "sleep", value: 4, loggedAt: new Date("2026-01-10") },
        { metric: "sleep", value: 7, loggedAt: new Date("2026-03-10") },
      ],
    },
    {
      id: "pat_002",
      organizationId: ORG_A,
      firstName: "Bob",
      lastName: "Brown",
      email: "bob.brown@example.test",
      phone: "555-333-4444",
      addressLine1: "456 Oak Avenue",
      addressLine2: "Unit 7",
      city: "Shelbyville",
      postalCode: "02139",
      state: "MA",
      dateOfBirth: new Date("1962-07-20"), // ~63 in 2026
      gender: "male",
      primaryCondition: "Insomnia",
      icd10Code: "G47.00",
      treatmentSummary: "CBN 5mg nightly",
      cannabinoids: ["CBN"],
      outcomes: [
        { metric: "sleep", value: 3, loggedAt: new Date("2026-02-01") },
        { metric: "sleep", value: 8, loggedAt: new Date("2026-03-01") },
      ],
    },
    {
      id: "pat_003",
      organizationId: ORG_A,
      firstName: "Carol",
      lastName: "Chavez",
      email: "carol.chavez@example.org",
      phone: "555.555.7777",
      addressLine1: null,
      city: null,
      postalCode: null,
      state: null,
      dateOfBirth: null, // unknown — should produce null ageBucket
      gender: null,
      primaryCondition: "Anxiety disorder",
      icd10Code: "F41.1",
      treatmentSummary: "CBD 50mg BID",
      cannabinoids: ["CBD"],
      outcomes: [
        { metric: "anxiety", value: 8, loggedAt: new Date("2026-01-01") },
        { metric: "anxiety", value: 4, loggedAt: new Date("2026-03-15") },
        { metric: "mood", value: 6, loggedAt: new Date("2026-02-20") },
      ],
    },
    // Different org — MUST be filtered out by exportCohort's org scope.
    {
      id: "pat_101",
      organizationId: ORG_B,
      firstName: "ShouldNot",
      lastName: "Appear",
      email: "leak@other.org",
      phone: "555-000-0000",
      dateOfBirth: new Date("1985-05-05"),
      gender: "nonbinary",
      primaryCondition: "Chronic pain",
      icd10Code: "G89.4",
      treatmentSummary: "DoNotExport",
      cannabinoids: ["THC"],
      outcomes: [{ metric: "pain", value: 1, loggedAt: new Date("2026-03-01") }],
    },
  ];
}

function makeSource(data: CohortPatientInput[]): CohortDataSource {
  // Mimic what the Prisma-backed adapter will do: org scope at query time.
  return async (organizationId: string) => data.filter((p) => p.organizationId === organizationId);
}

// Adapter that INTENTIONALLY leaks rows from a different org — tests
// that exportCohort's defence-in-depth drop-filter catches adapter bugs.
function makeLeakySource(data: CohortPatientInput[]): CohortDataSource {
  return async () => data;
}

// ──────────────────────────────────────────────────────────────────────
// pseudonymize
// ──────────────────────────────────────────────────────────────────────

describe("pseudonymize", () => {
  it("is deterministic for the same id + salt", () => {
    expect(pseudonymize("pat_001", "s")).toBe(pseudonymize("pat_001", "s"));
  });

  it("changes when the salt changes", () => {
    expect(pseudonymize("pat_001", "salt-a")).not.toBe(
      pseudonymize("pat_001", "salt-b"),
    );
  });

  it("changes when the id changes", () => {
    expect(pseudonymize("pat_001", "s")).not.toBe(pseudonymize("pat_002", "s"));
  });

  it("returns a 16-char hex string", () => {
    const p = pseudonymize("pat_001", SALT);
    expect(p).toMatch(/^[0-9a-f]{16}$/);
  });

  it("throws when id or salt is empty", () => {
    expect(() => pseudonymize("", "s")).toThrow();
    expect(() => pseudonymize("pat_001", "")).toThrow();
  });

  it("never contains the raw patient id", () => {
    const out = pseudonymize("pat_001", SALT);
    expect(out).not.toContain("pat_001");
    expect(out).not.toContain("pat");
  });
});

// ──────────────────────────────────────────────────────────────────────
// bucketAge
// ──────────────────────────────────────────────────────────────────────

describe("bucketAge", () => {
  const asOf = new Date("2026-04-20");

  it("returns null for missing DOB", () => {
    expect(bucketAge(null, asOf)).toBeNull();
    expect(bucketAge(undefined, asOf)).toBeNull();
  });

  it("returns null for DOB in the future", () => {
    expect(bucketAge(new Date("2027-01-01"), asOf)).toBeNull();
  });

  it("buckets into 5-year bands", () => {
    expect(bucketAge(new Date("1990-01-15"), asOf)).toBe("35-39"); // age 36
    expect(bucketAge(new Date("1996-01-01"), asOf)).toBe("30-34"); // age 30
    expect(bucketAge(new Date("2000-04-19"), asOf)).toBe("25-29"); // age 26
  });

  it("collapses ages 90+ into a single Safe Harbor bucket", () => {
    expect(bucketAge(new Date("1930-01-01"), asOf)).toBe("90+");
    expect(bucketAge(new Date("1900-01-01"), asOf)).toBe("90+");
  });

  it("handles exactly-90 as the top bucket", () => {
    expect(bucketAge(new Date("1936-01-01"), asOf)).toBe("90+");
  });

  it("handles young ages (<5) explicitly", () => {
    expect(bucketAge(new Date("2024-01-01"), asOf)).toBe("0-4");
  });
});

// ──────────────────────────────────────────────────────────────────────
// deidentifyPatient — PII-strip contract
// ──────────────────────────────────────────────────────────────────────

describe("deidentifyPatient", () => {
  it("strips name, email, phone, address, city, postalCode, raw DOB, raw id", () => {
    const p = seededPatients()[0];
    const result = deidentifyPatient(p, SALT);

    // Whitelist: result has exactly these keys + no PII keys
    expect(Object.keys(result).sort()).toEqual(
      [
        "ageBucket",
        "cannabinoids",
        "condition",
        "gender",
        "icd10Code",
        "pseudonymId",
        "state",
        "treatmentSummary",
      ].sort(),
    );

    const serialised = JSON.stringify(result);
    for (const needle of PII_STRINGS) {
      expect(serialised).not.toContain(needle);
    }
    expect(serialised).not.toContain("pat_001"); // raw id never surfaces
    expect(serialised).not.toContain("1990-01-15"); // raw DOB never surfaces
  });

  it("keeps state (Safe Harbor-allowable generalised geography)", () => {
    const p = seededPatients()[0];
    expect(deidentifyPatient(p, SALT).state).toBe("CA");
  });

  it("normalises empty strings to null", () => {
    const p: CohortPatientInput = {
      id: "pat_x",
      organizationId: ORG_A,
      gender: "   ",
      primaryCondition: "",
      icd10Code: undefined,
    };
    const r = deidentifyPatient(p, SALT);
    expect(r.gender).toBeNull();
    expect(r.condition).toBeNull();
    expect(r.icd10Code).toBeNull();
  });

  it("dedupes and sorts cannabinoids", () => {
    const p: CohortPatientInput = {
      id: "pat_y",
      organizationId: ORG_A,
      cannabinoids: ["THC", "CBD", "THC", "cbg", "CBG"],
    };
    const r = deidentifyPatient(p, SALT);
    // Dedupe is case-sensitive (adapters should upstream-normalise case);
    // sort uses locale order (case-insensitive), so CBG and cbg are adjacent.
    expect(r.cannabinoids).toEqual(["CBD", "cbg", "CBG", "THC"]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// exportCohort — orchestration
// ──────────────────────────────────────────────────────────────────────

describe("exportCohort", () => {
  it("scopes to the requested org and drops rows from other orgs", async () => {
    const rows = await exportCohort(
      ORG_A,
      {},
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.pseudonymId.length === 16)).toBe(true);
  });

  it("drops cross-org rows even if the adapter leaks them (defence-in-depth)", async () => {
    const rows = await exportCohort(
      ORG_A,
      {},
      { dataSource: makeLeakySource(seededPatients()), salt: SALT },
    );
    // Leaky source returns all 4 records; exportCohort must keep only the 3 in ORG_A.
    expect(rows).toHaveLength(3);
    const csv = toCohortCsv(rows);
    expect(csv).not.toContain("ShouldNot");
    expect(csv).not.toContain("leak@other.org");
    expect(csv).not.toContain("DoNotExport");
  });

  it("filters by condition (case-insensitive substring)", async () => {
    const rows = await exportCohort(
      ORG_A,
      { condition: "chronic pain" },
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].condition).toBe("Chronic pain");
  });

  it("filters by ICD-10 code via the condition field", async () => {
    const rows = await exportCohort(
      ORG_A,
      { condition: "F41" },
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].icd10Code).toBe("F41.1");
  });

  it("filters by cannabinoid (overlap semantics)", async () => {
    const rows = await exportCohort(
      ORG_A,
      { cannabinoids: ["CBD"] },
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    // Alice (THC + CBD) and Carol (CBD) match; Bob (CBN) does not.
    expect(rows).toHaveLength(2);
    const seen = rows.flatMap((r) => r.cannabinoids);
    expect(seen).toContain("CBD");
  });

  it("aggregates outcomes within the date range only", async () => {
    const rows = await exportCohort(
      ORG_A,
      {
        dateRange: {
          start: new Date("2026-02-01"),
          end: new Date("2026-12-31"),
        },
      },
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    const alice = rows.find((r) => r.condition === "Chronic pain")!;
    const painAgg = alice.outcomes.find((o) => o.metric === "pain")!;
    // Alice's Jan pain (value 7) is out of range; Feb 5 + Mar 3 remain.
    expect(painAgg.count).toBe(2);
    expect(painAgg.mean).toBeCloseTo(4, 5);
    expect(painAgg.min).toBe(3);
    expect(painAgg.max).toBe(5);
  });

  it("emits patients with zero outcomes in range as empty aggregates", async () => {
    const rows = await exportCohort(
      ORG_A,
      {
        dateRange: {
          start: new Date("2027-01-01"), // far-future window: no events
          end: new Date("2027-12-31"),
        },
      },
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.outcomes).toEqual([]);
      expect(r.outcomeEventCount).toBe(0);
    }
  });

  it("produces deterministic row ordering by pseudonymId", async () => {
    const a = await exportCohort(
      ORG_A,
      {},
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    const b = await exportCohort(
      ORG_A,
      {},
      { dataSource: makeSource([...seededPatients()].reverse()), salt: SALT },
    );
    expect(a.map((r) => r.pseudonymId)).toEqual(b.map((r) => r.pseudonymId));
  });

  it("throws on missing orgId / salt / dataSource", async () => {
    const src = makeSource(seededPatients());
    await expect(exportCohort("", {}, { dataSource: src, salt: SALT })).rejects.toThrow();
    await expect(exportCohort(ORG_A, {}, { dataSource: src, salt: "" })).rejects.toThrow();
    await expect(
      exportCohort(ORG_A, {}, { dataSource: undefined as any, salt: SALT }),
    ).rejects.toThrow();
  });

  // ────────────────────────────────────────────────────────────────
  // THE NON-NEGOTIABLE PII-LEAK REGRESSION TEST.
  // If this ever fails, the research export is unsafe to ship.
  // ────────────────────────────────────────────────────────────────
  it("contains ZERO real names/emails/phones/addresses/postal codes/ids from the seeded fixture", async () => {
    const rows = await exportCohort(
      ORG_A,
      {}, // widest possible filter — worst case for leaks
      { dataSource: makeSource(seededPatients()), salt: SALT },
    );
    const csv = toCohortCsv(rows);
    const rowsJson = JSON.stringify(rows);

    for (const needle of PII_STRINGS) {
      expect(
        csv,
        `CSV output leaked PII string: ${JSON.stringify(needle)}`,
      ).not.toContain(needle);
      expect(
        rowsJson,
        `CohortRow leaked PII string: ${JSON.stringify(needle)}`,
      ).not.toContain(needle);
    }
    // Raw patient ids must never appear either.
    for (const id of ["pat_001", "pat_002", "pat_003", "pat_101"]) {
      expect(csv).not.toContain(id);
      expect(rowsJson).not.toContain(id);
    }
    // Raw DOB strings (YYYY-MM-DD format in the fixture) must not surface.
    for (const dob of ["1990-01-15", "1962-07-20"]) {
      expect(csv).not.toContain(dob);
      expect(rowsJson).not.toContain(dob);
    }
  });
});

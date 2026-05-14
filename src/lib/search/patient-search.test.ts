import { describe, it, expect } from "vitest";
import { patientMatchesQuery, type SearchablePatient } from "./patient-search";

const ALICE: SearchablePatient = {
  firstName: "Alice",
  lastName: "Anderson",
  dob: "1980-05-17",
  phone: "(555) 123-4567",
};

const BOB: SearchablePatient = {
  firstName: "Bob",
  lastName: "Bouchard",
  dob: "1975-11-03T00:00:00.000Z",
  phone: null,
};

const CARMEN: SearchablePatient = {
  firstName: "Carmen",
  lastName: "Costa",
  dob: null,
  phone: "555.987.6543",
};

describe("patientMatchesQuery", () => {
  it("empty query matches everyone", () => {
    expect(patientMatchesQuery(ALICE, "")).toBe(true);
    expect(patientMatchesQuery(ALICE, "   ")).toBe(true);
  });

  it("partial first-name match (case-insensitive)", () => {
    expect(patientMatchesQuery(ALICE, "ali")).toBe(true);
    expect(patientMatchesQuery(ALICE, "ALICE")).toBe(true);
  });

  it("partial last-name match", () => {
    expect(patientMatchesQuery(ALICE, "ander")).toBe(true);
  });

  it("matches across first + last", () => {
    expect(patientMatchesQuery(ALICE, "ce ande")).toBe(true);
  });

  it("phone match ignores separators in stored value and query", () => {
    expect(patientMatchesQuery(ALICE, "555-123")).toBe(true);
    expect(patientMatchesQuery(ALICE, "(555) 123")).toBe(true);
    expect(patientMatchesQuery(ALICE, "1234567")).toBe(true);
    expect(patientMatchesQuery(CARMEN, "9876543")).toBe(true);
  });

  it("phone match requires at least 2 digits to avoid spurious matches", () => {
    // CARMEN has no DOB; firstName/lastName have no digits, so a single
    // digit query must not match via the phone path on its own.
    expect(patientMatchesQuery(CARMEN, "5")).toBe(false);
  });

  it("DOB matches across formats", () => {
    expect(patientMatchesQuery(ALICE, "5/17/1980")).toBe(true);
    expect(patientMatchesQuery(ALICE, "05-17-1980")).toBe(true);
    expect(patientMatchesQuery(ALICE, "1980-05-17")).toBe(true);
    expect(patientMatchesQuery(ALICE, "05.17.1980")).toBe(true);
  });

  it("DOB partial match (year only, month/day fragment)", () => {
    expect(patientMatchesQuery(ALICE, "1980")).toBe(true);
    expect(patientMatchesQuery(ALICE, "5/17")).toBe(true);
  });

  it("handles full ISO timestamps as DOB", () => {
    expect(patientMatchesQuery(BOB, "11/3/1975")).toBe(true);
    expect(patientMatchesQuery(BOB, "1975-11-03")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(patientMatchesQuery(ALICE, "zzz")).toBe(false);
    expect(patientMatchesQuery(BOB, "9999")).toBe(false);
  });

  it("null phone and null DOB don't crash", () => {
    expect(patientMatchesQuery(BOB, "555")).toBe(false);
    expect(patientMatchesQuery(CARMEN, "1980")).toBe(false);
  });
});

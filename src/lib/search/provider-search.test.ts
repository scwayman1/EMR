import { describe, it, expect } from "vitest";
import {
  providerMatchesQuery,
  type SearchableProvider,
} from "./provider-search";

const ALICE: SearchableProvider = {
  firstName: "Alice",
  lastName: "Anderson",
  title: "MD, Integrative Oncology",
  specialties: ["Oncology", "Palliative care"],
  practiceAddress: "100 Healing Way, Asheville, NC 28801",
  hospitalAffiliations: ["Mission Hospital", "UNC Health"],
};

const BOB: SearchableProvider = {
  firstName: "Bob",
  lastName: "Bouchard",
  title: null,
  specialties: [],
  practiceAddress: null,
  hospitalAffiliations: [],
};

describe("providerMatchesQuery", () => {
  it("empty query matches everyone", () => {
    expect(providerMatchesQuery(ALICE, "")).toBe(true);
    expect(providerMatchesQuery(BOB, "  ")).toBe(true);
  });

  it("partial first / last name match", () => {
    expect(providerMatchesQuery(ALICE, "ali")).toBe(true);
    expect(providerMatchesQuery(ALICE, "DERSO")).toBe(true);
  });

  it("matches across first + last", () => {
    expect(providerMatchesQuery(ALICE, "ce ande")).toBe(true);
  });

  it("matches title (case-insensitive, partial)", () => {
    expect(providerMatchesQuery(ALICE, "integrative")).toBe(true);
    expect(providerMatchesQuery(ALICE, "MD")).toBe(true);
  });

  it("matches specialty entries", () => {
    expect(providerMatchesQuery(ALICE, "oncolog")).toBe(true);
    expect(providerMatchesQuery(ALICE, "palliative")).toBe(true);
  });

  it("matches practice address partial", () => {
    expect(providerMatchesQuery(ALICE, "asheville")).toBe(true);
    expect(providerMatchesQuery(ALICE, "28801")).toBe(true);
    expect(providerMatchesQuery(ALICE, "healing way")).toBe(true);
  });

  it("matches hospital affiliation entries", () => {
    expect(providerMatchesQuery(ALICE, "mission")).toBe(true);
    expect(providerMatchesQuery(ALICE, "unc")).toBe(true);
  });

  it("null fields don't crash", () => {
    expect(providerMatchesQuery(BOB, "anything")).toBe(false);
    expect(providerMatchesQuery(BOB, "bob")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(providerMatchesQuery(ALICE, "zzzzz")).toBe(false);
  });
});

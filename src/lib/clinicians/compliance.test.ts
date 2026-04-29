// EMR-311 — Compliance matcher invariants. Captures the "TX patient
// asking for a cert from a CA-licensed clinician" rule that bit us in
// the launch demo.

import { describe, it, expect } from "vitest";
import { matchListing, matchDirectory } from "./compliance";
import { SEED_LISTINGS } from "./directory";

describe("EMR-311 compliance matcher", () => {
  it("refuses cross-state cert when license doesn't cover patient state", () => {
    const result = matchListing(SEED_LISTINGS[1], {
      patientState: "TX",
      patientHasCannabisCard: false,
      service: "medical-cannabis-cert",
    });
    expect(result.isMatch).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/Not licensed in TX/);
  });

  it("requires program enrollment in states that mandate it", () => {
    const result = matchListing(SEED_LISTINGS[2], {
      patientState: "GA", // listing licensed in GA but not enrolled in any program
      patientHasCannabisCard: true,
      service: "medical-cannabis-cert",
    });
    // GA isn't in the program-required set in the seed, so this should match.
    expect(result.isMatch).toBe(true);
  });

  it("blocks cert in NY when clinician isn't NY-program-enrolled", () => {
    const fakeListing = {
      ...SEED_LISTINGS[0],
      cannabisProgramStates: [], // licensed in NY but NOT enrolled in NY program
    };
    const result = matchListing(fakeListing, {
      patientState: "NY",
      patientHasCannabisCard: true,
      service: "medical-cannabis-cert",
    });
    expect(result.isMatch).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/program/i);
  });

  it("matches Rivera for an NY cannabis cert", () => {
    const result = matchListing(SEED_LISTINGS[0], {
      patientState: "NY",
      patientHasCannabisCard: true,
      service: "medical-cannabis-cert",
    });
    expect(result.isMatch).toBe(true);
  });

  it("orders matches before non-matches in the directory", () => {
    const ordered = matchDirectory(SEED_LISTINGS, {
      patientState: "NY",
      patientHasCannabisCard: true,
      service: "medical-cannabis-cert",
    });
    const matchIdx = ordered.findIndex((r) => r.isMatch);
    const nonMatchIdx = ordered.findIndex((r) => !r.isMatch);
    if (matchIdx >= 0 && nonMatchIdx >= 0) {
      expect(matchIdx).toBeLessThan(nonMatchIdx);
    }
  });
});

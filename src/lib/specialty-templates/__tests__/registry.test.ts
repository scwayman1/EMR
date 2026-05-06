/**
 * Specialty Template Registry tests — EMR-408
 *
 * Lightweight smoke + the P0 acceptance gate (Pain Management non-cannabis
 * MUST disable cannabis-medicine — explicit, not absence).
 */

import { describe, expect, it } from "vitest";

import {
  applyTemplateDefaults,
  getSpecialtyTemplate,
  listActiveSpecialtyTemplates,
} from "@/lib/specialty-templates/registry";

describe("specialty-template registry", () => {
  it("loads and validates all three v1 manifests (plus the test fixture under NODE_ENV=test)", () => {
    const slugs = listActiveSpecialtyTemplates()
      .map((m) => m.slug)
      .sort();

    // EMR-433: under NODE_ENV=test the registry also picks up
    // `test-fixture-specialty` via file-system discovery. The three v1
    // production specialties must always be present; the fixture rides
    // along under test only.
    expect(slugs).toEqual(
      expect.arrayContaining([
        "cannabis-medicine",
        "internal-medicine",
        "pain-management-non-cannabis",
      ]),
    );
    // Sanity: registry must never load the fixture in non-test mode. That
    // path is exercised explicitly in extensibility.test.ts.
    expect(slugs).toContain("test-fixture-specialty");
  });

  it("getSpecialtyTemplate returns the manifest for a known slug and null otherwise", () => {
    const im = getSpecialtyTemplate("internal-medicine");
    expect(im?.name).toBe("Internal Medicine");
    expect(getSpecialtyTemplate("nope-not-real")).toBeNull();
  });

  it("pain-management-non-cannabis manifest explicitly disables cannabis-medicine (P0 bleed gate)", () => {
    const pm = getSpecialtyTemplate("pain-management-non-cannabis");
    expect(pm).not.toBeNull();
    expect(pm!.default_disabled_modalities).toContain("cannabis-medicine");
    // belt-and-suspenders: also confirm cannabis-medicine is NOT enabled
    expect(pm!.default_enabled_modalities).not.toContain("cannabis-medicine");
  });

  it("applyTemplateDefaults('pain-management-non-cannabis') excludes cannabis-medicine from enabled modalities", () => {
    const seed = applyTemplateDefaults("pain-management-non-cannabis");

    expect(seed.enabledModalities).toBeDefined();
    expect(seed.enabledModalities).not.toContain("cannabis-medicine");
    expect(seed.disabledModalities).toContain("cannabis-medicine");
    expect(seed.careModel).toBe("longitudinal-interventional");
    expect(seed.selectedSpecialty).toBe("pain-management-non-cannabis");
  });

  it("applyTemplateDefaults projects all expected fields for internal-medicine", () => {
    const seed = applyTemplateDefaults("internal-medicine");

    expect(seed.careModel).toBe("longitudinal-primary-care");
    expect(seed.workflowTemplateIds).toEqual([
      "new-patient-intake",
      "annual-wellness",
      "chronic-condition-followup",
      "lab-review",
      "medication-reconciliation",
    ]);
    expect(seed.chartingTemplateIds).toEqual([
      "soap-note",
      "annual-wellness-note",
      "problem-focused-note",
    ]);
    expect(seed.physicianShellTemplateId).toBe("internal-medicine-physician-shell");
    expect(seed.patientShellTemplateId).toBe("internal-medicine-patient-shell");
    // Internal Medicine v1 also disables cannabis-medicine — defensive default
    // for the non-cannabis primary-care path.
    expect(seed.disabledModalities).toContain("cannabis-medicine");
  });

  it("applyTemplateDefaults returns an empty object for an unknown slug", () => {
    expect(applyTemplateDefaults("does-not-exist")).toEqual({});
  });

  it("cannabis-medicine manifest enables cannabis-medicine + leafmart commerce", () => {
    const cb = getSpecialtyTemplate("cannabis-medicine");
    expect(cb).not.toBeNull();
    expect(cb!.default_enabled_modalities).toEqual(
      expect.arrayContaining(["cannabis-medicine", "commerce-leafmart"]),
    );
    // Procedures / imaging / PT are out of scope for the certification flow.
    expect(cb!.default_disabled_modalities).toEqual(
      expect.arrayContaining(["procedures", "imaging", "physical-therapy"]),
    );
  });
});

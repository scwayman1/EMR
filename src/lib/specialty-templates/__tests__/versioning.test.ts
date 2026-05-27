/**
 * Specialty Template Versioning tests — EMR-431
 *
 * Coverage:
 *   - Two versions of the same slug load independently and return distinct
 *     manifest content via exact-version lookup.
 *   - listActiveSpecialtyTemplates excludes deprecated versions and reports
 *     only the LATEST non-deprecated version per slug.
 *   - applyTemplateDefaults throws "DEPRECATED_TEMPLATE" against a slug whose
 *     ONLY available version is deprecated (existing v1 manifests remain
 *     usable; we register fixtures for a deprecated-only test slug).
 *   - getSpecialtyTemplate(slug, "0.9.0") returns null for a non-existent
 *     version even when other versions of the slug exist.
 *
 * Fixtures are registered via the test-only `__registerManifestForTests`
 * helper so we don't have to land throwaway manifest files under the real
 * ./manifests/ directory.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import {
  __registerManifestForTests,
  applyTemplateDefaults,
  getSpecialtyTemplate,
  listActiveSpecialtyTemplates,
  listAllManifestVersions,
} from "@/lib/specialty-templates/registry";

const baseManifest = (
  overrides: Partial<SpecialtyManifest> & { slug: string; version: string },
): SpecialtyManifest => ({
  name: "Versioning Fixture",
  description: "Fixture manifest used by EMR-431 versioning tests.",
  icon: "test-tube",
  default_care_model: "longitudinal-primary-care",
  default_workflows: [],
  default_modules: [],
  default_charting_templates: [],
  default_mission_control_cards: [],
  default_patient_portal_cards: [],
  default_enabled_modalities: [],
  default_disabled_modalities: [],
  migration_mapping_defaults: {},
  ...overrides,
});

const teardowns: Array<() => void> = [];

afterEach(() => {
  // Tear down in reverse registration order so latest-version recomputation
  // runs against a consistent intermediate state.
  while (teardowns.length > 0) {
    const fn = teardowns.pop();
    fn?.();
  }
});

function register(manifest: SpecialtyManifest): void {
  teardowns.push(__registerManifestForTests(manifest));
}

describe("specialty-template versioning (EMR-431)", () => {
  it("loads two versions of the same slug and exposes each independently", () => {
    register(
      baseManifest({
        slug: "fixture-multi-version",
        version: "1.0.0",
        name: "Fixture v1",
        default_workflows: ["v1-workflow"],
      }),
    );
    register(
      baseManifest({
        slug: "fixture-multi-version",
        version: "1.1.0",
        name: "Fixture v1.1",
        default_workflows: ["v1-1-workflow"],
      }),
    );

    const v1 = getSpecialtyTemplate("fixture-multi-version", "1.0.0");
    const v11 = getSpecialtyTemplate("fixture-multi-version", "1.1.0");

    expect(v1).not.toBeNull();
    expect(v11).not.toBeNull();
    expect(v1!.version).toBe("1.0.0");
    expect(v11!.version).toBe("1.1.0");
    expect(v1!.default_workflows).toEqual(["v1-workflow"]);
    expect(v11!.default_workflows).toEqual(["v1-1-workflow"]);

    // Latest-resolution (no version) returns the highest semver.
    const latest = getSpecialtyTemplate("fixture-multi-version");
    expect(latest?.version).toBe("1.1.0");

    // History is sorted descending.
    const history = listAllManifestVersions("fixture-multi-version");
    expect(history.map((m) => m.version)).toEqual(["1.1.0", "1.0.0"]);
  });

  it("listActiveSpecialtyTemplates excludes deprecated and returns only the latest non-deprecated version per slug", () => {
    register(
      baseManifest({
        slug: "fixture-deprecation-mix",
        version: "1.0.0",
      }),
    );
    register(
      baseManifest({
        slug: "fixture-deprecation-mix",
        version: "2.0.0",
        deprecated: true,
      }),
    );

    const active = listActiveSpecialtyTemplates();
    const fixture = active.filter((m) => m.slug === "fixture-deprecation-mix");

    // 2.0.0 is deprecated → excluded. 1.0.0 is the latest non-deprecated.
    expect(fixture).toHaveLength(1);
    expect(fixture[0].version).toBe("1.0.0");

    // No active entry should ever carry deprecated=true.
    expect(active.every((m) => m.deprecated !== true)).toBe(true);

    // All-deprecated slug: register a slug whose only version is deprecated
    // and confirm it is NOT in the active list.
    register(
      baseManifest({
        slug: "fixture-all-deprecated",
        version: "1.0.0",
        deprecated: true,
      }),
    );
    const active2 = listActiveSpecialtyTemplates();
    expect(active2.find((m) => m.slug === "fixture-all-deprecated")).toBeUndefined();
  });

  it("applyTemplateDefaults throws DEPRECATED_TEMPLATE when the slug has no non-deprecated version", () => {
    register(
      baseManifest({
        slug: "fixture-cannot-onboard",
        version: "1.0.0",
        deprecated: true,
      }),
    );

    expect(() => applyTemplateDefaults("fixture-cannot-onboard")).toThrowError(
      /DEPRECATED_TEMPLATE/,
    );

    // Exact-version lookup still resolves so existing configurations that
    // recorded (slug, version) against this manifest keep rendering.
    const exact = getSpecialtyTemplate("fixture-cannot-onboard", "1.0.0");
    expect(exact).not.toBeNull();
    expect(exact!.deprecated).toBe(true);
  });

  it("getSpecialtyTemplate(slug, '0.9.0') returns null when that version is not registered", () => {
    register(
      baseManifest({
        slug: "fixture-missing-version",
        version: "1.0.0",
      }),
    );

    // Non-existent version of a known slug → null.
    expect(getSpecialtyTemplate("fixture-missing-version", "0.9.0")).toBeNull();

    // Unknown slug entirely → null.
    expect(getSpecialtyTemplate("does-not-exist", "1.0.0")).toBeNull();

    // The registered version is still resolvable — sanity check that the
    // null-on-miss above isn't masking a broken registry.
    expect(getSpecialtyTemplate("fixture-missing-version", "1.0.0")).not.toBeNull();
  });

  it("applyTemplateDefaults projects selectedSpecialtyVersion from the resolved manifest", () => {
    register(
      baseManifest({
        slug: "fixture-version-projection",
        version: "1.2.3",
      }),
    );

    const seed = applyTemplateDefaults("fixture-version-projection");
    expect(seed.selectedSpecialty).toBe("fixture-version-projection");
    expect(seed.selectedSpecialtyVersion).toBe("1.2.3");
  });
});

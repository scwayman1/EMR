/**
 * Future-specialty extensibility tests — EMR-433.
 *
 * These tests verify that:
 *   1. The registry's file-system loader picks up new manifest files
 *      automatically (proven by the test-fixture-specialty appearing under
 *      NODE_ENV=test alongside the three v1 manifests).
 *   2. The same loader hides files matching `/test-fixture-/` when
 *      NODE_ENV !== "test", so the wizard's specialty selector never shows
 *      synthetic fixtures in production.
 *   3. `validateManifest` rejects malformed manifest objects with errors
 *      that name the offending field — the contract the loader relies on
 *      to fail loudly when a contributor drops a broken file.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  REGISTERED_MODALITIES,
  validateManifest,
} from "@/lib/specialty-templates/manifest-schema";
import {
  __reloadForTests,
  getSpecialtyTemplate,
  listActiveSpecialtyTemplates,
} from "@/lib/specialty-templates/registry";

describe("specialty-template extensibility (EMR-433)", () => {
  // Vitest sets NODE_ENV=test by default; capture and restore so we can
  // toggle it for the production-listing assertion.
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // `NODE_ENV` is typed as `'test' | 'development' | 'production'` on the
    // global process.env in some setups; assign through `as` to keep the
    // assignment type-safe regardless of the ambient typing.
    (process.env as Record<string, string | undefined>).NODE_ENV =
      originalNodeEnv;
    __reloadForTests();
  });

  it("listActiveSpecialtyTemplates() returns the three v1 specialties + the test fixture under NODE_ENV=test", () => {
    // Vitest's default — confirm and reload to be deterministic.
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    __reloadForTests();

    const slugs = listActiveSpecialtyTemplates()
      .map((m) => m.slug)
      .sort();

    expect(slugs.length).toBeGreaterThanOrEqual(4);
    expect(slugs).toEqual(
      expect.arrayContaining([
        "cannabis-medicine",
        "internal-medicine",
        "pain-management-non-cannabis",
        "test-fixture-specialty",
      ]),
    );

    const fixture = getSpecialtyTemplate("test-fixture-specialty");
    expect(fixture).not.toBeNull();
    // Cannabis-medicine is OFF on the fixture (mirrors the v1 bleed-gate
    // convention for non-cannabis specialties).
    expect(fixture!.default_disabled_modalities).toContain("cannabis-medicine");
    expect(fixture!.default_enabled_modalities).not.toContain(
      "cannabis-medicine",
    );
  });

  it("listActiveSpecialtyTemplates() excludes the test fixture when NODE_ENV=production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "production";
    __reloadForTests();

    const slugs = listActiveSpecialtyTemplates()
      .map((m) => m.slug)
      .sort();

    expect(slugs).toEqual(
      [
        "cannabis-medicine",
        "internal-medicine",
        "pain-management-non-cannabis",
      ].sort(),
    );
    expect(slugs).toHaveLength(3);
    expect(slugs).not.toContain("test-fixture-specialty");
    expect(getSpecialtyTemplate("test-fixture-specialty")).toBeNull();
  });

  it("validateManifest rejects a syntactically broken manifest with clear field paths", () => {
    // Multiple base-shape failures — each error must name the offending field
    // so a contributor sees what to fix without digging into Zod internals.
    const broken = {
      name: "X", // too short (min 2 — "X" is 1 char)
      slug: "Not_Kebab_Case",
      description: 42, // wrong type
      icon: "",
      version: "not-semver",
      default_care_model: "made-up-model",
      default_enabled_modalities: [],
      default_disabled_modalities: [],
      migration_mapping_defaults: {},
    };

    const result = validateManifest(broken);
    expect(result.ok).toBe(false);
    if (result.ok) return; // narrow for the type checker

    const joined = result.errors.join("\n");
    expect(joined).toMatch(/slug/);
    expect(joined).toMatch(/description/);
    expect(joined).toMatch(/version/);
    expect(joined).toMatch(/default_care_model/);
  });

  it("validateManifest rejects a manifest that references a modality outside REGISTERED_MODALITIES", () => {
    // Base shape is valid — only the modality cross-check should fire. This
    // is the property the manifest CI lint depends on (see
    // scripts/lint-manifests.ts).
    const result = validateManifest({
      name: "Bad Modality",
      slug: "bad-modality",
      description: "Manifest used only inside this test.",
      icon: "icon",
      version: "1.0.0",
      default_care_model: "consultative",
      default_workflows: [],
      default_modules: [],
      default_charting_templates: [],
      default_mission_control_cards: [],
      default_patient_portal_cards: [],
      default_enabled_modalities: ["definitely-not-a-real-modality"],
      default_disabled_modalities: [],
      migration_mapping_defaults: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    const joined = result.errors.join("\n");
    expect(joined).toMatch(/default_enabled_modalities/);
    expect(joined).toMatch(/definitely-not-a-real-modality/);
  });

  it("validateManifest accepts a manifest that uses every REGISTERED_MODALITY once between enabled+disabled", () => {
    // Sanity check that REGISTERED_MODALITIES is the source of truth for the
    // loader's modality cross-check. Splitting the list across enabled vs
    // disabled keeps the schema's "no overlap" rule satisfied.
    const half = Math.ceil(REGISTERED_MODALITIES.length / 2);
    const enabled = REGISTERED_MODALITIES.slice(0, half);
    const disabled = REGISTERED_MODALITIES.slice(half);

    const ok = validateManifest({
      name: "Coverage",
      slug: "coverage",
      description: "Coverage manifest used only inside this test.",
      icon: "icon",
      version: "1.0.0",
      default_care_model: "consultative",
      default_workflows: [],
      default_modules: [],
      default_charting_templates: [],
      default_mission_control_cards: [],
      default_patient_portal_cards: [],
      default_enabled_modalities: enabled,
      default_disabled_modalities: disabled,
      migration_mapping_defaults: {},
    });

    expect(ok.ok).toBe(true);
  });
});

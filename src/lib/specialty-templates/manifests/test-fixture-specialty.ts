/**
 * Test Fixture specialty manifest — EMR-433
 *
 * NOT a real specialty. Used only to exercise the registry's file-system
 * discovery path under NODE_ENV=test. Files matching `/test-fixture-/` are
 * skipped by the loader unless NODE_ENV === 'test', so this manifest never
 * appears in production specialty listings.
 *
 * If a future test needs another fixture, drop another `test-fixture-*.ts`
 * file alongside this one — no code changes required outside this directory.
 *
 * Cannabis-medicine modality is OFF (explicit disable, mirroring the v1
 * non-cannabis bleed-gate convention).
 */

import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

const testFixtureSpecialty: SpecialtyManifest = {
  name: "Test Fixture",
  slug: "test-fixture-specialty",
  description:
    "Synthetic specialty used only by the registry test suite to verify " +
    "file-system discovery. Not exposed in production listings.",
  icon: "flask",
  version: "0.0.1",
  default_care_model: "consultative",
  default_workflows: ["test-fixture-workflow"],
  default_modules: ["scheduling", "charting"],
  default_charting_templates: ["test-fixture-note"],
  default_mission_control_cards: ["todays-schedule"],
  default_patient_portal_cards: ["upcoming-appointments"],
  default_enabled_modalities: ["medications", "patient-reported-outcomes"],
  default_disabled_modalities: ["cannabis-medicine", "commerce-leafmart"],
  migration_mapping_defaults: {},
};

export default testFixtureSpecialty;

/**
 * Specialty Template Registry — EMR-408
 *
 * Single source of truth for the specialty manifests that the Practice
 * Onboarding Controller (EMR-409+) uses to seed a draft PracticeConfiguration.
 *
 * Architecture invariants (HARD constraints — see CLAUDE.md / Epic 2):
 *   - LeafJourney is specialty-adaptive, NOT cannabis-first. The registry
 *     never branches on `slug === 'cannabis-medicine'`. Cannabis behaviour
 *     is a manifest configuration — not a controller code path.
 *   - Adding a new specialty MUST be a manifest file drop under ./manifests/.
 *     This file should not need to change.
 *   - Pain Management (non-cannabis) is the v1 acceptance gate: its manifest
 *     MUST list "cannabis-medicine" in default_disabled_modalities (not just
 *     omit it from enabled). The registry trusts the manifest — it does not
 *     re-derive disabled lists from absence.
 *
 * Boot behaviour:
 *   At module-init time the registry enumerates ./manifests/, validates every
 *   manifest via SpecialtyManifestSchema, and throws a descriptive error if
 *   ANY manifest is invalid. This fail-loud behaviour is intentional — a
 *   silently-skipped bad manifest could cause a practice to onboard with the
 *   wrong modality bleed and is the kind of regression that's only caught in
 *   production.
 */

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// TODO(EMR-429): integrate once the manifest-schema branch lands.
import {
  validateManifest,
  type SpecialtyManifest,
} from "@/lib/specialty-templates/manifest-schema";

// TODO(EMR-409): integrate once the practice-config types branch lands.
// The shape below mirrors the seedable subset of PracticeConfiguration —
// applyTemplateDefaults returns Partial<PracticeConfiguration>, so callers
// from EMR-409 can spread the result onto a draft they're constructing.
type PracticeConfigurationSeed = {
  selectedSpecialty: string;
  careModel: string;
  enabledModalities: string[];
  disabledModalities: string[];
  workflowTemplateIds: string[];
  chartingTemplateIds: string[];
  physicianShellTemplateId: string | null;
  patientShellTemplateId: string | null;
};

// Eager static imports of every v1 manifest. Adding a new specialty = drop a
// file under ./manifests/ AND add one line here. The directory listing below
// is asserted at boot to catch the case where a contributor drops a file but
// forgets the import — fail-loud, not silently skip.
import internalMedicine from "./manifests/internal-medicine";
import painManagementNonCannabis from "./manifests/pain-management-non-cannabis";
import cannabisMedicine from "./manifests/cannabis-medicine";

const REGISTERED_FILES: Record<string, unknown> = {
  "internal-medicine.ts": internalMedicine,
  "pain-management-non-cannabis.ts": painManagementNonCannabis,
  "cannabis-medicine.ts": cannabisMedicine,
};

type RegistryEntry = SpecialtyManifest & { active: boolean };

function loadManifests(): Map<string, RegistryEntry> {
  const map = new Map<string, RegistryEntry>();

  // Cross-check: every .ts file in ./manifests/ MUST appear in REGISTERED_FILES.
  // We don't dynamic-import (Next/webpack hostility), but we do enforce that
  // the import list and the directory contents stay in sync.
  let directoryFiles: string[] = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const manifestDir = join(here, "manifests");
    directoryFiles = readdirSync(manifestDir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"),
    );
  } catch {
    // In some bundled / browser-side contexts fs is unavailable. The registry
    // is a server-side concern; if fs isn't there we fall back to whatever's
    // statically imported and skip the directory cross-check. Validation of
    // imported manifests still runs.
    directoryFiles = Object.keys(REGISTERED_FILES);
  }

  for (const file of directoryFiles) {
    if (!(file in REGISTERED_FILES)) {
      throw new Error(
        `[specialty-templates] manifest file "${file}" exists on disk but is ` +
          `not imported in registry.ts. Add it to REGISTERED_FILES so the ` +
          `registry can validate and load it.`,
      );
    }
  }

  for (const [file, raw] of Object.entries(REGISTERED_FILES)) {
    const result = validateManifest(raw);
    if (!result.ok) {
      throw new Error(
        `[specialty-templates] invalid manifest in "${file}":\n  ` +
          result.errors.join("\n  "),
      );
    }
    const manifest = result.manifest;

    // `active` is not part of the schema (per EMR-429); manifests opt OUT
    // by exporting `active: false` on the underlying object. We read it
    // off the raw value rather than the validated copy.
    const active =
      typeof raw === "object" &&
      raw !== null &&
      "active" in raw &&
      (raw as { active?: unknown }).active === false
        ? false
        : true;

    if (map.has(manifest.slug)) {
      throw new Error(
        `[specialty-templates] duplicate slug "${manifest.slug}" — found in ` +
          `both an earlier manifest and "${file}". Slugs must be unique.`,
      );
    }
    map.set(manifest.slug, { ...manifest, active });
  }

  return map;
}

// Module-init: throws if any manifest is invalid. Intentional fail-loud.
const REGISTRY: Map<string, RegistryEntry> = loadManifests();

/** All registered manifests where `active !== false`. */
export function listActiveSpecialtyTemplates(): SpecialtyManifest[] {
  const out: SpecialtyManifest[] = [];
  for (const entry of REGISTRY.values()) {
    if (entry.active) {
      // Strip the `active` flag from the public shape — callers see a
      // pure SpecialtyManifest, never the registry-internal wrapper.
      const { active: _active, ...manifest } = entry;
      out.push(manifest as SpecialtyManifest);
    }
  }
  return out;
}

/** Look up a manifest by slug. Returns null when no match (active or not). */
export function getSpecialtyTemplate(slug: string): SpecialtyManifest | null {
  const entry = REGISTRY.get(slug);
  if (!entry) return null;
  const { active: _active, ...manifest } = entry;
  return manifest as SpecialtyManifest;
}

/**
 * Default-value seed for a draft PracticeConfiguration. The controller
 * (EMR-409) spreads this onto the draft it's constructing — so this function
 * MUST NOT mutate or fetch; it's pure projection from the manifest.
 *
 * Returns an empty object when slug is unknown — onboarding flows render an
 * empty draft rather than throwing, and the UI surfaces the "specialty not
 * found" state separately.
 *
 * Field derivation:
 *   - careModel              ← default_care_model
 *   - enabledModalities      ← default_enabled_modalities
 *   - disabledModalities     ← default_disabled_modalities (verbatim — see
 *                              the Pain Management invariant above)
 *   - workflowTemplateIds    ← default_workflows
 *   - chartingTemplateIds    ← default_charting_templates
 *   - physicianShellTemplateId ← `${slug}-physician-shell` if the manifest
 *                              declared any default_mission_control_cards
 *                              (the EMR-409 shell renderer keys off this id
 *                              and looks up the actual card list separately)
 *   - patientShellTemplateId ← `${slug}-patient-shell` when
 *                              default_patient_portal_cards is non-empty
 */
export function applyTemplateDefaults(
  slug: string,
): Partial<PracticeConfigurationSeed> {
  const manifest = getSpecialtyTemplate(slug);
  if (!manifest) return {};

  const physicianShellTemplateId =
    manifest.default_mission_control_cards.length > 0
      ? `${manifest.slug}-physician-shell`
      : null;

  const patientShellTemplateId =
    manifest.default_patient_portal_cards.length > 0
      ? `${manifest.slug}-patient-shell`
      : null;

  return {
    selectedSpecialty: manifest.slug,
    careModel: manifest.default_care_model,
    enabledModalities: [...manifest.default_enabled_modalities],
    disabledModalities: [...manifest.default_disabled_modalities],
    workflowTemplateIds: [...manifest.default_workflows],
    chartingTemplateIds: [...manifest.default_charting_templates],
    physicianShellTemplateId,
    patientShellTemplateId,
  };
}

/**
 * Test-only escape hatch: re-run boot validation. Useful when a test wants
 * to confirm that the current import-time state is still valid after
 * mutating manifests in-memory. Production callers should not need this.
 */
export function __reloadForTests(): void {
  const fresh = loadManifests();
  REGISTRY.clear();
  for (const [k, v] of fresh.entries()) REGISTRY.set(k, v);
}

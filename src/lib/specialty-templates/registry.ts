/**
 * Specialty Template Registry — EMR-408 / EMR-433
 *
 * Single source of truth for the specialty manifests that the Practice
 * Onboarding Controller (EMR-409+) uses to seed a draft PracticeConfiguration.
 *
 * Architecture invariants (HARD constraints — see CLAUDE.md / Epic 2):
 *   - LeafJourney is specialty-adaptive, NOT cannabis-first. The registry
 *     never branches on `slug === 'cannabis-medicine'`. Cannabis behaviour
 *     is a manifest configuration — not a controller code path.
 *   - Adding a new specialty MUST be a manifest file drop under ./manifests/.
 *     This file should not need to change. (EMR-433.)
 *   - Pain Management (non-cannabis) is the v1 acceptance gate: its manifest
 *     MUST list "cannabis-medicine" in default_disabled_modalities (not just
 *     omit it from enabled). The registry trusts the manifest — it does not
 *     re-derive disabled lists from absence.
 *
 * Boot behaviour (EMR-433):
 *   At module-init time the registry enumerates ./manifests/ via readdirSync,
 *   dynamic-loads every `*.ts` file (and, when EMR-431 lands, every
 *   `{slug}/v*.ts` nested versioned file) via `createRequire`, validates the
 *   default export with SpecialtyManifestSchema, and throws a descriptive
 *   error if ANY manifest is invalid. This fail-loud behaviour is intentional
 *   — a silently-skipped bad manifest could cause a practice to onboard with
 *   the wrong modality bleed and is the kind of regression that's only caught
 *   in production.
 *
 *   Files matching `/test-fixture-/` are skipped UNLESS NODE_ENV === 'test',
 *   so the test fixture specialty does not pollute production specialty
 *   listings.
 */

import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

type RegistryEntry = SpecialtyManifest & { active: boolean };

const TEST_FIXTURE_PATTERN = /test-fixture-/;

/**
 * Pull the manifest object out of a freshly-loaded module record.
 * Manifests are exported as `export default <object>`, but we accept any
 * non-null object export to remain forgiving of TypeScript transpilation
 * differences (CJS interop where `default` lives under `.default`).
 */
function extractManifest(mod: unknown): unknown {
  if (mod === null || typeof mod !== "object") return mod;
  const m = mod as Record<string, unknown>;
  if ("default" in m && m.default && typeof m.default === "object") {
    return m.default;
  }
  return mod;
}

function loadManifests(): Map<string, RegistryEntry> {
  const map = new Map<string, RegistryEntry>();

  const here = dirname(fileURLToPath(import.meta.url));
  const manifestDir = join(here, "manifests");

  // `createRequire` gives us a synchronous loader from this ESM module.
  // We need sync because the registry exports a sync API
  // (`listActiveSpecialtyTemplates`), and module-init can't `await`.
  const requireFn = createRequire(import.meta.url);

  const includeTestFixtures = process.env.NODE_ENV === "test";

  // Discovery: every `*.ts` file in the manifests/ directory plus, for the
  // versioned nested layout coming with EMR-431, every `*.ts` file inside a
  // `{slug}/` subdirectory. Both layouts coexist — flat `slug.ts` files and
  // `slug/vX.Y.Z.ts` files — and the registry treats them the same.
  const candidatePaths: string[] = [];
  let entries: string[] = [];
  try {
    entries = readdirSync(manifestDir);
  } catch (err) {
    throw new Error(
      `[specialty-templates] cannot read manifests directory ` +
        `"${manifestDir}": ${(err as Error).message}`,
    );
  }

  for (const entry of entries) {
    const full = join(manifestDir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isFile()) {
      if (
        entry.endsWith(".ts") &&
        !entry.endsWith(".d.ts") &&
        !entry.endsWith(".test.ts")
      ) {
        candidatePaths.push(full);
      }
      continue;
    }

    if (stat.isDirectory()) {
      // EMR-431 nested layout: manifests/{slug}/v{X.Y.Z}.ts.
      let nested: string[] = [];
      try {
        nested = readdirSync(full);
      } catch {
        continue;
      }
      for (const child of nested) {
        if (
          child.endsWith(".ts") &&
          !child.endsWith(".d.ts") &&
          !child.endsWith(".test.ts")
        ) {
          candidatePaths.push(join(full, child));
        }
      }
    }
  }

  for (const file of candidatePaths) {
    const basename = file.slice(file.lastIndexOf("/") + 1);
    if (!includeTestFixtures && TEST_FIXTURE_PATTERN.test(basename)) {
      continue;
    }

    let raw: unknown;
    try {
      // Sync dynamic-load. tsx / vitest / Next's server runtime all support
      // requiring `.ts` under their respective loaders; in plain Node we'd
      // pre-compile, but every runtime that calls into this module already
      // has TS support wired up.
      raw = extractManifest(requireFn(file));
    } catch (err) {
      throw new Error(
        `[specialty-templates] failed to load manifest "${file}": ` +
          `${(err as Error).message}`,
      );
    }

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
 * mutating manifests in-memory or after toggling NODE_ENV. Production
 * callers should not need this.
 */
export function __reloadForTests(): void {
  const fresh = loadManifests();
  REGISTRY.clear();
  for (const [k, v] of fresh.entries()) REGISTRY.set(k, v);
}

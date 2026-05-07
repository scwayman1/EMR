/**
 * EMR-453 — MigrationProfile shapes + default-seed helper.
 *
 * The MigrationProfile row stores its per-domain plan as a JSON array under
 * the `categories` column. This module is the single source of truth for the
 * TypeScript shape of that array, and exposes a pure helper that derives the
 * default seed from a specialty manifest's `migration_mapping_defaults`.
 *
 * Architecture invariant: LeafJourney is specialty-adaptive. This file does
 * NOT branch on a specialty slug. The behaviour difference between
 * Pain Management, Internal Medicine, and Cannabis Medicine comes entirely
 * from each manifest's own `migration_mapping_defaults` object — never from
 * code that reads `manifest.slug`.
 *
 * Scope notes:
 *   - Field-mapping detail (the strict shape of `fieldMappings`/`transforms`)
 *     lands in EMR-454.
 *   - Runtime import execution lands in EMR-456.
 *   - This file deliberately keeps `fieldMappings`/`transforms` as
 *     `Record<string, unknown>` so EMR-454 can tighten them without a
 *     breaking schema migration.
 */

/**
 * Canonical kebab-case category slugs the migration profile understands.
 *
 * Universal slugs are seeded for every profile regardless of manifest. The
 * "Pain Management additions" group is opt-in: a manifest only seeds those
 * slugs if its `migration_mapping_defaults` lists the corresponding key.
 */
export type MigrationCategorySlug =
  | "demographics"
  | "medications"
  | "allergies"
  | "problem-list"
  | "notes"
  | "imaging-refs"
  | "procedures"
  | "appointments"
  | "documents"
  | "patient-reported-outcomes"
  // Pain Management additions
  | "pain-scores"
  | "pain-location"
  | "prior-procedures"
  | "imaging-history"
  | "medication-history"
  | "functional-limitations"
  | "prior-treatment-response";

export type MigrationCategory = {
  slug: MigrationCategorySlug;
  enabled: boolean;
  /** Optional source-format hint per category (overrides profile-level sourceType). */
  sourceFormat?: string;
  /** Free-form mapping object — strict shape lands when EMR-454 ships. */
  fieldMappings?: Record<string, unknown>;
  /** Free-form transform definitions — strict shape lands when EMR-454 ships. */
  transforms?: Record<string, unknown>;
};

export type MigrationProfileStatus =
  | "draft"
  | "configured"
  | "completed"
  | "archived";

export type MigrationProfile = {
  id: string;
  configurationId: string;
  sourceType: string | null;
  categories: MigrationCategory[];
  status: MigrationProfileStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

/**
 * The universal set of categories every profile starts with, regardless of
 * which specialty manifest is in play. Listed here as a single readonly
 * tuple so callers can iterate it without re-deriving the list.
 */
export const UNIVERSAL_CATEGORY_SLUGS = [
  "demographics",
  "medications",
  "allergies",
  "problem-list",
  "notes",
  "imaging-refs",
  "procedures",
  "appointments",
  "documents",
  "patient-reported-outcomes",
] as const satisfies ReadonlyArray<MigrationCategorySlug>;

/**
 * Whitelist of category slugs the helper is allowed to seed from a manifest.
 * Anything not in this set is silently ignored — manifests are free to
 * declare mapping keys for downstream tooling that the profile itself does
 * not yet model.
 */
const REGISTERED_CATEGORY_SLUGS = new Set<MigrationCategorySlug>([
  ...UNIVERSAL_CATEGORY_SLUGS,
  "pain-scores",
  "pain-location",
  "prior-procedures",
  "imaging-history",
  "medication-history",
  "functional-limitations",
  "prior-treatment-response",
]);

/**
 * Manifests use snake_case keys (e.g. `pain_score`) while the canonical
 * profile slug union is kebab-case (e.g. `pain-scores`). This map captures
 * the cases where the key→slug rewrite is non-trivial (singular vs. plural,
 * compound aliasing). Keys that are already a kebab-case match for a
 * registered slug after a simple `_`→`-` swap don't need an entry here.
 */
const MANIFEST_KEY_ALIASES: Record<string, MigrationCategorySlug> = {
  pain_score: "pain-scores",
  pain_scores: "pain-scores",
  pain_location: "pain-location",
  prior_procedures: "prior-procedures",
  imaging_history: "imaging-history",
  medication_history: "medication-history",
  functional_limitations: "functional-limitations",
  prior_treatment_response: "prior-treatment-response",
  problem_list: "problem-list",
  medication_list: "medications",
  allergy_list: "allergies",
  imaging_results: "imaging-refs",
  imaging_refs: "imaging-refs",
};

function manifestKeyToSlug(key: string): MigrationCategorySlug | null {
  if (key in MANIFEST_KEY_ALIASES) {
    return MANIFEST_KEY_ALIASES[key];
  }
  const candidate = key.replace(/_/g, "-") as MigrationCategorySlug;
  return REGISTERED_CATEGORY_SLUGS.has(candidate) ? candidate : null;
}

/**
 * Pure helper. Reads a specialty manifest's `migration_mapping_defaults` and
 * produces a default `MigrationCategory[]` seed.
 *
 * Behaviour:
 *   1. The universal set (demographics, medications, allergies, problem-list,
 *      notes, imaging-refs, procedures, appointments, documents,
 *      patient-reported-outcomes) is always included as `enabled: true`.
 *   2. Every key in `migration_mapping_defaults` that resolves to a
 *      registered category slug is added (or merged) as `enabled: true`.
 *      Manifest keys that don't match any registered slug are silently
 *      ignored — they're harmless metadata for downstream tools.
 *   3. The returned list is de-duplicated by slug. Universal categories
 *      always appear first, in declaration order; manifest-derived extras
 *      follow in the order the manifest emitted them.
 *
 * This function MUST stay pure: no I/O, no Date.now(), no manifest registry
 * lookups. Callers fetch the manifest themselves and pass it in.
 */
export function buildDefaultProfileFromManifest(manifest: {
  slug: string;
  migration_mapping_defaults: Record<string, unknown>;
}): MigrationCategory[] {
  const out: MigrationCategory[] = [];
  const seen = new Set<MigrationCategorySlug>();

  for (const slug of UNIVERSAL_CATEGORY_SLUGS) {
    out.push({ slug, enabled: true });
    seen.add(slug);
  }

  for (const key of Object.keys(manifest.migration_mapping_defaults)) {
    const slug = manifestKeyToSlug(key);
    if (slug === null) continue;
    if (seen.has(slug)) continue;
    out.push({ slug, enabled: true });
    seen.add(slug);
  }

  return out;
}

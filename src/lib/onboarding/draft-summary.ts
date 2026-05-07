// EMR-427 — Shared draft summary helper for the wizard preview & publish steps.
//
// Pure projection of the in-progress draft + the active specialty manifest
// into a stable, display-friendly shape. Steps 12–15 share this helper so
// the "what's about to be published" recap is identical everywhere it shows.
//
// Specialty-adaptive: this function never branches on a specific slug; the
// values surfaced come straight from the draft and the supplied manifest.

import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import type { PracticeConfiguration } from "@/lib/practice-config/types";

export type DraftSummary = {
  specialty: { slug: string; name: string };
  careModel: string;
  enabledModalities: string[];
  disabledModalities: string[];
  templates: { workflows: number; charting: number; roles: number };
  shells: { patient: string | null; physician: string | null };
  migration: { mode: "greenfield" | "migrate"; categories: number };
};

/**
 * Reduce a draft (plus its active specialty manifest, if known) to a
 * `DraftSummary`. Pure — no IO.
 *
 * The function tolerates a `null` manifest because steps 12–15 may render
 * before the registry has been consulted on the client; in that case the
 * specialty name falls back to its slug.
 *
 * Migration mode is "migrate" when the draft has either a `migrationProfileId`
 * or any `migration_mapping_defaults` from the manifest; otherwise "greenfield".
 * `categories` counts the number of mapping keys (data categories) the
 * downstream import will touch.
 */
export function summarizeDraft(
  draft: Partial<PracticeConfiguration>,
  manifest: SpecialtyManifest | null,
): DraftSummary {
  const slug = (draft.selectedSpecialty as string | null | undefined) ?? "";
  const specialty = {
    slug,
    name: manifest?.name ?? slug ?? "—",
  };

  const enabled = Array.isArray(draft.enabledModalities)
    ? [...draft.enabledModalities]
    : [];
  const disabled = Array.isArray(draft.disabledModalities)
    ? [...draft.disabledModalities]
    : [];

  const workflows = Array.isArray(draft.workflowTemplateIds)
    ? draft.workflowTemplateIds.length
    : 0;
  const charting = Array.isArray(draft.chartingTemplateIds)
    ? draft.chartingTemplateIds.length
    : 0;
  const roles = Array.isArray(draft.rolePermissionTemplateIds)
    ? draft.rolePermissionTemplateIds.length
    : 0;

  const physicianShell =
    (draft.physicianShellTemplateId as string | null | undefined) ?? null;
  const patientShell =
    (draft.patientShellTemplateId as string | null | undefined) ?? null;

  const mappingDefaults = manifest?.migration_mapping_defaults ?? {};
  const mappingCategories = Object.keys(mappingDefaults).length;
  const hasProfile =
    typeof draft.migrationProfileId === "string" &&
    draft.migrationProfileId.length > 0;

  const migration: DraftSummary["migration"] =
    hasProfile || mappingCategories > 0
      ? { mode: "migrate", categories: mappingCategories }
      : { mode: "greenfield", categories: 0 };

  return {
    specialty,
    careModel: (draft.careModel as string | null | undefined) ?? "",
    enabledModalities: enabled,
    disabledModalities: disabled,
    templates: { workflows, charting, roles },
    shells: { patient: patientShell, physician: physicianShell },
    migration,
  };
}

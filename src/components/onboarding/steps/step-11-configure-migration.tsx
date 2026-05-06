"use client";

// EMR-426 — Step 11: Configure migration / import.
//
// This step is the wizard's hand-off to the Migration Profile Builder. The
// admin can either declare the practice "greenfield" (no data import — done)
// or pick which categories of existing data should migrate. The actual
// field-mapping UI lives in EMR-454; the import job runner lives in EMR-456;
// the dry-run preview button is rendered DISABLED here on purpose.
//
// Specialty-adaptive: we do not branch on `selectedSpecialty`. The pre-checked
// category list is read from the active manifest's `migration_mapping_defaults`.
// When the manifest declares no migration defaults (or no specialty has been
// chosen yet), we fall back to a universal default set so any specialty-shape
// produces a sensible first cut.

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type {
  SpecialtyManifest,
} from "@/lib/specialty-templates/manifest-schema";
import type {
  PracticeConfiguration,
  WizardStepDefinition,
  WizardStepProps,
} from "@/lib/onboarding/wizard-types";

// ---------------------------------------------------------------------------
// Migration profile types
//
// TODO(EMR-453): once `src/lib/migration/profile-types.ts` lands, replace the
// local declarations below with:
//   import type {
//     MigrationCategorySlug,
//   } from "@/lib/migration/profile-types";
// EMR-453 owns `MigrationProfile`, `MigrationCategory`, `MigrationCategorySlug`,
// and `buildDefaultProfileFromManifest(manifest)`. The POST handler at
// /api/migration-profiles also lands with EMR-453.
// ---------------------------------------------------------------------------

type MigrationCategorySlug = string;

interface CategoryDescriptor {
  slug: MigrationCategorySlug;
  label: string;
  description: string;
}

// Universal default set — used when the active specialty manifest declares no
// migration_mapping_defaults. Specialty manifests can (and should) override
// these via their own keys; the pain-management manifest already does.
const UNIVERSAL_DEFAULTS: CategoryDescriptor[] = [
  {
    slug: "demographics",
    label: "Demographics",
    description: "Patient name, DOB, sex, contact info, and household linkage.",
  },
  {
    slug: "medications",
    label: "Medications",
    description: "Active medication list with dose, frequency, and start dates.",
  },
  {
    slug: "allergies",
    label: "Allergies",
    description: "Drug, food, and environmental allergies with reaction notes.",
  },
  {
    slug: "problem-list",
    label: "Problem list",
    description: "Active diagnoses and chronic conditions with ICD-10 codes.",
  },
  {
    slug: "notes",
    label: "Notes",
    description: "Historical encounter notes (free text and structured).",
  },
  {
    slug: "imaging-refs",
    label: "Imaging refs",
    description: "Pointers to prior imaging studies (DICOM IDs, accession #s).",
  },
  {
    slug: "procedures",
    label: "Procedures",
    description: "Past procedures with CPT codes, dates, and clinician.",
  },
  {
    slug: "appointments",
    label: "Appointments",
    description: "Historical and upcoming appointments to migrate forward.",
  },
  {
    slug: "documents",
    label: "Documents",
    description: "Scanned PDFs, consent forms, prior records on file.",
  },
  {
    slug: "patient-reported-outcomes",
    label: "Patient-reported outcomes",
    description: "Past PRO surveys (pain, mood, sleep) so trends survive.",
  },
];

/**
 * Human-friendly labels for the keys that appear in
 * `manifest.migration_mapping_defaults`. The map is intentionally permissive:
 * unknown keys still render with a generated label so a manifest can introduce
 * a new category without a code change here.
 */
const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  pain_scores: {
    label: "Pain scores",
    description: "Historical pain ratings (0-10 scale) with timestamps.",
  },
  pain_location: {
    label: "Pain location",
    description: "Body-map locations for each documented pain complaint.",
  },
  pain_quality: {
    label: "Pain quality",
    description: "Descriptors (sharp, dull, burning) tied to each location.",
  },
  pain_radiation: {
    label: "Pain radiation",
    description: "Radiation patterns documented in prior visits.",
  },
  prior_procedures: {
    label: "Prior procedures",
    description: "Injections, blocks, ablations performed previously.",
  },
  imaging_history: {
    label: "Imaging history",
    description: "Prior MRI/CT/X-ray reports relevant to the pain workup.",
  },
  medication_history: {
    label: "Medication history",
    description: "Past pain medications, doses, and discontinuation reasons.",
  },
  functional_limitations: {
    label: "Functional limitations",
    description: "Documented ADL impacts, mobility restrictions, work status.",
  },
  prior_treatment_response: {
    label: "Prior treatment response",
    description: "What the patient has tried and how well it worked.",
  },
  pdmp_history: {
    label: "PDMP history",
    description: "Prescription drug monitoring program lookup snapshots.",
  },
};

function humanize(slug: string): string {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Project a manifest's `migration_mapping_defaults` into the descriptor list
 * the UI renders. The map's *keys* are the category slugs we send to the
 * server; the values are the manifest's preferred internal field names and
 * are not surfaced to the admin in this step (EMR-454 owns field mapping).
 */
function descriptorsFromManifest(
  manifest: SpecialtyManifest | null,
): CategoryDescriptor[] {
  if (!manifest) return UNIVERSAL_DEFAULTS;
  const keys = Object.keys(manifest.migration_mapping_defaults ?? {});
  if (keys.length === 0) return UNIVERSAL_DEFAULTS;

  return keys.map((key) => {
    const meta = CATEGORY_LABELS[key];
    return {
      slug: key,
      label: meta?.label ?? humanize(key),
      description:
        meta?.description ??
        `Migrate ${humanize(key).toLowerCase()} records from the source system.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step11ConfigureMigration({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  const [manifest, setManifest] = React.useState<SpecialtyManifest | null>(null);
  const [manifestLoading, setManifestLoading] = React.useState(true);
  const [importEnabled, setImportEnabled] = React.useState<boolean>(
    draft.migrationProfileId != null,
  );
  const [selectedSlugs, setSelectedSlugs] = React.useState<Set<string>>(
    new Set(),
  );
  // The file is held only in component state for v1 — no upload to a backend
  // happens here. EMR-456 (job runner) will accept the file when the Migration
  // Profile Builder is wired up.
  const [sampleFile, setSampleFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load the active specialty manifest so we can pre-fill categories from
  // `migration_mapping_defaults`. We reuse the existing /api/specialty-templates
  // endpoint pattern that step 3 uses.
  React.useEffect(() => {
    let cancelled = false;
    if (!draft.selectedSpecialty) {
      setManifest(null);
      setManifestLoading(false);
      return;
    }
    setManifestLoading(true);
    fetch("/api/specialty-templates")
      .then((res) => res.json())
      .then((data: { items: SpecialtyManifest[] }) => {
        if (cancelled) return;
        const found =
          data.items.find((m) => m.slug === draft.selectedSpecialty) ?? null;
        setManifest(found);
        setManifestLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setManifest(null);
        setManifestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.selectedSpecialty]);

  const descriptors = React.useMemo(
    () => descriptorsFromManifest(manifest),
    [manifest],
  );

  // When descriptors change (manifest loaded / specialty switched) seed the
  // selection to "all on" — this matches the spec ("Defaults checked").
  React.useEffect(() => {
    setSelectedSlugs(new Set(descriptors.map((d) => d.slug)));
  }, [descriptors]);

  function toggle(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSampleFile(file);
  }

  async function handleContinue() {
    setError(null);

    // Greenfield path: clear any prior profile id, no API call needed.
    if (!importEnabled) {
      patch({ migrationProfileId: null });
      goNext();
      return;
    }

    if (!draft.id) {
      setError("No draft id — cannot create migration profile.");
      return;
    }
    if (selectedSlugs.size === 0) {
      setError("Select at least one category, or switch to greenfield.");
      return;
    }

    setSubmitting(true);
    try {
      // TODO(EMR-453): /api/migration-profiles is owned by EMR-453. The route
      // creates a draft `MigrationProfile` row and returns `{ id }`. If the
      // route 404s in this worktree the in-flight branch hasn't merged yet.
      const res = await fetch("/api/migration-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configurationId: draft.id,
          categories: Array.from(selectedSlugs),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new Error("Server did not return a profile id.");
      patch({
        migrationProfileId: data.id,
      } as Partial<PracticeConfiguration>);
      goNext();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create the migration profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const continueDisabled =
    submitting ||
    (importEnabled && !manifestLoading && selectedSlugs.size === 0);

  return (
    <section className="space-y-6" aria-labelledby="step-11-heading">
      <header className="space-y-1">
        <h2
          id="step-11-heading"
          className="font-display text-xl font-medium text-text tracking-tight"
        >
          Configure migration
        </h2>
        <p className="text-sm text-text-muted">
          Decide whether to import existing data into this practice, and pick
          which categories to bring across. You can refine field mappings in
          the Migration Profile Builder after onboarding.
        </p>
      </header>

      {/* Import toggle */}
      <Card tone="outlined" className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-text">Import existing data</p>
            <p className="text-sm text-text-muted mt-1">
              Turn this off if the practice is starting fresh (greenfield).
              When off, no migration profile is attached and you can move on.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={importEnabled}
            onClick={() => setImportEnabled((v) => !v)}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full",
              "transition-colors duration-200 ease-smooth",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              importEnabled ? "bg-accent" : "bg-border-strong/60",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm",
                "transition-transform duration-200 ease-smooth",
                importEnabled ? "translate-x-6" : "translate-x-1",
              )}
            />
            <span className="sr-only">
              {importEnabled ? "Importing data" : "Greenfield"}
            </span>
          </button>
        </div>
      </Card>

      {importEnabled && (
        <>
          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text">
                Data categories to migrate
              </h3>
              {manifest ? (
                <Badge tone="accent">
                  Pre-filled from {manifest.name}
                </Badge>
              ) : (
                <Badge tone="warning">Universal defaults</Badge>
              )}
            </div>

            {manifestLoading ? (
              <div
                className="rounded-xl border border-dashed border-border-strong/60 bg-surface-muted p-6 text-center text-sm text-text-muted"
                aria-live="polite"
              >
                Loading specialty migration defaults…
              </div>
            ) : (
              <fieldset
                className="grid gap-3 sm:grid-cols-2"
                aria-label="Migration categories"
              >
                <legend className="sr-only">Migration categories</legend>
                {descriptors.map((d) => {
                  const checked = selectedSlugs.has(d.slug);
                  return (
                    <label
                      key={d.slug}
                      className={cn(
                        "block cursor-pointer rounded-xl border p-4 transition-all duration-200 ease-smooth",
                        "focus-within:ring-2 focus-within:ring-accent/30",
                        checked
                          ? "border-accent bg-accent-soft shadow-sm"
                          : "border-border/80 bg-surface hover:border-border-strong hover:shadow-sm",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(d.slug)}
                          className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                          aria-describedby={`mig-cat-${d.slug}-desc`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-text">{d.label}</p>
                          <p
                            id={`mig-cat-${d.slug}-desc`}
                            className="text-sm text-text-muted mt-0.5"
                          >
                            {d.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </fieldset>
            )}
          </div>

          {/* Sample file upload + dry-run */}
          <Card tone="outlined" className="p-5 space-y-4">
            <div>
              <p className="font-medium text-text">Sample file (optional)</p>
              <p className="text-sm text-text-muted mt-1">
                Upload a small export from the source system so we can preview
                how the rows will land. We accept CSV, JSON, or XLSX.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".csv,.json,.xlsx"
                onChange={onFile}
                className={cn(
                  "block max-w-full text-sm text-text-muted",
                  "file:mr-3 file:rounded-md file:border file:border-border-strong/70",
                  "file:bg-surface-raised file:px-3 file:py-1.5 file:text-sm",
                  "file:font-medium file:text-text hover:file:bg-surface-muted",
                )}
              />
              {sampleFile && (
                <span className="text-xs text-text-muted">
                  {sampleFile.name}{" "}
                  <span aria-hidden="true">·</span>{" "}
                  {(sampleFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="Coming soon — EMR-456"
                aria-disabled="true"
              >
                Dry-run preview
              </Button>
              <p className="mt-2 text-xs text-text-muted">
                Dry-run will run the selected categories against the sample
                file and report row counts and warnings before any real import.
              </p>
            </div>
          </Card>
        </>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={continueDisabled}>
          {submitting
            ? "Saving…"
            : importEnabled
              ? "Create profile and continue"
              : "Continue (greenfield)"}
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step definition — registered in `wizard-steps.ts`.
// ---------------------------------------------------------------------------

export const step11ConfigureMigrationDefinition: WizardStepDefinition = {
  id: "configure-migration",
  title: "Configure migration",
  description:
    "Decide how existing data will migrate into the new configuration.",
  Component: Step11ConfigureMigration,
  // Greenfield mode is "complete" with no profile attached. Migration mode
  // requires a `migrationProfileId` to be set on the draft. The shell calls
  // this any time the draft updates so flipping the toggle re-evaluates.
  isComplete: (draft) => {
    // We can't read local component state from here — but the contract is:
    // when the user picks greenfield they `patch({ migrationProfileId: null })`
    // and goNext(); when they choose migration the API call sets it. So a
    // null profile id after this step has been navigated past means
    // greenfield, which is "complete". If the user has not yet visited the
    // step, the shell still treats earlier-step completion as the gate.
    if (draft.migrationProfileId === null) return true; // explicit greenfield
    return typeof draft.migrationProfileId === "string" &&
      draft.migrationProfileId.length > 0;
  },
  isReachable: (draft) => draft.physicianShellTemplateId != null,
};

"use client";

// EMR-427 — Shared preview chrome for wizard steps 12–14.
//
// Steps 12, 13, and 14 each render a different shell against the *draft*
// configuration. The "Preview mode — not yet published" banner above the
// shell and the draft-summary panel below it are identical across all three
// steps, so they live here.

import * as React from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditorialRule, Eyebrow } from "@/components/ui/ornament";
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import type { PracticeConfiguration } from "@/lib/practice-config/types";
import {
  summarizeDraft,
  type DraftSummary,
} from "@/lib/onboarding/draft-summary";

/** Hook: load the active specialty manifest for the draft. Tolerates errors. */
export function useActiveManifest(
  slug: string | null | undefined,
): SpecialtyManifest | null {
  const [manifest, setManifest] = React.useState<SpecialtyManifest | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setManifest(null);
      return;
    }
    fetch("/api/specialty-templates")
      .then((res) => res.json())
      .then((data: { items: SpecialtyManifest[] }) => {
        if (cancelled) return;
        const found = data.items.find((m) => m.slug === slug);
        setManifest(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return manifest;
}

/** "Preview mode — not yet published" editorial-rule banner. */
export function PreviewBanner() {
  return (
    <Card tone="ambient" className="overflow-hidden">
      <div className="px-5 pt-5">
        <Eyebrow>Preview mode</Eyebrow>
        <p className="mt-2 text-sm text-text">
          This is a read-only preview of the configuration as it would appear
          once published. Nothing has been activated for the practice yet —
          come back to step 15 to publish when you{"’"}re ready.
        </p>
      </div>
      <div className="px-5 pb-5 pt-4">
        <EditorialRule />
      </div>
    </Card>
  );
}

/** Summary panel rendered below the shell preview on each preview step. */
export function DraftSummaryPanel({
  summary,
  hiddenModulesCount = 0,
}: {
  summary: DraftSummary;
  /**
   * Number of explicitly hidden modules. Surfaced separately from
   * `disabledModalities.length` so that a future "module visibility" step
   * can drive this independently. Defaults to the disabled-modalities count
   * when the dedicated value is not yet wired up.
   */
  hiddenModulesCount?: number;
}) {
  const hidden =
    hiddenModulesCount > 0
      ? hiddenModulesCount
      : summary.disabledModalities.length;

  return (
    <Card tone="default" className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-base font-medium text-text tracking-tight">
            Configuration summary
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            What the publish step will activate for this practice.
          </p>
        </div>
        <Badge tone="neutral">Draft</Badge>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Specialty
          </dt>
          <dd className="text-text font-medium mt-0.5">
            {summary.specialty.name}
            {summary.specialty.slug && (
              <span className="text-text-muted font-mono text-xs ml-1.5">
                ({summary.specialty.slug})
              </span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Care model
          </dt>
          <dd className="text-text font-medium mt-0.5">
            {summary.careModel || "—"}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Enabled modalities
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {summary.enabledModalities.length === 0 ? (
              <span className="text-text-muted text-sm">None enabled.</span>
            ) : (
              summary.enabledModalities.map((m) => (
                <Badge key={m} tone="success">
                  {m}
                </Badge>
              ))
            )}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Disabled modalities
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {summary.disabledModalities.length === 0 ? (
              <span className="text-text-muted text-sm">None disabled.</span>
            ) : (
              summary.disabledModalities.map((m) => (
                <Badge key={m} tone="neutral">
                  {m}
                </Badge>
              ))
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Applied templates
          </dt>
          <dd className="text-text mt-0.5 text-sm">
            {summary.templates.workflows} workflow
            {summary.templates.workflows === 1 ? "" : "s"} ·{" "}
            {summary.templates.charting} charting ·{" "}
            {summary.templates.roles} role
            {summary.templates.roles === 1 ? "" : "s"}
          </dd>
        </div>

        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Hidden modules
          </dt>
          <dd className="text-text mt-0.5 text-sm">
            {hidden} module{hidden === 1 ? "" : "s"} hidden
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-text-muted">
            Migration scope
          </dt>
          <dd className="text-text mt-0.5 text-sm">
            {summary.migration.mode === "greenfield" ? (
              <>Greenfield — no prior data import.</>
            ) : (
              <>
                Migrate · {summary.migration.categories} data categor
                {summary.migration.categories === 1 ? "y" : "ies"} mapped
              </>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** Convenience: build a summary from draft + cached manifest in one shot. */
export function useDraftSummary(
  draft: Partial<PracticeConfiguration>,
): DraftSummary {
  const manifest = useActiveManifest(draft.selectedSpecialty);
  return React.useMemo(
    () => summarizeDraft(draft, manifest),
    [draft, manifest],
  );
}

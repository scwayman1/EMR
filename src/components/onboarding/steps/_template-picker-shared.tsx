"use client";

// EMR-424 — shared UI primitives for steps 6, 7, 8.
// The diff helper itself lives in `src/lib/onboarding/template-diff.ts`
// (single source of truth). This file owns presentation only.

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import type { TemplateIdDiff } from "@/lib/onboarding/template-diff";
import { hasDiff } from "@/lib/onboarding/template-diff";

interface DiffBannerProps {
  diff: TemplateIdDiff;
  unitSingular: string;
  unitPlural: string;
}

/**
 * Live banner summarising added/removed template IDs vs the specialty
 * default. Renders nothing when the diff is empty so the form stays calm.
 */
export function DiffBanner({ diff, unitSingular, unitPlural }: DiffBannerProps) {
  if (!hasDiff(diff)) return null;

  const addedCount = diff.added.length;
  const removedCount = diff.removed.length;
  const totalChanged = addedCount + removedCount;

  return (
    <div
      className="rounded-xl border border-highlight/30 bg-highlight-soft p-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-text">
        <span className="font-medium">
          {totalChanged} {totalChanged === 1 ? unitSingular : unitPlural}
        </span>{" "}
        differ from the specialty default.
      </p>

      {addedCount > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Added
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {diff.added.map((id) => (
              <Badge key={`added-${id}`} tone="accent">
                + {id}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {removedCount > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Removed
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {diff.removed.map((id) => (
              <Badge key={`removed-${id}`} tone="warning">
                − {id}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

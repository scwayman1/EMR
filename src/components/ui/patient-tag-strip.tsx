"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TagPill } from "@/components/ui/tag-pill";
import { DEFAULT_TAGS, type PatientTag } from "@/lib/domain/patient-tags";

// ---------------------------------------------------------------------------
// PatientTagStrip — read-only horizontal strip of a patient's selected tags.
//
// Reads from the same localStorage keys (`patient-tags-${patientId}`) that
// the TagManager writes to, so the roster row and the patient detail are
// always in sync.
//
// TODO(EMR-684): swap reads to a server-side PatientTag table when it lands.
// ---------------------------------------------------------------------------

interface PatientTagStripProps {
  patientId: string;
  /** Truncate after this many; show "+N" overflow. Default 3. */
  max?: number;
  className?: string;
}

export function PatientTagStrip({
  patientId,
  max = 3,
  className,
}: PatientTagStripProps) {
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`patient-tags-${patientId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setTagIds(parsed.filter((x): x is string => typeof x === "string"));
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [patientId]);

  if (!hydrated || tagIds.length === 0) return null;

  const tags: PatientTag[] = DEFAULT_TAGS.filter((t) => tagIds.includes(t.id));
  const shown = tags.slice(0, max);
  const overflow = tags.length - shown.length;

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {shown.map((t) => (
        <TagPill key={t.id} label={t.label} color={t.color} size="sm" />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-text-subtle font-medium px-1">
          +{overflow}
        </span>
      )}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TAGS, type PatientTag } from "@/lib/domain/patient-tags";
import { PatientTagBadge } from "@/components/ui/patient-tag-badge";

interface TagManagerProps {
  patientId: string;
}

/**
 * Patient tag manager. Stores tag IDs in localStorage under
 * `patient-tags-${patientId}` until we wire this up to the database.
 */
export function TagManager({ patientId }: TagManagerProps) {
  const storageKey = `patient-tags-${patientId}`;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setSelectedIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  function persist(next: string[]) {
    setSelectedIds(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function toggle(tag: PatientTag) {
    if (selectedIds.includes(tag.id)) {
      persist(selectedIds.filter((id) => id !== tag.id));
    } else {
      persist([...selectedIds, tag.id]);
    }
  }

  function remove(tagId: string) {
    persist(selectedIds.filter((id) => id !== tagId));
  }

  const selectedTags = DEFAULT_TAGS.filter((t) => selectedIds.includes(t.id));

  if (!hydrated) {
    return <div className="h-7" aria-hidden="true" />;
  }

  return (
    <div className="relative inline-flex items-center gap-2 flex-wrap">
      {selectedTags.map((tag) => (
        <PatientTagBadge
          key={tag.id}
          tag={tag}
          onRemove={() => remove(tag.id)}
        />
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border border-dashed border-border-strong text-text-muted hover:bg-surface-muted"
        >
          + Add tag
        </button>

        {open && (
          <>
            {/* overlay to close on outside click */}
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close tag picker"
              onClick={() => setOpen(false)}
            />
            <div
              className="absolute z-50 top-full mt-2 left-0 w-64 rounded-xl border border-border bg-surface-raised shadow-lg p-2"
              role="menu"
            >
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                Tag this patient
              </p>
              <ul className="max-h-72 overflow-y-auto">
                {DEFAULT_TAGS.map((tag) => {
                  const isSelected = selectedIds.includes(tag.id);
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        onClick={() => toggle(tag)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-left rounded-md hover:bg-surface-muted"
                      >
                        <PatientTagBadge tag={tag} />
                        {isSelected ? (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

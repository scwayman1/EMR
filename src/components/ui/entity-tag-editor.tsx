"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TagPill } from "@/components/ui/tag-pill";
import { TagInput, type Tag } from "@/components/ui/tag-input";
import {
  readTags,
  writeTags,
  SUGGESTED_TAGS,
  type EntityTagScope,
} from "@/lib/domain/entity-tags";

// ---------------------------------------------------------------------------
// EntityTagEditor — reusable popover wrapper around TagInput that persists to
// localStorage under a scope/entityId pair. Used by inbox threads, chart
// tasks, and broadcast campaigns until a server-side Tag model lands.
// ---------------------------------------------------------------------------

interface EntityTagEditorProps {
  scope: EntityTagScope;
  entityId: string;
  /** Compact = no leading "Tags" label, smaller affordance. */
  compact?: boolean;
  className?: string;
}

interface EntityTagStripProps {
  scope: EntityTagScope;
  entityId: string;
  /** Truncate after this many pills; show "+N". Default 3. */
  max?: number;
  className?: string;
}

/**
 * Read-only horizontal strip of an entity's tags. Pairs with EntityTagEditor
 * for surfaces (inbox list, task rows) where the editor is too heavy.
 */
export function EntityTagStrip({
  scope,
  entityId,
  max = 3,
  className,
}: EntityTagStripProps) {
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setTags(readTags(scope, entityId));
    setHydrated(true);
  }, [scope, entityId]);

  if (!hydrated || tags.length === 0) return null;
  const shown = tags.slice(0, max);
  const overflow = tags.length - shown.length;

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {shown.map((t, i) => (
        <TagPill key={`${t.label}-${i}`} label={t.label} color={t.color} size="sm" />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-text-subtle font-medium px-1">
          +{overflow}
        </span>
      )}
    </span>
  );
}

export function EntityTagEditor({
  scope,
  entityId,
  compact = false,
  className,
}: EntityTagEditorProps) {
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [open, setOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setTags(readTags(scope, entityId));
    setHydrated(true);
  }, [scope, entityId]);

  function persist(next: Tag[]) {
    setTags(next);
    writeTags(scope, entityId, next);
  }

  // SSR placeholder — render a stable-height shell so layout doesn't jump
  // when the client hydrates and pulls tags from storage.
  if (!hydrated) {
    return <div className={cn("h-6", className)} aria-hidden="true" />;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 flex-wrap", className)}>
      {!compact && tags.length > 0 && (
        <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
          Tags
        </span>
      )}
      {tags.map((t, i) => (
        <TagPill key={`${t.label}-${i}`} label={t.label} color={t.color} />
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong",
            "text-text-muted hover:bg-surface-muted",
            compact
              ? "px-1.5 py-0.5 text-[10px]"
              : "px-2.5 py-0.5 text-[11px] font-medium",
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {tags.length === 0 ? "+ Tag" : "Edit"}
        </button>

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close tag editor"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              role="dialog"
              aria-label="Edit tags"
              onClick={(e) => e.stopPropagation()}
              className="absolute z-50 top-full mt-2 left-0 w-72 rounded-xl border border-border bg-surface-raised shadow-lg p-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-text-subtle font-medium mb-2">
                Tags
              </p>
              <TagInput
                value={tags}
                onChange={persist}
                suggestions={SUGGESTED_TAGS[scope]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

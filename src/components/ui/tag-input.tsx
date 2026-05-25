"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TagPill, type TagColor } from "@/components/ui/tag-pill";
import { ColorPicker, DEFAULT_PALETTE } from "@/components/ui/color-picker";

// ---------------------------------------------------------------------------
// TagInput — Notion-style multi-tag editor.
//
// Behavior:
//   • Type to filter `suggestions`; ↑/↓ to navigate, Enter to commit the
//     highlighted suggestion (or create a new tag with the typed label).
//   • Backspace on an empty input removes the last selected tag.
//   • A small ColorPicker sits inline below the input — assigns a color to
//     the *next* tag being created. Defaults to the first palette color.
//   • Tags appear as TagPills with × to remove.
//
// Storage shape is intentionally tiny and additive:
//   { id?, label, color }
//
// The component is fully controlled — it does not own selection state.
// ---------------------------------------------------------------------------

export interface Tag {
  /** Stable id when persisted (DB / localStorage); undefined for ad-hoc tags. */
  id?: string;
  /** Visible label, e.g. "follow-up". */
  label: string;
  /** Palette color name. */
  color: TagColor;
}

export interface TagInputProps {
  value: Tag[];
  onChange: (next: Tag[]) => void;
  /** Optional pool of tag suggestions. Filtered by typed query. */
  suggestions?: Tag[];
  /** Placeholder text shown when no tags are selected. */
  placeholder?: string;
  /** Disable input + remove buttons. */
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-tag input with inline color picker and suggestion dropdown.
 *
 * Implementation notes:
 *   • Dedupe by lowercased label so picking the same suggestion twice or
 *     hitting Enter on an existing tag is a no-op.
 *   • Suggestions filter is case-insensitive substring match. Already-selected
 *     tags are hidden from the suggestion list to avoid noise.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
  disabled = false,
  className,
}: TagInputProps) {
  const [query, setQuery] = React.useState("");
  const [nextColor, setNextColor] = React.useState<TagColor>(
    DEFAULT_PALETTE[0]?.name as TagColor,
  );
  const [highlight, setHighlight] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedLabels = React.useMemo(
    () => new Set(value.map((t) => t.label.trim().toLowerCase())),
    [value],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return suggestions
      .filter((t) => !selectedLabels.has(t.label.trim().toLowerCase()))
      .filter((t) => (q ? t.label.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [suggestions, query, selectedLabels]);

  // Keep highlight in bounds when the filtered list shrinks.
  React.useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  function commitTag(tag: Tag) {
    const label = tag.label.trim();
    if (!label) return;
    if (selectedLabels.has(label.toLowerCase())) return;
    onChange([...value, { ...tag, label }]);
    setQuery("");
    setHighlight(0);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && query === "" && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
      return;
    }
    if (e.key === "ArrowDown") {
      if (filtered.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      if (filtered.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = filtered[highlight];
      if (picked) {
        commitTag(picked);
      } else if (query.trim()) {
        commitTag({ label: query.trim(), color: nextColor });
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5",
          "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/40",
          disabled && "opacity-60 pointer-events-none",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((t, i) => (
          <TagPill
            key={`${t.label}-${i}`}
            label={t.label}
            color={t.color}
            onRemove={disabled ? undefined : () => removeAt(i)}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close so a click on a suggestion still registers.
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Add tag"
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-text placeholder:text-text-subtle py-0.5"
        />
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-text-subtle">
          Color
        </span>
        <ColorPicker
          value={nextColor}
          onChange={(name) => setNextColor(name as TagColor)}
          ariaLabel="Color for next tag"
        />
        {query.trim() && (
          <span className="text-[11px] text-text-subtle">
            Enter to add &ldquo;{query.trim()}&rdquo;
          </span>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div
          role="listbox"
          className="relative mt-1"
        >
          <ul className="absolute z-30 left-0 right-0 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg py-1">
            {filtered.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  // Use mousedown so we fire before the input's onBlur close.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitTag(s);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm",
                    i === highlight ? "bg-surface-muted" : "hover:bg-surface-muted/60",
                  )}
                >
                  <TagPill label={s.label} color={s.color} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

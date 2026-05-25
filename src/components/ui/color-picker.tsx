"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Tooltip } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// ColorPicker — restricted-palette swatch picker (NOT a free RGB picker).
//
// Design intent: every color that ships across EMR (tags, calendar labels,
// broadcast categories) must come from the same brand-safe palette so the
// UI never gets a #FF00FF surprise. The picker enforces that by accepting
// only `PaletteColor.name` values — there's no raw hex input on purpose.
//
// The 8 default colors match `TAG_COLOR_CLASSES` in `@/lib/domain/patient-tags`
// so a tag picked here renders identically anywhere a PatientTagBadge or
// TagPill shows up.
// ---------------------------------------------------------------------------

export interface PaletteColor {
  /** Stable identifier persisted with the entity (e.g. `emerald`). */
  name: string;
  /** Human label shown in the tooltip. */
  label: string;
  /** Hex preview used to paint the swatch — not stored on the entity. */
  hex: string;
}

/**
 * Default 8-color brand palette. Names match the `PatientTag["color"]` union
 * in `src/lib/domain/patient-tags.ts` so tags picked here are interchangeable
 * with the existing PatientTag system.
 *
 * Order: accent → success → warning → danger → indigo (blue) → purple → pink → neutral.
 */
export const DEFAULT_PALETTE: readonly PaletteColor[] = [
  { name: "emerald", label: "Accent · Emerald", hex: "#10B981" },
  { name: "teal", label: "Success · Teal", hex: "#14B8A6" },
  { name: "amber", label: "Warning · Amber", hex: "#F59E0B" },
  { name: "red", label: "Danger · Red", hex: "#EF4444" },
  { name: "blue", label: "Indigo · Blue", hex: "#3B82F6" },
  { name: "purple", label: "Purple", hex: "#8B5CF6" },
  { name: "rose", label: "Pink · Rose", hex: "#F43F5E" },
  { name: "gray", label: "Neutral · Gray", hex: "#6B7280" },
] as const;

export interface ColorPickerProps {
  /** Currently selected color `name` (must exist in `palette`). */
  value: string;
  /** Called with the new `name` when the user picks a swatch. */
  onChange: (name: string) => void;
  /** Override the swatch list. Defaults to `DEFAULT_PALETTE`. */
  palette?: readonly PaletteColor[];
  /** Optional aria-label for the swatch row container. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Restricted-palette color picker. Renders a single row of swatches with
 * a hairline ring on the selected one. Keyboard: ←/→ to navigate, Enter /
 * Space to commit. Hover/focus surfaces the color's human label via Tooltip.
 */
export function ColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  ariaLabel = "Color",
  className,
}: ColorPickerProps) {
  // Track focus so arrow-key nav doesn't fight the natural tab order on
  // page load — we only intercept arrows once the swatch row has focus.
  const [focusedIndex, setFocusedIndex] = React.useState<number>(() => {
    const idx = palette.findIndex((c) => c.name === value);
    return idx >= 0 ? idx : 0;
  });
  const swatchRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Keep focus index in sync if `value` changes externally.
  React.useEffect(() => {
    const idx = palette.findIndex((c) => c.name === value);
    if (idx >= 0) setFocusedIndex(idx);
  }, [value, palette]);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Enter" && e.key !== " ") {
      return;
    }
    e.preventDefault();
    if (e.key === "Enter" || e.key === " ") {
      const c = palette[focusedIndex];
      if (c) onChange(c.name);
      return;
    }
    const delta = e.key === "ArrowLeft" ? -1 : 1;
    const next = (focusedIndex + delta + palette.length) % palette.length;
    setFocusedIndex(next);
    swatchRefs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKey}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {palette.map((c, i) => {
        const selected = c.name === value;
        return (
          <Tooltip key={c.name} content={c.label} delay={300}>
            <button
              ref={(node) => {
                swatchRefs.current[i] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.label}
              tabIndex={selected || (focusedIndex === i && !palette.some((p) => p.name === value)) ? 0 : -1}
              onClick={() => onChange(c.name)}
              onFocus={() => setFocusedIndex(i)}
              className={cn(
                "h-6 w-6 rounded-full border border-black/10 transition-transform duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                "hover:scale-110",
                selected && "ring-2 ring-offset-2 ring-offset-surface ring-text/60",
              )}
              style={{ backgroundColor: c.hex }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

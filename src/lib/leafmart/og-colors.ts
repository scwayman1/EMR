/**
 * Hex color palette for OG image generation.
 *
 * `next/og` ImageResponse renders without access to CSS custom properties,
 * so the design tokens from globals.css are duplicated here as literals.
 * Keep these in sync with the `.theme-leafmart` block in globals.css.
 */

// Plain `string` values (no `as const`) so callers can pass any property
// to functions typed for `string` — `as const` was narrowing each value
// to its hex literal and breaking `resolveColor`'s default fallback.
export const OG_COLORS: Record<string, string> = {
  bg: "#FFFCF7",
  bgDeep: "#F6F0E4",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F0E3",
  ink: "#152119",
  textSoft: "#4A5651",
  muted: "#6E6A60",
  leaf: "#1F4D37",
  leafSoft: "#E2ECE5",
  sage: "#D8E5D0",
  peach: "#F8DDC8",
  butter: "#F5E6B8",
  rose: "#F1D4D0",
  lilac: "#E2D8E8",
  mint: "#CFE3D8",
};

const VAR_TO_HEX: Record<string, string> = {
  "--bg": OG_COLORS.bg,
  "--bg-deep": OG_COLORS.bgDeep,
  "--surface": OG_COLORS.surface,
  "--surface-muted": OG_COLORS.surfaceMuted,
  "--ink": OG_COLORS.ink,
  "--text-soft": OG_COLORS.textSoft,
  "--muted": OG_COLORS.muted,
  "--leaf": OG_COLORS.leaf,
  "--leaf-soft": OG_COLORS.leafSoft,
  "--sage": OG_COLORS.sage,
  "--peach": OG_COLORS.peach,
  "--butter": OG_COLORS.butter,
  "--rose": OG_COLORS.rose,
  "--lilac": OG_COLORS.lilac,
  "--mint": OG_COLORS.mint,
};

/**
 * Resolve a CSS color value (hex or `var(--token)`) to a literal hex string.
 * Falls back to the input if no mapping is found.
 */
export function resolveColor(value: string | undefined | null, fallback: string = OG_COLORS.sage): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return trimmed;
  const match = trimmed.match(/^var\((--[a-z-]+)\)$/i);
  if (match) {
    return VAR_TO_HEX[match[1]] ?? fallback;
  }
  return trimmed;
}

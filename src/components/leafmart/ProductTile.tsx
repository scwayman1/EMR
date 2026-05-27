import { cn } from "@/lib/utils/cn";
import { FormatIcon } from "./FormatIcon";
import { FORMAT_VISUALS } from "./formats";
import type { ProductFormat } from "@/lib/marketplace/types";

interface ProductTileProps {
  format: ProductFormat;
  brand?: string;
  name?: string;
  /** Show the big editorial layout (PDP). Default is the compact card layout. */
  variant?: "card" | "hero";
  className?: string;
}

/**
 * The "product image" on Leafmart — a brand-coded tonal tile that stands
 * in for real photography. Gradient + format icon + wordmark line give
 * every card a unique visual identity without needing a CDN pipeline.
 *
 * Two variants:
 *   - card → used on grids; compact format icon + subtle brand line
 *   - hero → used on PDPs; oversized icon, editorial typography
 */
export function ProductTile({
  format,
  brand,
  name,
  variant = "card",
  className,
}: ProductTileProps) {
  const visual = FORMAT_VISUALS[format] ?? FORMAT_VISUALS.tincture;
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        visual.tileClass,
        visual.inkClass,
        isHero ? "aspect-square rounded-lg" : "aspect-[4/3]",
        className,
      )}
      aria-hidden="true"
    >
      {/* Paper-grain noise overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,.35) 0, transparent 35%), radial-gradient(circle at 80% 80%, rgba(0,0,0,.25) 0, transparent 35%)",
        }}
      />

      {/* Corner wordmark — tiny and editorial */}
      {brand && !isHero && (
        <p
          className={cn(
            "absolute top-3 left-3 text-[9px] uppercase tracking-[0.2em] opacity-80",
          )}
        >
          {brand}
        </p>
      )}

      {/* Centered format icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <FormatIcon
          format={format}
          size={isHero ? 80 : 44}
          className={cn("opacity-90", isHero && "drop-shadow-sm")}
        />
      </div>

      {/* Format label footer — bottom-left editorial line */}
      <p
        className={cn(
          "absolute bottom-3 left-3 uppercase tracking-[0.2em] opacity-80",
          isHero ? "text-xs" : "text-[10px]",
        )}
      >
        {visual.label}
      </p>

      {/* Hero variant additionally prints the product name in a display serif */}
      {isHero && name && (
        <p className="absolute bottom-10 left-6 right-6 font-display text-xl leading-tight tracking-tight opacity-95">
          {name}
        </p>
      )}
    </div>
  );
}

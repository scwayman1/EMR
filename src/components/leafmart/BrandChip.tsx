import { cn } from "@/lib/utils/cn";
import type { BrandIdentity } from "./formats";

/**
 * Founding-partner brand tile. Tonal block with the partner's name set
 * in display serif + tagline underneath. Hover reveals a gold rule that
 * slides in from the left, reinforcing the "curated shelf" metaphor.
 */
export function BrandChip({
  brand,
  className,
}: {
  brand: BrandIdentity;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg p-5 h-full min-h-[136px] flex flex-col justify-end transition-transform duration-300 hover:-translate-y-0.5",
        brand.tileClass,
        brand.inkClass,
        className,
      )}
    >
      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(255,255,255,.4) 0, transparent 40%), radial-gradient(circle at 85% 85%, rgba(0,0,0,.2) 0, transparent 40%)",
        }}
      />
      {/* Slide-in rule on hover */}
      <span
        aria-hidden="true"
        className="absolute top-5 left-5 right-5 h-px bg-current opacity-30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
      />
      <p className="relative font-display text-xl tracking-tight">{brand.name}</p>
      <p className="relative text-xs mt-1 opacity-80">{brand.tagline}</p>
    </div>
  );
}

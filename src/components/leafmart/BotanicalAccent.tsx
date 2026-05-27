import { cn } from "@/lib/utils/cn";

/**
 * Decorative botanical composition rendered behind the Leafmart hero.
 * Pure SVG, single-color, scale-independent. Adds visual weight without
 * photography and stays on-brand with the LeafSprig ornament system.
 */
export function BotanicalAccent({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "corner";
}) {
  if (variant === "corner") {
    return (
      <svg
        viewBox="0 0 160 160"
        fill="none"
        aria-hidden="true"
        className={cn("text-accent/15", className)}
      >
        <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 140 Q 80 90 140 40" />
          <path d="M40 130 Q 80 100 120 60" />
          <path d="M60 135 Q 85 110 110 80" />
          <path d="M36 131 l -4 -5 m 0 0 l 6 -2" />
          <path d="M56 121 l -4 -5 m 0 0 l 6 -2" />
          <path d="M76 111 l -4 -5 m 0 0 l 6 -2" />
          <path d="M96 96 l -4 -5 m 0 0 l 6 -2" />
          <path d="M116 81 l -4 -5 m 0 0 l 6 -2" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      aria-hidden="true"
      className={cn("text-accent/20", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Main stem — from bottom-right rising up-and-left */}
        <path d="M430 470 C 380 400 340 320 320 240 C 310 180 320 130 350 70" />

        {/* Secondary stem, mirrored */}
        <path d="M430 470 C 400 420 380 360 380 300" />

        {/* Leaf clusters on main stem — three pairs */}
        <path d="M340 180 C 320 178 300 170 282 155 C 302 152 322 158 340 172 Z" />
        <path d="M340 180 C 360 178 380 170 398 155 C 378 152 358 158 340 172 Z" />

        <path d="M328 244 C 308 242 288 234 270 219 C 290 216 310 222 328 236 Z" />
        <path d="M328 244 C 348 242 368 234 386 219 C 366 216 346 222 328 236 Z" />

        <path d="M322 320 C 302 318 282 310 264 295 C 284 292 304 298 322 312 Z" />
        <path d="M322 320 C 342 318 362 310 380 295 C 360 292 340 298 322 312 Z" />

        {/* Small buds */}
        <circle cx="350" cy="70" r="3" fill="currentColor" stroke="none" />
        <circle cx="360" cy="90" r="2" fill="currentColor" stroke="none" />
        <circle cx="345" cy="95" r="1.6" fill="currentColor" stroke="none" />

        {/* Soft radial wash — very low opacity */}
        <circle
          cx="360"
          cy="160"
          r="140"
          fill="currentColor"
          stroke="none"
          opacity="0.06"
        />
      </g>
    </svg>
  );
}

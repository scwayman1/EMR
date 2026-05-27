import { cn } from "@/lib/utils/cn";

/**
 * The Leafmart Promise seal — used on the trust strip, checkout
 * confirmation, and any surface where "this is physician-curated"
 * needs a visual anchor. Modeled as a wax-seal medallion with a leaf
 * sprig inside.
 *
 * Paired with `shadow-seal` from tailwind.config.ts for the pressed-in
 * feel.
 */
export function TrustSeal({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-label="The Leafmart Promise"
      className={cn("drop-shadow-sm", className)}
    >
      <defs>
        <radialGradient id="leafmart-seal-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2F6B4C" />
          <stop offset="55%" stopColor="#1F4D37" />
          <stop offset="100%" stopColor="#0E3225" />
        </radialGradient>
      </defs>
      {/* Deckled outer ring */}
      <circle
        cx="40"
        cy="40"
        r="36"
        fill="url(#leafmart-seal-grad)"
        stroke="#0E3225"
        strokeWidth="1.5"
      />
      {/* Inner deckle */}
      <circle
        cx="40"
        cy="40"
        r="30"
        fill="none"
        stroke="#D4B254"
        strokeWidth="0.8"
        strokeDasharray="1.5 2"
        opacity="0.5"
      />
      {/* Inner solid ring */}
      <circle
        cx="40"
        cy="40"
        r="28"
        fill="none"
        stroke="#D4B254"
        strokeWidth="1"
        opacity="0.6"
      />
      {/* Arc text — Leafmart curved above */}
      <path
        id="leafmart-seal-top"
        d="M 18 38 A 22 22 0 0 1 62 38"
        fill="none"
      />
      <text fill="#F4E7CA" fontSize="7" letterSpacing="3" fontWeight="500">
        <textPath href="#leafmart-seal-top" startOffset="14%">
          LEAFMART
        </textPath>
      </text>
      {/* Center leaf mark */}
      <g transform="translate(40 44)" fill="none" stroke="#F4E7CA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0 -7 C 5 -3, 5 4, 0 10 C -5 4, -5 -3, 0 -7 Z" />
        <path d="M 0 -5 L 0 9" />
        <path d="M 0 -2 L -2.8 -3 M 0 -2 L 2.8 -3 M 0 2 L -3 1 M 0 2 L 3 1 M 0 5 L -3 4 M 0 5 L 3 4" />
      </g>
      {/* Arc text — PROMISE curved below */}
      <path
        id="leafmart-seal-bottom"
        d="M 18 48 A 22 22 0 0 0 62 48"
        fill="none"
      />
      <text fill="#F4E7CA" fontSize="6" letterSpacing="4" fontWeight="500">
        <textPath href="#leafmart-seal-bottom" startOffset="20%">
          PHYSICIAN CURATED
        </textPath>
      </text>
    </svg>
  );
}

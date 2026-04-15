import * as React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

function makeIcon(
  displayName: string,
  path: React.ReactNode,
  viewBox = "0 0 20 20"
) {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 20, className, ...props }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {path}
      </svg>
    )
  );
  Icon.displayName = displayName;
  return Icon;
}

/** Single cannabis fan leaf (simplified 5-finger) */
export const LeafIcon = makeIcon(
  "LeafIcon",
  <>
    <path d="M10 18V10" />
    <path d="M10 10C10 10 6 9 4 5C6.5 5.5 8.5 7 10 10Z" />
    <path d="M10 10C10 10 14 9 16 5C13.5 5.5 11.5 7 10 10Z" />
    <path d="M10 10C10 10 7 7.5 3 7C5 8.5 7.5 9.5 10 10Z" />
    <path d="M10 10C10 10 13 7.5 17 7C15 8.5 12.5 9.5 10 10Z" />
    <path d="M10 10C10 10 10 6 10 2C10 6 10 10 10 10Z" />
  </>
);

/** Full cannabis plant with pot */
export const PlantIcon = makeIcon(
  "PlantIcon",
  <>
    <path d="M10 18V11" />
    <path d="M10 11C10 11 7 10 5 7C7 7.5 9 9 10 11Z" />
    <path d="M10 11C10 11 13 10 15 7C13 7.5 11 9 10 11Z" />
    <path d="M10 8C10 8 10 5 10 3C10 5 10 8 10 8Z" />
    <rect x="7" y="16" width="6" height="3" rx="0.5" />
    <path d="M6.5 16H13.5L13 19H7L6.5 16Z" />
  </>
);

/** Dropper / tincture bottle */
export const TinctureIcon = makeIcon(
  "TinctureIcon",
  <>
    <rect x="7" y="8" width="6" height="9" rx="1" />
    <path d="M8 8V6.5C8 6.22 8.22 6 8.5 6H11.5C11.78 6 12 6.22 12 6.5V8" />
    <path d="M10 6V3" />
    <circle cx="10" cy="2.5" r="0.5" fill="currentColor" stroke="none" />
    <path d="M9 12L10 14.5L11 12" />
  </>
);

/** Cannabis flower / bud */
export const FlowerIcon = makeIcon(
  "FlowerIcon",
  <>
    <ellipse cx="10" cy="9" rx="3.5" ry="4.5" />
    <path d="M10 13.5V18" />
    <path d="M8 7.5C8 7.5 6.5 6 5 6.5" />
    <path d="M12 7.5C12 7.5 13.5 6 15 6.5" />
    <path d="M8.5 10C8.5 10 6.5 10.5 5.5 9.5" />
    <path d="M11.5 10C11.5 10 13.5 10.5 14.5 9.5" />
    <path d="M10 4.5C10 4.5 10 3 10 2" />
  </>
);

/** Crescent moon — sleep */
export const SleepIcon = makeIcon(
  "SleepIcon",
  <>
    <path d="M15 12.5C14 14.5 12 16 9.5 16C6.46 16 4 13.54 4 10.5C4 8 5.5 6 7.5 5C6.5 7 7 9.5 9 11.5C11 13.5 13.5 13.5 15 12.5Z" />
    <circle cx="14" cy="5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="7.5" r="0.4" fill="currentColor" stroke="none" />
  </>
);

/** Lightning bolt — pain */
export const PainIcon = makeIcon(
  "PainIcon",
  <>
    <path d="M11 2L5 11H10L9 18L15 9H10L11 2Z" />
  </>
);

/** Wavy lines / brain — anxiety */
export const AnxietyIcon = makeIcon(
  "AnxietyIcon",
  <>
    <path d="M4 6C6 4 8 8 10 6C12 4 14 8 16 6" />
    <path d="M4 10C6 8 8 12 10 10C12 8 14 12 16 10" />
    <path d="M4 14C6 12 8 16 10 14C12 12 14 16 16 14" />
  </>
);

/** Awareness ribbon — cancer */
export const CancerIcon = makeIcon(
  "CancerIcon",
  <>
    <path d="M10 8C10 8 6 3 4.5 4.5C3 6 6 8 10 12C14 8 17 6 15.5 4.5C14 3 10 8 10 8Z" />
    <path d="M10 12V18" />
  </>
);

/** Flame — fire */
export const FireIcon = makeIcon(
  "FireIcon",
  <>
    <path d="M10 2C10 2 5 8 5 12C5 14.76 7.24 17 10 17C12.76 17 15 14.76 15 12C15 8 10 2 10 2Z" />
    <path d="M10 17C10 17 8 15 8 13C8 11 10 10 10 10C10 10 12 11 12 13C12 15 10 17 10 17Z" />
  </>
);

/** Water drop */
export const DropIcon = makeIcon(
  "DropIcon",
  <>
    <path d="M10 2C10 2 5 9 5 13C5 15.76 7.24 18 10 18C12.76 18 15 15.76 15 13C15 9 10 2 10 2Z" />
  </>
);

// EMR-277: shared cannabis-leaf icon used for ratings and decorative
// callouts. Single source of truth so we don't drift between callers.

interface Props {
  size?: number;
  /** Filled (solid) vs outlined. Defaults to filled. */
  filled?: boolean;
  className?: string;
}

const PATH =
  "M12 2C12 2 10 6 8 8C6 10 4 11 2 11C4 13 6 13 8 14C6 16 5 18 5 21C7 19 9 18 11 17C11 19 11 21 12 22C13 21 13 19 13 17C15 18 17 19 19 21C19 18 18 16 16 14C18 13 20 13 22 11C20 11 18 10 16 8C14 6 12 2 12 2Z";

export function LeafIcon({ size = 16, filled = true, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path
        d={PATH}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

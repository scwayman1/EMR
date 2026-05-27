import { cn } from "@/lib/utils/cn";
import type { ProductFormat } from "@/lib/marketplace/types";

interface FormatIconProps {
  format: ProductFormat;
  size?: number;
  className?: string;
}

/**
 * Per-format inline SVG iconography for Leafmart.
 *
 * Every icon is drawn at 24x24 on a 2px grid with a consistent stroke
 * weight (1.25) and no fill, so they read as a family. Intent is
 * editorial / pharmacy-window, not pictogram clipart.
 */
export function FormatIcon({ format, size = 24, className }: FormatIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("shrink-0", className),
  };

  switch (format) {
    case "tincture":
      // Dropper bottle with dropper bulb
      return (
        <svg {...common}>
          <path d="M9 3.5h6M10 3.5v2.5l-1.2 1.4a3 3 0 0 0-.8 2v8.3a2.3 2.3 0 0 0 2.3 2.3h3.4a2.3 2.3 0 0 0 2.3-2.3V9.4a3 3 0 0 0-.8-2L14 6V3.5" />
          <path d="M9.5 13.5h5" />
          <circle cx="12" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "topical":
      // Jar with flat lid + salve dome
      return (
        <svg {...common}>
          <path d="M5.5 6.5h13v2.3a1.2 1.2 0 0 1-1.2 1.2H6.7A1.2 1.2 0 0 1 5.5 8.8V6.5Z" />
          <path d="M7 10h10v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8Z" />
          <path d="M9 14.5c0-1.4 1.4-2 3-2s3 .6 3 2" />
        </svg>
      );
    case "edible":
      // Gummy / lozenge
      return (
        <svg {...common}>
          <path d="M4.5 12a7.5 7.5 0 0 1 15 0 7.5 7.5 0 0 1-15 0Z" />
          <path d="M8 12a4 4 0 0 1 8 0" />
          <circle cx="10" cy="10" r="0.5" fill="currentColor" stroke="none" />
          <circle cx="14" cy="14" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "capsule":
      // Two-tone capsule on diagonal
      return (
        <svg {...common}>
          <path d="m7.5 16.5 9-9a4 4 0 1 1 5.6 5.6l-9 9A4 4 0 1 1 7.5 16.5Z" transform="translate(-3 -1.2) scale(0.7)" />
          <path d="M9.5 14.5 14.5 9.5" />
        </svg>
      );
    case "vape":
      // Pen with airflow dots
      return (
        <svg {...common}>
          <path d="M5 10.5h11l2 1.5-2 1.5H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1Z" />
          <path d="M17 12h2" />
          <path d="M7 10.5v-2M10 10.5v-2" />
          <circle cx="21" cy="12" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "concentrate":
      // Faceted crystal / shatter
      return (
        <svg {...common}>
          <path d="M12 4 18 8 16 16 12 20 8 16 6 8 Z" />
          <path d="M8 8h8M12 4v16M6 8l6 8M18 8l-6 8" />
        </svg>
      );
    case "patch":
      // Square patch with rounded corners + stitching
      return (
        <svg {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="2" />
          <path d="M4.5 8.5h15M4.5 15.5h15M8.5 4.5v15M15.5 4.5v15" strokeDasharray="1.5 2" />
        </svg>
      );
    case "flower":
      // Cannabis leaf — single, clean, no clichés
      return (
        <svg {...common}>
          <path d="M12 3v18M12 7 C10 9 7.5 9.5 5 9 c 1 2 2 3 4.5 3.5 M12 7 c 2 2 4.5 2.5 7 2 -1 2 -2 3 -4.5 3.5 M12 11 c -1.5 2 -4 2.5 -6.5 2.5 1 1.8 2.5 2.8 4.5 3 M12 11 c 1.5 2 4 2.5 6.5 2.5 -1 1.8 -2.5 2.8 -4.5 3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

"use client";

import { Button } from "@/components/ui/button";

/**
 * Screen-only "Print" button. Opens the browser's print dialog so
 * clinicians can drop a crisp copy of the protocol into their
 * reference binder. The @media print rules in the detail page render
 * the clean black-on-white variant.
 */
export function PrintAction() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
      aria-label="Print protocol"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="opacity-70"
      >
        <rect
          x="3"
          y="1.5"
          width="8"
          height="4"
          rx="0.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect
          x="1.5"
          y="5.5"
          width="11"
          height="5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <rect
          x="3.5"
          y="8.5"
          width="7"
          height="4"
          rx="0.25"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
      Print
    </Button>
  );
}

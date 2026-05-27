"use client";

// Client island for the print button — the parent page is a server
// component (it exports metadata + does no client-only work), so the
// onClick handler has to live in its own tiny client boundary.

export function PrintGuideButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="text-[var(--leaf,#3a7d44)] hover:underline font-medium"
    >
      Print this guide
    </button>
  );
}

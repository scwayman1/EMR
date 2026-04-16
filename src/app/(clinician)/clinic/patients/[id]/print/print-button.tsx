"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="inline-flex items-center justify-center gap-2 rounded-md font-medium h-8 px-3.5 text-sm bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow hover:brightness-110"
    >
      Print chart
    </button>
  );
}

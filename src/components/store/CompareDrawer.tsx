"use client";

// EMR-310 / EMR-303 — "Compare similar items".
//
// Amazon-grade side-by-side comparison. Opens a drawer with the current
// product pinned in the first column and comparable products beside it so
// the shopper can confirm they're getting the right one before paying.
// Used on the PDP and at checkout.

import * as React from "react";
import Link from "next/link";
import { X, Scale, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { formatUSD } from "./cart";
import type { CompareItem } from "./compare-item";

export type { CompareItem } from "./compare-item";

const ROWS: Array<{ label: string; render: (item: CompareItem) => React.ReactNode }> = [
  { label: "Price", render: (i) => formatUSD(i.price) },
  { label: "Rating", render: (i) => <StarRating rating={i.averageRating} reviewCount={i.reviewCount} /> },
  { label: "Format", render: (i) => i.format },
  { label: "THC", render: (i) => (i.thcContent != null ? `${i.thcContent} mg/mL` : "—") },
  { label: "CBD", render: (i) => (i.cbdContent != null ? `${i.cbdContent} mg/mL` : "—") },
  { label: "Onset", render: (i) => i.onsetTime ?? "—" },
  { label: "Duration", render: (i) => i.duration ?? "—" },
  {
    label: "Beginner friendly",
    render: (i) => <BoolCell value={i.beginnerFriendly} />,
  },
  { label: "Lab verified", render: (i) => <BoolCell value={i.labVerified} /> },
];

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <Check width={16} height={16} className="text-accent" />
  ) : (
    <Minus width={16} height={16} className="text-text-subtle" />
  );
}

export function CompareDrawer({
  base,
  similar,
  triggerLabel = "Compare similar items",
  triggerVariant = "secondary",
  triggerSize = "md",
}: {
  base: CompareItem;
  similar: CompareItem[];
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
}) {
  const [open, setOpen] = React.useState(false);
  const items = React.useMemo(() => [base, ...similar].slice(0, 4), [base, similar]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        leadingIcon={<Scale width={16} height={16} />}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Compare similar items"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-t-3xl border border-border bg-surface-raised p-5 shadow-xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight text-text">Compare similar items</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-surface-muted"
                aria-label="Close comparison"
              >
                <X width={18} height={18} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="w-28 p-2 text-left align-bottom" />
                    {items.map((item, idx) => (
                      <th key={item.slug} className="min-w-[120px] p-2 text-left align-bottom">
                        <span className="block text-[11px] uppercase tracking-wide text-text-subtle">
                          {idx === 0 ? "This item" : item.brand}
                        </span>
                        <Link
                          href={`/shop/products/${item.slug}`}
                          className="mt-1 block font-medium text-text hover:text-accent"
                        >
                          {item.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.label} className="border-t border-border/70">
                      <th className="p-2 text-left text-[12px] font-medium text-text-subtle">{row.label}</th>
                      {items.map((item) => (
                        <td key={item.slug} className="p-2 text-text">
                          {row.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

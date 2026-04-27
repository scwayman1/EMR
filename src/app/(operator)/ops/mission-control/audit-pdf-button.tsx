"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * EMR-064 — opens the print-optimized audit log report in a new
 * tab. The destination page auto-fires window.print() on mount
 * so the operator lands directly in their browser's "Save as
 * PDF" dialog. Optional date range narrows the export.
 */
export function AuditPdfButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function exportPdf() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const url =
      "/ops/mission-control/audit-pdf" +
      (params.toString() ? `?${params.toString()}` : "");
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        leadingIcon={
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M7 1v9M3 6l4 4 4-4M2 12h10"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      >
        Download PDF
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-surface shadow-lg p-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-text-subtle mb-3">
              Audit log report
            </p>
            <p className="text-xs text-text-muted mb-3 leading-relaxed">
              Generates a print-formatted view of the audit log. Your
              browser&apos;s print dialog will open — choose &quot;Save as
              PDF&quot; as the destination.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border-strong bg-surface px-2 h-8 text-xs text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border-strong bg-surface px-2 h-8 text-xs text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={exportPdf}>
                Open print view
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

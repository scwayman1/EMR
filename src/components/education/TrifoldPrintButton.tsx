"use client";

// EMR-203 — print + download controls for the trifold reference guide.
// Split into its own client component so the trifold page can stay a
// server component (lighter bundle, better static rendering).

import { Printer, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackGuideDownload } from "@/app/education/actions";

export function TrifoldPrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="self-start"
      size="lg"
    >
      <Printer className="h-4 w-4 mr-2" aria-hidden />
      Print to PDF
    </Button>
  );
}

/**
 * Download the print-ready trifold PDF (hosted under /public/guides) and
 * record the download for the education analytics pipeline.
 */
export function TrifoldDownloadButton() {
  return (
    <a
      href="/guides/leafjourney-trifold-reference-guide.pdf"
      download
      onClick={() => void trackGuideDownload("leafjourney-trifold")}
      className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full border border-border bg-white text-sm font-semibold text-text hover:border-accent hover:text-accent transition-all"
    >
      <Download className="h-4 w-4" aria-hidden />
      Download PDF
    </a>
  );
}

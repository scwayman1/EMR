"use client";

// EMR-203 — print button for the trifold reference guide.
// Split into its own client component so the trifold page can stay a
// server component (lighter bundle, better static rendering).

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

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

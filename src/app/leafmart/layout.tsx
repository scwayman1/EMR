import type { Metadata } from "next";
import { LeafmartHeader } from "@/components/leafmart/LeafmartHeader";
import { LeafmartFooter } from "@/components/leafmart/LeafmartFooter";

export const metadata: Metadata = {
  title: {
    default: "Leafmart — Physician-curated cannabis wellness",
    template: "%s | Leafmart",
  },
  description:
    "The marketplace for physician-curated cannabis wellness products. Every product reviewed for quality, lab verification, and real patient outcomes.",
};

export default function LeafmartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <LeafmartHeader />
      <main className="flex-1">{children}</main>
      <LeafmartFooter />
    </div>
  );
}

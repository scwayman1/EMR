import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Vendor portal — Leafmart",
  description:
    "Vendor analytics and tax documents for Leafmart marketplace sellers — orders, revenue, year-over-year comparisons, and 1099 / W-2 generation.",
};

const NAV = [
  { label: "Overview", href: "/vendor" },
  { label: "Analytics", href: "/vendor/analytics" },
  { label: "Tax documents", href: "/vendor/tax-documents" },
];

// EMR-315 — Vendor portal shell. Matches the owner-side billing suite's
// quiet, card-forward aesthetic: a thin header, generous whitespace, and
// the shared UI primitives throughout.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3 lg:px-12">
          <Link href="/vendor" className="flex items-center gap-2 font-display text-text">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-accent-ink">
              <Store width={18} height={18} />
            </span>
            Vendor portal
          </Link>
          <nav className="flex items-center gap-1 text-[13px]">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-full px-3 py-1.5 font-medium text-text-muted hover:bg-surface-muted hover:text-text"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}

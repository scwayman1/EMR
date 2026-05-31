import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Leaf } from "lucide-react";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow } from "@/components/ui/ornament";
import { StrainFinder } from "@/components/education/StrainFinder";
import { SITE_URL } from "@/lib/seo";

/**
 * EMR-018 — Leafly Strain Database Integration.
 *
 * Public, patient-facing strain finder. Maps common medical issues
 * (sleep, anxiety, insomnia, stress, pain, cancer) to flower strains with
 * terpene + cannabinoid profiles. No login required; no PHI captured.
 */
export const metadata: Metadata = {
  title: "Strain Finder — Match cannabis strains to your symptoms — Leafjourney",
  description:
    "Search flower strains by symptom — sleep, anxiety, pain, stress, and more. See each strain's terpene and cannabinoid profile, backed by the Leafly database.",
  alternates: { canonical: `${SITE_URL}/education/strain-finder` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Strain Finder — Leafjourney",
    description:
      "Match cannabis flower strains to your symptoms with terpene and cannabinoid profiles. No login required.",
    url: `${SITE_URL}/education/strain-finder`,
    siteName: "Leafjourney",
    type: "website",
  },
};

export default function StrainFinderPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main id="main-content">
        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-12 pb-8 lg:pt-16 lg:pb-10">
          <Link
            href="/education"
            className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to Education
          </Link>

          <div className="text-center">
            <Eyebrow className="justify-center mb-5 text-accent">
              <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
              Strain Finder
            </Eyebrow>
          </div>
        </section>

        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pb-24">
          <StrainFinder />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

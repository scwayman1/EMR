import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow } from "@/components/ui/ornament";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Advocacy — Leafjourney",
  description:
    "Leafjourney's home for cannabis advocacy — policy reform, patient access, and the organizations doing the work in our communities.",
  alternates: { canonical: `${SITE_URL}/advocacy` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Advocacy — Leafjourney",
    description:
      "Cannabis advocacy, legislative reform, and the Leafjourney charitable fund.",
    url: `${SITE_URL}/advocacy`,
    siteName: "Leafjourney",
    type: "website",
  },
};

export default function AdvocacyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-16 pb-24 text-center">
        <Eyebrow className="justify-center mb-4">Coming soon</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-text">
          Advocacy
        </h1>
        <p className="text-lg text-text-muted mt-5 max-w-2xl mx-auto leading-relaxed">
          Leafjourney is building a public home for our advocacy work — cannabis
          policy reform, the Leafjourney charitable fund, and a curated registry
          of patient-facing advocacy organizations and medical charities you can
          support directly.
        </p>
        <p className="text-base text-text-muted mt-4 max-w-2xl mx-auto">
          We&apos;ll publish more here as the program comes online.
        </p>

        <Link
          href="/about"
          className="inline-flex items-center mt-10 text-sm text-text-muted hover:text-text transition-colors"
        >
          ← About Leafjourney
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}

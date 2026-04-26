import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * The /education page is a client component (`"use client"`) so it cannot
 * declare its own `metadata`. This layout supplies it, and Next.js merges
 * the per-page metadata with the root layout's defaults.
 */
export const metadata: Metadata = {
  title: "Education — Leafjourney",
  description:
    "ChatCB, the cannabinoid wheel, drug interaction checker, and curated PubMed research — all in one place. Built for clinicians and patients.",
  alternates: { canonical: `${SITE_URL}/education` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Education — Leafjourney",
    description:
      "Conversational cannabis search engine with PubMed integration, terpene/cannabinoid wheel, and drug interaction checker.",
    url: `${SITE_URL}/education`,
    siteName: "Leafjourney",
    type: "website",
  },
};

export default function EducationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

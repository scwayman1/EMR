// Server component — public-facing "Research" tab of the Education section.
// Renders a minimal hero + the <ResearchSearchUI> client shell, which in turn
// invokes the `searchResearch` server action defined in ./actions.ts.

import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { ResearchSearchUI } from "@/components/education/research-search";
import { searchResearch } from "./actions";

export const metadata = {
  title: "Research · Cannabis PubMed Browser · Leafjourney",
  description:
    "Browse peer-reviewed cannabis research from PubMed. Free, no login required.",
};

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="max-w-[1320px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/education"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Education
          </Link>
          <Link
            href="/education/research"
            className="text-sm font-medium text-accent px-3 py-2"
          >
            Research
          </Link>
          <Link
            href="/store"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Store
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Demo</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-8 pb-6 text-center">
        <Eyebrow className="justify-center mb-4">PubMed article browser</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-text">
          Cannabis Research
        </h1>
        <p className="text-lg text-text-muted mt-4 max-w-2xl mx-auto leading-relaxed">
          Search 11,000+ peer-reviewed studies directly from the U.S. National
          Library of Medicine. Free for patients, providers, and researchers.
        </p>
      </div>

      {/* Search UI */}
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-10">
        <ResearchSearchUI search={searchResearch} initialQuery="" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-text-subtle">
        <p>
          Results are sourced from the{" "}
          <a
            href="https://www.ncbi.nlm.nih.gov/pubmed"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text"
          >
            NCBI PubMed
          </a>{" "}
          E-utilities API. Cached up to 1 hour.
        </p>
        <p className="mt-1">
          Information is for educational purposes only — always consult a
          healthcare provider.
        </p>
      </footer>
    </div>
  );
}

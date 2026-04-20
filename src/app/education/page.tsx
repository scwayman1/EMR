import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/ornament";

/**
 * Public-facing Education index.
 *
 * Per CLAUDE.md "Education Tab Structure (on landing page, LEFT of 'Store')":
 *   1. ChatCB         — Conversational cannabis search engine
 *   2. Cannabis Wheel — Interactive cannabinoid/terpene wheel
 *   3. Drug Mix       — Drug interaction checker (public-facing version)
 *   4. Research       — PubMed article browser
 *   5. Learn          — Educational articles
 *
 * This page is the entry point. The five sub-tabs are separate routes
 * scaffolded by sibling agents (/education/chatcb, /education/wheel,
 * /education/drug-mix, /education/research, and /learn).
 *
 * Design: iOS-aesthetic — five large, rounded, touch-friendly cards
 * with a single icon, a clear title, and a short description.
 */

type EducationCard = {
  href: string;
  icon: string;
  badge: string;
  title: string;
  description: string;
  /** Optional accent chip for "priority" / "new" etc. */
  chip?: string;
};

const EDUCATION_CARDS: EducationCard[] = [
  {
    href: "/education/chatcb",
    icon: "\u{1F4AC}", // speech balloon
    badge: "AI",
    title: "ChatCB",
    description:
      "Conversational cannabis search engine. Ask anything about cannabis medicine — answers cite PubMed and our curated research library.",
    chip: "Flagship",
  },
  {
    href: "/education/wheel",
    icon: "\u{1F33F}", // herb
    badge: "Wheel",
    title: "Cannabis Wheel",
    description:
      "Interactive cannabinoid and terpene wheel. Tap to explore therapeutic effects, risks, and the entourage of compounds in the plant.",
  },
  {
    href: "/education/drug-mix",
    icon: "\u{1F48A}", // pill
    badge: "Rx",
    title: "Drug Mix",
    description:
      "Public drug interaction checker. Enter your medications and see how they may interact with THC, CBD, and other cannabinoids.",
  },
  {
    href: "/education/research",
    icon: "\u{1F52C}", // microscope
    badge: "PubMed",
    title: "Research",
    description:
      "Browse 11,000+ peer-reviewed cannabis studies. Filter by cannabinoid, condition, and evidence level — every result is traceable to PubMed.",
  },
  {
    href: "/learn",
    icon: "\u{1F4DA}", // books
    badge: "Learn",
    title: "Learn",
    description:
      "Plain-language educational articles for patients, caregivers, and the curious. Dosing principles, routes of administration, terpenes, and more.",
  },
];

export default function EducationIndexPage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="max-w-[1320px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-0.5 md:gap-1 flex-wrap justify-end">
          <Link
            href="/about"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            About
          </Link>
          <Link
            href="/security"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Security
          </Link>
          <Link
            href="/education"
            className="text-xs md:text-sm font-medium text-accent px-2 md:px-3 py-2"
            aria-current="page"
          >
            Education
          </Link>
          <Link
            href="/store"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Store
          </Link>
          <Link
            href="/login"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Demo</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-10 pb-10 text-center">
        <Eyebrow className="justify-center mb-4">Evidence-based knowledge</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-text leading-[1.05]">
          Cannabis <span className="text-accent italic">Education</span>
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-6 max-w-2xl mx-auto leading-relaxed">
          For patients, providers, and researchers. Search 11,000+ studies,
          explore cannabinoid science, and check drug interactions — all free,
          no login required.
        </p>
      </section>

      {/* Card grid */}
      <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {EDUCATION_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative block rounded-3xl border border-border bg-surface-raised p-7 md:p-8 shadow-sm transition-all hover:shadow-md hover:border-accent/40 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {card.chip && (
                <span className="absolute top-4 right-4 text-[9px] font-semibold uppercase tracking-wider bg-accent text-accent-ink px-2 py-0.5 rounded-full">
                  {card.chip}
                </span>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div
                  className="h-14 w-14 rounded-2xl bg-accent/10 text-2xl flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  {card.icon}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                  {card.badge}
                </span>
              </div>

              <h2 className="font-display text-2xl text-text tracking-tight">
                {card.title}
              </h2>
              <p className="text-sm text-text-muted mt-3 leading-relaxed">
                {card.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-80 group-hover:opacity-100 transition-opacity">
                Open
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-8 text-center text-xs text-text-subtle">
        <p>Leafjourney Education is free for everyone. No login required.</p>
        <p className="mt-1">
          Information is for educational purposes only — always consult a
          healthcare provider.
        </p>
      </footer>
    </div>
  );
}

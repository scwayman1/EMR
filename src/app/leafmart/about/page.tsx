import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "About Leafmart",
  description:
    "Leafmart is the public marketplace for Leafjourney — the AI-native cannabis wellness platform. Every product is physician-curated, lab-verified, and shaped by real patient outcomes.",
};

const PILLARS = [
  {
    title: "Physician curated",
    body: "A practicing clinician reviews every product before it's listed. If we wouldn't recommend it to a patient in clinic, it doesn't end up on Leafmart.",
  },
  {
    title: "Lab verified",
    body: "Third-party Certificate of Analysis is a hard requirement for every listing. Cannabinoid content, terpene profile, and contaminant screening — all on record.",
  },
  {
    title: "Outcome informed",
    body: "Products that help real patients move up in our rankings. Products that don't, quietly move down. The marketplace learns from the clinic.",
  },
] as const;

export default function LeafmartAboutPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 pt-16 pb-10">
        <div className="flex items-center gap-2 text-xs text-text-subtle mb-8">
          <Link href="/leafmart" className="hover:text-text transition-colors">
            Leafmart
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">About</span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 mb-6">
          <LeafSprig size={14} className="text-accent" />
          <span className="text-[11px] uppercase tracking-wider text-text-muted">
            About Leafmart
          </span>
        </div>

        <h1 className="font-display text-[42px] sm:text-5xl md:text-[60px] leading-[1.02] tracking-tight text-text max-w-3xl">
          A cannabis store with{" "}
          <span className="text-accent italic">a clinic</span> behind it.
        </h1>
        <p className="mt-6 text-lg text-text-muted max-w-2xl leading-relaxed">
          Leafmart is the public-facing marketplace for Leafjourney. Leafjourney
          is the AI-native cannabis wellness platform used by clinicians to
          recommend, dose, and track cannabis-assisted therapies. What you buy
          on Leafmart is what those clinicians use in practice.
        </p>
      </section>

      {/* ── The three pillars ──────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-text mb-6">
          How we decide what makes the shelf
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((p) => (
            <Card key={p.title}>
              <CardContent className="pt-6">
                <LeafSprig size={16} className="text-accent mb-4" />
                <h3 className="text-base font-semibold text-text mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {p.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── The founding-partner pledge ────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <div className="rounded-2xl border border-border bg-accent-soft/40 p-8 md:p-12">
          <p className="text-[11px] uppercase tracking-wider text-accent mb-2">
            The founding-partner pledge
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-text">
            10% take rate. 24 months. Weekly payouts.
          </h2>
          <p className="mt-4 text-sm text-text-muted max-w-2xl leading-relaxed">
            Amazon charges 30–40% all-in. Etsy 10%+. We&apos;ve locked our
            first four partners at 10% for 24 months — a promise we keep
            because we&apos;re asking them to trust a platform that doesn&apos;t
            have proof yet. They get every new feature, every new patient, and
            a seat at the table as we shape what Leafmart becomes.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <PledgeStat label="Take rate" value="10%" sub="locked 24 months" />
            <PledgeStat
              label="Payout cadence"
              value="Weekly"
              sub="7-day hold, then paid"
            />
            <PledgeStat
              label="First partners"
              value="4"
              sub="PhytoRx, Flower Powered, AULV, Potency 710"
            />
          </div>
        </div>
      </section>

      {/* ── The clinic behind the store ────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-8 md:gap-12 items-start">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text mb-4">
              The clinic behind the store
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Leafjourney is an EMR — the chart, the prescribing tool, the
              outcome tracker. When a patient logs how they felt after a
              dose, that signal feeds back into what Leafmart recommends next.
            </p>
          </div>
          <ul className="space-y-4 text-sm">
            <ClinicPoint title="Charts are charts.">
              Your clinical data stays with your clinician. Leafmart surfaces
              aggregate outcome signals, never individual records.
            </ClinicPoint>
            <ClinicPoint title="Recommendations are ranked, not sold.">
              Products rise in ranking because patients improve, not because
              a brand paid for placement. We do not sell sponsored slots.
            </ClinicPoint>
            <ClinicPoint title="Vendors see their own numbers, never yours.">
              Brands on Leafmart see their sales, payouts, and reviews.
              They never see your chart, your outcomes, or your identity.
            </ClinicPoint>
          </ul>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-16 text-center">
        <h2 className="font-display text-3xl tracking-tight text-text mb-3">
          Browse what a clinician would pick.
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Free to browse. Sign up to track outcomes and get recommendations
          tailored to what works for you.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/leafmart/products">
            <Button size="lg" variant="primary">
              Browse products
            </Button>
          </Link>
          <Link href="/leafmart/vendors">
            <Button size="lg" variant="secondary">
              Sell on Leafmart
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

function PledgeStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1">
        {label}
      </p>
      <p className="text-2xl font-display text-text tabular-nums">{value}</p>
      <p className="text-[11px] text-text-subtle mt-1">{sub}</p>
    </div>
  );
}

function ClinicPoint({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-accent-soft text-accent shrink-0 mt-0.5"
        aria-hidden="true"
      >
        ✓
      </span>
      <div>
        <p className="text-sm font-semibold text-text mb-1">{title}</p>
        <p className="text-sm text-text-muted leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

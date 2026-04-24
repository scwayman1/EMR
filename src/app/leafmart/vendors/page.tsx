import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeafSprig } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "Partner with Leafmart",
  description:
    "Sell your cannabis wellness products on Leafmart. 10% take rate, 24-month founding-partner lock-in, weekly payouts, clinician-reviewed listings.",
};

const ECONOMICS = [
  { label: "Take rate", value: "10%", sub: "locked 24 months" },
  { label: "Payout cadence", value: "Weekly", sub: "7-day hold" },
  { label: "Reserve", value: "10%", sub: "14-day rolling reserve" },
  { label: "Onboarding", value: "~7 days", sub: "vetting + listing" },
] as const;

const WHAT_YOU_GET = [
  {
    title: "Clinical distribution",
    body: "Your product is recommended inside patient charts, not just browsed in a store. Leafjourney clinicians can suggest your product during an encounter.",
  },
  {
    title: "Outcome ranking",
    body: "As patients log outcomes, products that actually help move up in our ranking engine. A working product doesn't need to buy ads — it wins on evidence.",
  },
  {
    title: "Real-world evidence",
    body: "Aggregated outcome data feeds back to you quarterly. Where your product helps, where it doesn't, and which cohorts respond best.",
  },
  {
    title: "Payment spine + compliance",
    body: "Payabli-backed processing, 1099-K reporting, state shipping matrix, age gating, and FDA claim screening — all handled for you.",
  },
] as const;

const ONBOARDING_STEPS = [
  {
    step: "01",
    title: "Apply",
    body: "Email hello@leafjourney.com with your brand, product lines, and COA links. We respond within 72 hours.",
  },
  {
    step: "02",
    title: "Vet + paperwork",
    body: "We verify insurance, W-9, state licenses, and lab results. You set up your Payabli Pay Point with our help.",
  },
  {
    step: "03",
    title: "List + launch",
    body: "We ingest your catalog, run listings past our clinical reviewer, and go live. Founding partners get a feature slot in the launch week.",
  },
] as const;

const FAQ_SNIPPETS = [
  {
    q: "Do you carry products with delta-9 THC above 0.3%?",
    a: "Only in states where licensed distribution is legal. Hemp-derived (≤ 0.3% delta-9) listings ship broadly; licensed cannabis listings ship intrastate only. Our state matrix enforces this at checkout.",
  },
  {
    q: "Who reviews my listing copy?",
    a: "A practicing clinician plus our FDA-claim screener (regex + clinical review). We'll flag anything that crosses structure/function language and suggest rewrites — we won't silently edit your copy.",
  },
  {
    q: "How are outcomes attributed to my product?",
    a: "When a clinician links a DosingRegimen to your product, subsequent OutcomeLog entries inside that regimen's window count toward your product's efficacy signal. De-identified, cohort-level, consented.",
  },
  {
    q: "Can I leave?",
    a: "Yes. 30-day notice for founding partners, standard partners any time. Reserve disburses on the existing schedule. No clawbacks, no lock-in penalties — we keep you because the platform works.",
  },
] as const;

const APPLY_EMAIL = "hello@leafjourney.com";

export default function LeafmartVendorsPage() {
  const applyHref = `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(
    "Leafmart partner application",
  )}&body=${encodeURIComponent(
    "Brand name:\nWebsite:\nProduct categories:\nStates you currently ship to:\nCOA sample link:\nAnything else we should know:",
  )}`;

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 pt-16 pb-10">
        <div className="flex items-center gap-2 text-xs text-text-subtle mb-8">
          <Link href="/leafmart" className="hover:text-text transition-colors">
            Leafmart
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">Partner with us</span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 mb-6">
          <LeafSprig size={14} className="text-accent" />
          <span className="text-[11px] uppercase tracking-wider text-text-muted">
            For brands
          </span>
          <Badge tone="accent" className="ml-1 text-[10px]">
            Now accepting founding partners
          </Badge>
        </div>

        <h1 className="font-display text-[42px] sm:text-5xl md:text-[60px] leading-[1.02] tracking-tight text-text max-w-3xl">
          Sell cannabis products where they&apos;re{" "}
          <span className="text-accent italic">actually prescribed</span>.
        </h1>
        <p className="mt-6 text-lg text-text-muted max-w-2xl leading-relaxed">
          Leafmart is the marketplace side of an AI-native clinical platform.
          Your product sits inside clinician workflow — not just a search
          result on a store page. And our economics are keystone-fair from day
          one.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={applyHref}>
            <Button size="lg" variant="primary">
              Apply to partner
            </Button>
          </a>
          <Link href="#economics">
            <Button size="lg" variant="secondary">
              See the economics
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Economics tiles ────────────────────────────────── */}
      <section id="economics" className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-text mb-2">
          Founding-partner economics
        </h2>
        <p className="text-sm text-text-muted mb-8 max-w-2xl">
          These terms lock for 24 months from your go-live date. After that,
          you stay on whatever our standard terms are — which will never be
          worse than Shopify and never as punishing as Amazon.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ECONOMICS.map((e) => (
            <div
              key={e.label}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-1">
                {e.label}
              </p>
              <p className="text-2xl font-display text-text tabular-nums">
                {e.value}
              </p>
              <p className="text-[11px] text-text-subtle mt-1">{e.sub}</p>
            </div>
          ))}
        </div>

        {/* Benchmark */}
        <div className="mt-8 rounded-lg border border-border bg-surface-muted/50 p-5">
          <p className="text-[11px] uppercase tracking-wider text-text-subtle mb-3">
            Compared to
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <Benchmark name="Amazon" rate="30-40%" />
            <Benchmark name="Etsy" rate="~10% + ads" />
            <Benchmark name="Shopify" rate="3-5%" />
            <Benchmark name="Leafmart" rate="10% locked" highlight />
          </div>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-text mb-6">
          What you get
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {WHAT_YOU_GET.map((b) => (
            <Card key={b.title}>
              <CardContent className="pt-6">
                <h3 className="text-base font-semibold text-text mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {b.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Onboarding ─────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-text mb-6">
          Onboarding in three steps
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ONBOARDING_STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-lg border border-border bg-surface p-6"
            >
              <p className="font-display text-sm text-accent tracking-[0.2em] mb-3">
                {s.step}
              </p>
              <h3 className="text-base font-semibold text-text mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ snippets ───────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-text mb-6">
          Common questions
        </h2>
        <div className="divide-y divide-border border-y border-border">
          {FAQ_SNIPPETS.map((item) => (
            <details
              key={item.q}
              className="group py-5 [&_summary]:cursor-pointer"
            >
              <summary className="flex items-center justify-between gap-4 list-none">
                <h3 className="text-sm font-semibold text-text">{item.q}</h3>
                <span
                  className="text-xs text-text-subtle group-open:rotate-45 transition-transform"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
        <p className="text-xs text-text-subtle mt-4">
          More on{" "}
          <Link
            href="/leafmart/faq"
            className="underline hover:text-text transition-colors"
          >
            the full FAQ
          </Link>
          .
        </p>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-6 lg:px-12 py-16 text-center">
        <h2 className="font-display text-3xl tracking-tight text-text mb-3">
          Ready to list?
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Reply within 72 hours. Onboarding is ~7 days end-to-end.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={applyHref}>
            <Button size="lg" variant="primary">
              Apply to partner
            </Button>
          </a>
          <Link href="/leafmart/about">
            <Button size="lg" variant="secondary">
              About Leafmart
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-text-subtle mt-6">
          Questions?{" "}
          <a
            href={`mailto:${APPLY_EMAIL}`}
            className="underline hover:text-text transition-colors"
          >
            {APPLY_EMAIL}
          </a>
        </p>
      </section>
    </>
  );
}

function Benchmark({
  name,
  rate,
  highlight,
}: {
  name: string;
  rate: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-3 py-2 ${
        highlight
          ? "bg-accent-soft text-accent font-semibold"
          : "bg-surface text-text-muted"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider">{name}</p>
      <p className="text-sm tabular-nums">{rate}</p>
    </div>
  );
}

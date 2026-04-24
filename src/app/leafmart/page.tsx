import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";
import { PublicProductGrid } from "@/components/leafmart/PublicProductCard";
import { BotanicalAccent } from "@/components/leafmart/BotanicalAccent";
import { TrustSeal } from "@/components/leafmart/TrustSeal";
import { BrandChip } from "@/components/leafmart/BrandChip";
import { FOUNDING_PARTNER_BRANDS } from "@/components/leafmart/formats";
import {
  getPublicFeaturedProducts,
  getPublicClinicianPicks,
} from "@/lib/marketplace/public-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leafmart — Physician-curated cannabis wellness",
};

const VALUE_PROPS = [
  {
    title: "Physician curated",
    body: "Every brand we list is reviewed by our clinical team for quality, ingredients, and real-world patient response.",
  },
  {
    title: "Lab verified",
    body: "Third-party Certificate of Analysis available for every product. If we can't verify it, we don't list it.",
  },
  {
    title: "Outcome informed",
    body: "Our recommendations are shaped by thousands of real patient outcomes across the Leafjourney network.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Browse curated",
    body: "Shop products physicians actually recommend — sorted by evidence, not ad spend.",
  },
  {
    step: "02",
    title: "See the fit",
    body: "Each product shows its cannabinoid profile, typical use cases, and clinician notes.",
  },
  {
    step: "03",
    title: "Track what works",
    body: "Sign up to log outcomes — we'll tailor recommendations as you learn what your body responds to.",
  },
] as const;

export default async function LeafmartHomePage() {
  const [featured, clinicianPicks] = await Promise.all([
    getPublicFeaturedProducts(4),
    getPublicClinicianPicks(3),
  ]);

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Layered ambient wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 18% 30%, var(--highlight-soft), transparent 60%)," +
              "radial-gradient(ellipse 55% 60% at 82% 80%, var(--accent-soft), transparent 60%)",
          }}
        />
        {/* Subtle paper grain */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04] -z-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(31,77,55,.5) 0, transparent 25%), radial-gradient(circle at 75% 60%, rgba(184,120,47,.5) 0, transparent 25%)",
          }}
        />
        <BotanicalAccent
          variant="hero"
          className="hidden md:block absolute -right-12 -top-8 w-[560px] h-[560px] -z-10"
        />

        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-20 pb-24 md:pt-28 md:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 backdrop-blur px-3 py-1 mb-7 shadow-sm">
              <LeafSprig size={14} className="text-accent" />
              <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                Physician-curated cannabis marketplace
              </span>
            </div>
            <h1 className="font-display text-[44px] sm:text-6xl md:text-[72px] leading-[0.96] tracking-tight text-text">
              The cannabis store{" "}
              <span className="text-accent italic">your doctor</span> would send
              you to.
            </h1>
            <p className="mt-7 text-lg text-text-muted max-w-xl leading-relaxed">
              Leafmart is the marketplace side of Leafjourney. Every product is
              clinician-reviewed, lab-verified, and shaped by real patient
              outcomes — so the thing you buy is the thing that actually
              helps.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/leafmart/shop">
                <Button size="lg" variant="primary">
                  Shop by what you need
                </Button>
              </Link>
              <Link href="/leafmart/products">
                <Button size="lg" variant="secondary">
                  See all products
                </Button>
              </Link>
            </div>

            {/* Quiet trust markers */}
            <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 max-w-lg">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">Lab-verified</dt>
                <dd className="font-display text-2xl text-accent mt-0.5">100%</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">Founding partners</dt>
                <dd className="font-display text-2xl text-accent mt-0.5">4</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">Reviewed by</dt>
                <dd className="font-display text-2xl text-accent mt-0.5">MD</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">Take rate</dt>
                <dd className="font-display text-2xl text-accent mt-0.5">10%</dd>
              </div>
            </dl>
          </div>

          {/* Right: trust seal medallion — carries the editorial weight */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-3xl bg-highlight-soft opacity-60" />
              <TrustSeal size={240} className="relative" />
            </div>
          </div>
        </div>

        {/* Quick-browse chip row — anchored to hero bottom */}
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-10 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-subtle mr-1">
            Quick browse
          </span>
          {[
            { label: "Sleep", slug: "sleep" },
            { label: "Pain support", slug: "pain-support" },
            { label: "Calm", slug: "calm" },
            { label: "Focus", slug: "focus" },
            { label: "Recovery", slug: "recovery" },
            { label: "Energy", slug: "energy" },
          ].map((c) => (
            <Link
              key={c.slug}
              href={`/leafmart/category/${c.slug}`}
              className="inline-flex items-center rounded-full border border-border bg-surface/80 backdrop-blur px-3 py-1 text-xs font-medium text-text-muted hover:text-text hover:bg-surface hover:border-border-strong transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Value props ─────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUE_PROPS.map((v) => (
            <div
              key={v.title}
              className="relative rounded-lg border border-border bg-surface p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <LeafSprig size={18} className="text-accent mb-4" />
              <h3 className="font-display text-xl tracking-tight text-text mb-2">
                {v.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Editorial clinician note ────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10">
        <figure className="relative rounded-2xl border border-border bg-surface-muted/50 p-10 md:p-14 overflow-hidden">
          <span
            aria-hidden="true"
            className="absolute -top-16 -right-4 font-display text-[220px] leading-none text-accent-soft select-none"
          >
            &ldquo;
          </span>
          <p className="relative text-[11px] uppercase tracking-[0.2em] text-accent mb-5">
            A note from our care team
          </p>
          <blockquote className="relative">
            <p className="font-display text-2xl md:text-[32px] leading-[1.2] tracking-tight text-text max-w-3xl">
              A good cannabis store doesn&apos;t sell you what&apos;s popular
              — it sells you what&apos;s{" "}
              <em className="text-accent">right</em>. Every product on Leafmart
              is here because one of us would reach for it in clinic. Nothing
              here is paid placement. Nothing here is untested.
            </p>
            <figcaption className="relative mt-6 text-sm text-text-muted flex items-center gap-3">
              <span className="h-px w-10 bg-border-strong" aria-hidden="true" />
              The Leafjourney clinical team
            </figcaption>
          </blockquote>
        </figure>
      </section>

      {/* ── Featured products ───────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-2">
              This week
            </p>
            <h2 className="font-display text-3xl tracking-tight text-text">
              Featured on Leafmart
            </h2>
          </div>
          <Link
            href="/leafmart/products"
            className="hidden sm:inline text-sm text-accent hover:underline"
          >
            See all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-sm text-text-muted">
            No featured products are available right now. Check back soon.
          </p>
        ) : (
          <PublicProductGrid products={featured} columns={4} />
        )}
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-2">
            How it works
          </p>
          <h2 className="font-display text-3xl tracking-tight text-text">
            A cannabis store with the rigor of a medical platform behind it.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.step}
              className="relative rounded-lg border border-border bg-surface p-7 shadow-sm"
            >
              <p className="font-display text-4xl text-accent/70 mb-4 tabular-nums">
                {s.step}
              </p>
              <h3 className="font-display text-lg tracking-tight text-text mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Clinician picks ────────────────────────────────── */}
      {clinicianPicks.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-2">
                What our team reaches for
              </p>
              <h2 className="font-display text-3xl tracking-tight text-text">
                Clinician picks
              </h2>
            </div>
            <Link
              href="/leafmart/category/clinician-picks"
              className="hidden sm:inline text-sm text-accent hover:underline"
            >
              See all picks →
            </Link>
          </div>
          <PublicProductGrid products={clinicianPicks} columns={3} />
        </section>
      )}

      {/* ── Founding partner spotlight ──────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="rounded-2xl border border-border bg-surface p-8 md:p-14 shadow-sm relative overflow-hidden">
          <BotanicalAccent
            variant="corner"
            className="absolute bottom-0 right-0 w-56 h-56 opacity-50"
          />
          <div className="relative max-w-2xl mb-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-highlight mb-2">
              Founding partners
            </p>
            <h2 className="font-display text-3xl tracking-tight text-text">
              Brands we&apos;re building with
            </h2>
            <p className="text-sm text-text-muted mt-3 leading-relaxed">
              Each founding partner is locked in at 10% take rate for 24
              months. A thank-you for trusting an unproven platform with their
              product.
            </p>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
            {FOUNDING_PARTNER_BRANDS.map((b) => (
              <BrandChip key={b.name} brand={b} />
            ))}
          </div>

          <div className="relative mt-10">
            <Link href="/leafmart/vendors">
              <Button size="md" variant="secondary">
                Sell on Leafmart →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20 text-center">
        <TrustSeal size={80} className="mx-auto mb-6" />
        <h2 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-4">
          Buy what your doctor would pick.
        </h2>
        <p className="text-base text-text-muted mb-8 max-w-xl mx-auto leading-relaxed">
          Leafmart is free to browse. Sign up to track outcomes and get
          personalized recommendations as you go.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/leafmart/shop">
            <Button size="lg" variant="primary">
              Shop by what you need
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              Create account
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

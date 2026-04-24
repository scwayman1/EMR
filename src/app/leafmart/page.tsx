import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig } from "@/components/ui/ornament";
import { RatingStars } from "@/components/marketplace/RatingStars";
import {
  getPublicFeaturedProducts,
  getPublicClinicianPicks,
} from "@/lib/marketplace/public-queries";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

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

const FOUNDING_PARTNERS = [
  { name: "PhytoRx", tagline: "CBD + CBG beverages" },
  { name: "Flower Powered", tagline: "Full-spectrum topicals + tinctures" },
  { name: "AULV", tagline: "Plant-powered wellness" },
  { name: "Potency 710", tagline: "Gold Skin Serum" },
] as const;

export default async function LeafmartHomePage() {
  const [featured, clinicianPicks] = await Promise.all([
    getPublicFeaturedProducts(4),
    getPublicClinicianPicks(3),
  ]);

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 85% 5%, var(--highlight-soft), transparent 65%)," +
              "radial-gradient(ellipse 50% 60% at 5% 85%, var(--accent-soft), transparent 60%)",
          }}
        />
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-24 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 mb-6">
              <LeafSprig size={14} className="text-accent" />
              <span className="text-[11px] uppercase tracking-wider text-text-muted">
                Physician-curated cannabis marketplace
              </span>
            </div>
            <h1 className="font-display text-[42px] sm:text-5xl md:text-6xl lg:text-[68px] leading-[0.98] tracking-tight text-text">
              The cannabis store{" "}
              <span className="text-accent italic">your doctor</span>
              <br />
              would send you to.
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-xl leading-relaxed">
              Leafmart is the marketplace side of Leafjourney. Every product is
              clinician-reviewed, lab-verified, and shaped by real patient
              outcomes — so the thing you buy is the thing that actually
              helps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/leafmart/products">
                <Button size="lg" variant="primary">
                  Browse products
                </Button>
              </Link>
              <Link href="/leafmart/about">
                <Button size="lg" variant="secondary">
                  How it works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VALUE_PROPS.map((v) => (
            <Card key={v.title} tone="ambient">
              <CardContent className="py-7">
                <LeafSprig size={18} className="text-accent mb-4" />
                <h3 className="text-base font-semibold text-text mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {v.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Featured products ──────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Featured
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Products we&apos;re particularly excited about right now.
            </p>
          </div>
          <Link
            href="/leafmart/products"
            className="text-sm text-accent hover:underline hidden sm:inline"
          >
            See all →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="text-sm text-text-muted">
            No featured products are available right now. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((p) => (
              <PublicProductPreview
                key={p.id}
                slug={p.slug}
                name={p.name}
                brand={p.brand}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                format={p.format}
                averageRating={p.averageRating}
                reviewCount={p.reviewCount}
                clinicianPick={p.clinicianPick}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-text">
            How Leafmart works
          </h2>
          <p className="text-sm text-text-muted mt-2">
            A cannabis store with the rigor of a medical platform behind it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s) => (
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

      {/* ── Clinician picks strip ──────────────────────────── */}
      {clinicianPicks.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-text">
                Clinician picks
              </h2>
              <p className="text-sm text-text-muted mt-1">
                What our care team reaches for first.
              </p>
            </div>
            <Link
              href="/leafmart/category/clinician-picks"
              className="text-sm text-accent hover:underline hidden sm:inline"
            >
              See all picks →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clinicianPicks.map((p) => (
              <PublicProductPreview
                key={p.id}
                slug={p.slug}
                name={p.name}
                brand={p.brand}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                format={p.format}
                averageRating={p.averageRating}
                reviewCount={p.reviewCount}
                clinicianPick={p.clinicianPick}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Founding partner spotlight ─────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="rounded-2xl border border-border bg-accent-soft/40 p-8 md:p-12">
          <div className="max-w-2xl mb-8">
            <p className="text-[11px] uppercase tracking-wider text-accent mb-2">
              Founding partners
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Brands we&apos;re building with
            </h2>
            <p className="text-sm text-text-muted mt-2">
              Each founding partner is locked in at 10% take-rate for 24
              months. A thank-you for trusting an unproven platform with
              their product.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FOUNDING_PARTNERS.map((p) => (
              <div
                key={p.name}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="font-display text-base text-text">{p.name}</p>
                <p className="text-xs text-text-muted mt-1">{p.tagline}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link href="/leafmart/vendors">
              <Button size="md" variant="secondary">
                Sell on Leafmart →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl tracking-tight text-text mb-4">
            Buy what your doctor would pick.
          </h2>
          <p className="text-sm text-text-muted mb-6">
            Leafmart is free to browse. Sign up to track outcomes and get
            personalized recommendations as you go.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/leafmart/products">
              <Button size="lg" variant="primary">
                Browse products
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

interface PublicProductPreviewProps {
  slug: string;
  name: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  format: string;
  averageRating: number;
  reviewCount: number;
  clinicianPick: boolean;
}

function PublicProductPreview({
  slug,
  name,
  brand,
  price,
  compareAtPrice,
  format,
  averageRating,
  reviewCount,
  clinicianPick,
}: PublicProductPreviewProps) {
  const formatLabel =
    FORMAT_LABELS[format as keyof typeof FORMAT_LABELS] ?? format;
  return (
    <Link
      href={`/leafmart/products/${slug}`}
      className="group rounded-lg border border-border bg-surface overflow-hidden transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className="aspect-[4/3] bg-surface-muted flex items-center justify-center">
        <span className="text-sm font-medium text-text-subtle tracking-wide capitalize">
          {formatLabel}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs uppercase tracking-wider text-text-subtle truncate">
            {brand}
          </p>
          {clinicianPick && (
            <Badge tone="accent" className="shrink-0 text-[10px]">
              Pick
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-text group-hover:text-accent transition-colors line-clamp-2 min-h-[2.5rem]">
          {name}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm font-semibold text-text">
            ${price.toFixed(2)}
          </span>
          {compareAtPrice != null && compareAtPrice > price && (
            <span className="text-xs text-text-subtle line-through">
              ${compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {reviewCount > 0 && (
          <div className="mt-2">
            <RatingStars rating={averageRating} count={reviewCount} />
          </div>
        )}
      </div>
    </Link>
  );
}

// /marketplace/products/[slug] — product detail page.
//
// Closes the 33 dead links that find-and-fix pass 6 surfaced: every
// product card on /marketplace had `<Link href="/marketplace/products/<slug>">`
// but this route did not exist, so every product click returned 404.
//
// Reuses src/lib/marketplace/data — the same source of truth /marketplace
// reads from for the listing. No new schema, no new endpoint; just the
// page that was always supposed to exist.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PRODUCTS,
  getProductBySlug,
  getRelatedProducts,
  getCategoryBySlug,
} from "@/lib/marketplace/data";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Leaf, Award, AlertTriangle } from "lucide-react";

export const revalidate = 3600;

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = getProductBySlug(params.slug);
  if (!product) return { title: "Product not found — Marketplace" };
  return {
    title: `${product.name} — ${product.brand} — Marketplace`,
    description: product.shortDescription || product.description.slice(0, 160),
  };
}

function formatCents(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}

export default function MarketplaceProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const related = getRelatedProducts(product.id, 3);
  const primaryCategory = product.useCases[0]
    ? getCategoryBySlug(product.useCases[0])
    : null;

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main id="main-content" className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-10 pb-20">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to marketplace
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Visual */}
          <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-accent-soft via-surface to-highlight-soft flex items-center justify-center">
            <span className="font-display text-8xl text-accent/60 select-none">
              {product.brand[0]}
            </span>
          </div>

          {/* Body */}
          <div>
            <Eyebrow className="mb-3">{product.brand}</Eyebrow>
            <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight mb-4 leading-tight">
              {product.name}
            </h1>
            <p className="text-lg text-text-muted leading-relaxed mb-6">
              {product.description}
            </p>

            <div className="flex flex-wrap items-baseline gap-3 mb-6">
              <span className="font-display text-3xl text-text">
                {formatCents(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-text-subtle line-through">
                  {formatCents(product.compareAtPrice)}
                </span>
              )}
              {!product.inStock && (
                <Badge tone="warning">Out of stock</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              {product.clinicianPick && (
                <Badge tone="success" className="gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Clinician pick
                </Badge>
              )}
              {product.labVerified && (
                <Badge tone="info" className="gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Lab verified
                </Badge>
              )}
              {product.beginnerFriendly && (
                <Badge tone="accent" className="gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Beginner-friendly
                </Badge>
              )}
              {product.requires21Plus && (
                <Badge tone="warning" className="gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> 21+
                </Badge>
              )}
            </div>

            {product.clinicianNote && (
              <div className="mb-8 p-5 bg-accent-soft/40 border border-accent/20 rounded-2xl">
                <p className="text-[11px] uppercase tracking-[0.14em] text-accent font-semibold mb-2">
                  Clinician&apos;s note
                </p>
                <p className="text-sm text-text leading-relaxed italic">
                  &ldquo;{product.clinicianNote}&rdquo;
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href={`/leafmart/products/${product.slug}`}>
                <Button size="lg">View on Leafmart</Button>
              </Link>
              {product.coaUrl && (
                <Link
                  href={product.coaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="lg">
                    View COA (lab results)
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <EditorialRule />

        <div className="grid md:grid-cols-2 gap-10 my-12">
          <div>
            <h2 className="font-display text-2xl text-text mb-4">Use cases</h2>
            <ul className="space-y-2 text-text-muted">
              {product.useCases.length > 0 ? (
                product.useCases.map((u) => (
                  <li key={u} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">·</span>
                    {primaryCategory && u === primaryCategory.slug
                      ? primaryCategory.name
                      : u}
                  </li>
                ))
              ) : (
                <li className="text-text-subtle italic">Not specified</li>
              )}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-text mb-4">Profile</h2>
            <dl className="space-y-2 text-sm">
              {product.thcContent !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">THC</dt>
                  <dd className="font-medium text-text">{product.thcContent}mg</dd>
                </div>
              )}
              {product.cbdContent !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">CBD</dt>
                  <dd className="font-medium text-text">{product.cbdContent}mg</dd>
                </div>
              )}
              {product.cbnContent !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">CBN</dt>
                  <dd className="font-medium text-text">{product.cbnContent}mg</dd>
                </div>
              )}
              {product.format && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Format</dt>
                  <dd className="font-medium text-text">{product.format}</dd>
                </div>
              )}
              {product.onsetTime && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Onset</dt>
                  <dd className="font-medium text-text">{product.onsetTime}</dd>
                </div>
              )}
              {product.duration && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Duration</dt>
                  <dd className="font-medium text-text">{product.duration}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {product.dosageGuidance && (
          <div className="mb-12 p-6 bg-surface-muted/50 rounded-2xl border border-border">
            <h2 className="font-display text-xl text-text mb-3">Dosing guidance</h2>
            <p className="text-sm text-text-muted leading-relaxed">
              {product.dosageGuidance}
            </p>
          </div>
        )}

        {related.length > 0 && (
          <>
            <EditorialRule />
            <h2 className="font-display text-2xl text-text mb-6 mt-12">
              Related products
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/marketplace/products/${r.slug}`}
                  className="group block bg-surface-raised border border-border rounded-2xl p-5 hover:border-accent/40 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium mb-1">
                    {r.brand}
                  </p>
                  <h3 className="font-display text-base text-text tracking-tight leading-tight group-hover:text-accent transition-colors">
                    {r.name}
                  </h3>
                  <p className="text-[12px] text-text-muted leading-relaxed mt-2 line-clamp-2">
                    {r.shortDescription}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

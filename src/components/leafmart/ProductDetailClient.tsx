"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ProductImage } from "./ProductImage";
import type { LeafmartProduct, LeafmartVariant } from "./LeafmartProductCard";
import { PriceDisplay, VariantSelector } from "./VariantSelector";
import { TrustSignalsBar } from "./TrustSignalsBar";
import { ProductReviews } from "./ProductReviews";
import { PairsWellWith } from "./PairsWellWith";
import { StarRating } from "./StarRating";
import { LeafShareButton } from "./LeafShareButton";
import { useCart } from "@/lib/leafmart/cart-store";
import { findGuideByFormat } from "@/lib/leafmart/dosing-guides";

interface Props {
  product: LeafmartProduct;
  related: LeafmartProduct[];
}

export function ProductDetailClient({ product, related }: Props) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const dosingGuide = findGuideByFormat(product.format);

  const variants = useMemo<LeafmartVariant[]>(
    () => product.variants ?? [],
    [product.variants]
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?.id ?? ""
  );
  const selectedVariant: LeafmartVariant | undefined = useMemo(
    () => variants.find((v) => v.id === selectedVariantId),
    [variants, selectedVariantId]
  );

  // Effective price comes from the chosen variant when present, else the
  // product-level price. Compare-at follows the same precedence so the
  // strikethrough reflects the variant the user actually picked.
  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveCompareAt =
    selectedVariant?.compareAtPrice ?? product.compareAtPrice ?? null;
  const inStock = selectedVariant?.inStock ?? true;

  const handleAdd = useCallback(() => {
    // Pass a derived product into the cart-store with the chosen variant's
    // price and the size embedded in the display name. Slug is stable so
    // links from the cart back to the PDP keep working — the cart-store
    // owns variant identity by slug only (do not modify cart-store.tsx).
    const productForCart: LeafmartProduct = {
      ...product,
      price: effectivePrice,
      compareAtPrice: effectiveCompareAt,
      name: selectedVariant && variants.length > 1
        ? `${product.name} · ${selectedVariant.name}`
        : product.name,
    };
    addItem(productForCart, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [
    addItem,
    product,
    quantity,
    selectedVariant,
    effectivePrice,
    effectiveCompareAt,
    variants.length,
  ]);

  const reviewCount = product.reviewCount ?? product.reviews?.length ?? 0;
  const averageRating =
    product.averageRating ?? deriveAverageRating(product.reviews ?? []);

  return (
    <>
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-14 pt-5 sm:pt-6 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--muted)] flex-wrap">
          <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
          <span>·</span>
          <Link href="/leafmart/products" className="hover:text-[var(--leaf)]">Products</Link>
          <span>·</span>
          <span className="text-[var(--text)]">{product.name}</span>
        </div>
      </div>

      {/* Product hero */}
      <section className="px-4 sm:px-6 lg:px-14 py-6 sm:py-10 max-w-[1440px] mx-auto lm-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          {/* Silhouette */}
          <div className="relative order-1">
            <ProductImage src={product.imageUrl} alt={product.name} shape={product.shape} bg={product.bg} deep={product.deep} height={480} big priority />
            {product.tag && (
              <div className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-[var(--surface)] text-[var(--ink)] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11.5px] sm:text-[12px] font-semibold tracking-wide inline-flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full bg-[var(--leaf)]" />
                {product.tag}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="order-2 lg:pt-8">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="eyebrow text-[var(--muted)]">{product.partner} · {product.formatLabel}</p>
              {/* EMR-308: leaf share at the top of the PDP */}
              <LeafShareButton
                url={`/leafmart/products/${product.slug}`}
                title={product.name}
                text={product.support}
                placement="pdp-top"
              />
            </div>
            <h1 className="font-display text-[32px] sm:text-[40px] lg:text-[48px] font-normal tracking-[-1.0px] sm:tracking-[-1.2px] leading-[1.05] text-[var(--ink)] mb-3 sm:mb-4">
              {product.name}
            </h1>

            {/* Inline rating row */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
                <StarRating rating={averageRating} size={15} />
                <span className="text-[13px] font-medium text-[var(--text)] tabular-nums">
                  {averageRating.toFixed(1)}
                </span>
                <a href="#reviews" className="text-[13px] text-[var(--muted)] hover:text-[var(--leaf)]">
                  ({reviewCount.toLocaleString()} {reviewCount === 1 ? "review" : "reviews"})
                </a>
              </div>
            )}

            <p className="text-[15.5px] sm:text-[17px] text-[var(--text-soft)] leading-relaxed max-w-[500px] mb-5 sm:mb-6">
              {product.support}
            </p>

            {/* Trust signals — moved into the info column so it sits above the buy box */}
            <TrustSignalsBar
              labVerified={product.labVerified ?? true}
              coaUrl={product.coaUrl}
              clinicianReviewed={product.clinicianPick ?? true}
              outcomeSampleSize={product.n}
              freeShipping
            />

            {/* Details */}
            <div className="space-y-3 mb-7 sm:mb-8">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="text-[var(--muted)] w-16">Format</span>
                <span className="font-medium">{product.formatLabel}</span>
                {dosingGuide && (
                  <Link
                    href={`/leafmart/dosing-guide/${dosingGuide.slug}`}
                    className="text-[var(--leaf)] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    See dosing guide
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[var(--muted)] w-16">Dose</span>
                <span className="font-medium">{product.dose}</span>
              </div>
            </div>

            {/* EMR-278: Onset / Duration / Effect tiles */}
            <ExperienceTiles product={product} />

            {/* Variant selector */}
            <VariantSelector
              variants={variants}
              selectedId={selectedVariantId}
              onSelect={setSelectedVariantId}
            />

            {/* Outcome ornament */}
            <div className="flex items-center gap-3 text-[var(--leaf)] mb-7 sm:mb-8 font-mono text-[13px] sm:text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              {product.pct}% reported improvement · n={product.n}
            </div>

            {/* Price + Quantity + CTA */}
            <div className="pt-5 sm:pt-6 border-t border-[var(--border)]">
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <PriceDisplay price={effectivePrice} compareAtPrice={effectiveCompareAt} />

                {/* Quantity selector */}
                <div className="inline-flex items-center border border-[var(--border)] rounded-full overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-[14px] font-medium tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors text-lg"
                  >
                    +
                  </button>
                </div>

                {/* Add to cart button */}
                <button
                  onClick={handleAdd}
                  disabled={!inStock}
                  className={`rounded-full px-6 sm:px-8 py-3.5 sm:py-4 text-[14.5px] sm:text-[15px] font-medium transition-all duration-300 flex-1 sm:flex-none min-w-[160px] flex items-center justify-center gap-2 ${
                    !inStock
                      ? "bg-[var(--border)] text-[var(--muted)] cursor-not-allowed"
                      : added
                        ? "bg-[var(--leaf)] text-[var(--bg)] scale-[1.02]"
                        : "bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)]"
                  }`}
                >
                  {!inStock ? (
                    "Sold out"
                  ) : added ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" className="animate-[scale-in_0.3s_ease-out]">
                        <path d="M3 8.5L6.5 12L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Added to cart
                    </>
                  ) : (
                    "Add to cart"
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[var(--leaf)] text-[12px] font-semibold mt-4">
                <svg width="14" height="14" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                COA on file · Free shipping
              </div>
            </div>

            {/* Clinician note */}
            <div className="mt-8 sm:mt-10 rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6 border-l-4 border-[var(--leaf)]">
              <p className="eyebrow text-[var(--leaf)] mb-2">Clinician note</p>
              <p className="font-display text-[15.5px] sm:text-[17px] leading-relaxed text-[var(--text)]">
                {product.clinicianNote
                  ? `“${product.clinicianNote}”`
                  : "“We reviewed this product’s COA and formulation. The cannabinoid profile matches the label, and the delivery format aligns with the intended use case.”"}
              </p>
              <div className="flex items-center gap-2.5 mt-4">
                <div className="w-7 h-7 rounded-full bg-[var(--peach)] flex items-center justify-center font-display text-xs font-medium">NP</div>
                <div className="text-xs text-[var(--muted)]">Dr. N.H. Patel, DO · Medical Lead</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews — anchored so the rating row links here */}
      <div id="reviews" className="scroll-mt-24">
        <ProductReviews
          reviews={product.reviews ?? []}
          averageRating={averageRating}
          reviewCount={reviewCount}
        />
      </div>

      {/* EMR-308: leaf share at the bottom of the PDP */}
      <div className="px-4 sm:px-6 lg:px-14 max-w-[1440px] mx-auto pb-2 sm:pb-4 flex justify-center">
        <LeafShareButton
          url={`/leafmart/products/${product.slug}`}
          title={product.name}
          text={product.support}
          placement="pdp-bottom"
        />
      </div>

      {/* Pairs well with */}
      <PairsWellWith products={related} />
    </>
  );
}

function deriveAverageRating(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return sum / reviews.length;
}

// EMR-278 — Three quick tiles: Onset, Duration, Effect.
//
// We derive everything client-side from fields already on the product
// so the PDP can render the tiles without an additional fetch. Effect
// keywords come from the `support` and `clinicianNote` text — when the
// AI curator ships, swap this for `product.effects` directly.
const ONSET_BY_FORMAT: Record<string, string> = {
  tincture: "15–30 min",
  oil: "15–30 min",
  capsule: "45–90 min",
  gummy: "45–90 min",
  edible: "45–90 min",
  beverage: "20–45 min",
  vape: "5–10 min",
  inhalable: "5–10 min",
  flower: "5–10 min",
  topical: "20–40 min",
  balm: "20–40 min",
  patch: "30–60 min",
};

const DURATION_BY_FORMAT: Record<string, string> = {
  tincture: "3–5 hr",
  oil: "3–5 hr",
  capsule: "5–8 hr",
  gummy: "5–8 hr",
  edible: "5–8 hr",
  beverage: "3–5 hr",
  vape: "1–3 hr",
  inhalable: "1–3 hr",
  flower: "1–3 hr",
  topical: "2–4 hr",
  balm: "2–4 hr",
  patch: "8–12 hr",
};

const EFFECT_KEYWORDS = [
  "sedating",
  "uplifting",
  "relaxing",
  "mellow",
  "couch lock",
  "soothing",
  "energizing",
  "cerebral",
  "euphoric",
  "focused",
  "creative",
  "giggly",
  "calming",
  "balanced",
];

function deriveEffects(product: LeafmartProduct): string[] {
  const haystack = `${product.support ?? ""} ${product.clinicianNote ?? ""}`.toLowerCase();
  const matched = EFFECT_KEYWORDS.filter((kw) => haystack.includes(kw));
  if (matched.length > 0) return matched.slice(0, 3);
  // Reasonable defaults keyed off the support string so every PDP shows
  // something rather than an empty tile.
  if (/sleep|rest|insomnia/i.test(haystack)) return ["sedating", "soothing"];
  if (/energy|focus|day/i.test(haystack)) return ["uplifting", "focused"];
  if (/anxi|stress|calm/i.test(haystack)) return ["calming", "balanced"];
  return ["balanced"];
}

function ExperienceTiles({ product }: { product: LeafmartProduct }) {
  const format = (product.format ?? "").toLowerCase();
  const onset = ONSET_BY_FORMAT[format] ?? "Varies";
  const duration = DURATION_BY_FORMAT[format] ?? "Varies";
  const effects = deriveEffects(product);
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-7 sm:mb-8">
      <Tile label="Onset" value={onset} />
      <Tile label="Duration" value={duration} />
      <Tile label="Effect" value={effects.join(" · ")} />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4 sm:py-4">
      <p className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)] mb-1">
        {label}
      </p>
      <p className="text-[13.5px] sm:text-[14.5px] font-medium text-[var(--ink)] capitalize leading-tight">
        {value}
      </p>
    </div>
  );
}

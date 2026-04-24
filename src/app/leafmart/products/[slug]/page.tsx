import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars } from "@/components/marketplace/RatingStars";
import { PublicProductGrid } from "@/components/leafmart/PublicProductCard";
import {
  getPublicProductBySlug,
  getAllPublicProducts,
} from "@/lib/marketplace/public-queries";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

interface PDPProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PDPProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.brand}`,
    description: product.shortDescription || product.description.slice(0, 160),
  };
}

export default async function LeafmartProductDetailPage({ params }: PDPProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);
  if (!product) notFound();

  const formatLabel = FORMAT_LABELS[product.format] ?? product.format;
  const strainLabel =
    product.strainType && product.strainType !== "n/a"
      ? product.strainType.charAt(0).toUpperCase() + product.strainType.slice(1)
      : null;

  // Lightweight "you may also like" — share symptoms/goals with the current
  // product, bounded to 4 items. Public-safe (no personalization).
  const related = await getRelatedPublic(product);

  return (
    <div className="max-w-[1080px] mx-auto px-6 lg:px-12 py-12">
      {/* ── Breadcrumb ─────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-subtle">
          <li>
            <Link
              href="/leafmart"
              className="hover:text-text transition-colors"
            >
              Leafmart
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/leafmart/products"
              className="hover:text-text transition-colors"
            >
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-text font-medium truncate max-w-[240px]">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* ── Hero — image + buy card ────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
        <div className="bg-surface-muted rounded-lg aspect-square flex items-center justify-center">
          <span className="text-lg font-medium text-text-subtle tracking-wide capitalize">
            {formatLabel}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-wider text-text-subtle">
            {product.brand}
          </p>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text">
            {product.name}
          </h1>
          {product.reviewCount > 0 && (
            <RatingStars
              rating={product.averageRating}
              count={product.reviewCount}
            />
          )}

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-text tabular-nums">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <span className="text-base text-text-subtle line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
          </div>

          {product.clinicianPick && (
            <div className="rounded-lg bg-accent-soft/60 p-4">
              <Badge tone="accent">Clinician pick</Badge>
              <p className="text-sm text-text leading-relaxed mt-2">
                Our care team selected this product for its quality,
                cannabinoid profile, and documented outcomes. (Clinician
                commentary shown after sign-in.)
              </p>
            </div>
          )}

          {/* Variant pills (display-only on public surface) */}
          {product.variants.length > 1 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-text-subtle">
                Sizes
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, idx) => (
                  <span
                    key={v.id}
                    className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${
                      idx === 0
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface text-text"
                    }`}
                  >
                    {v.name}
                    {v.price !== product.variants[0]?.price && (
                      <span className="ml-1.5 text-text-subtle">
                        ${v.price.toFixed(2)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auth handoff — public surface never wires checkout directly */}
          <div className="mt-2">
            <Link href={`/login?next=${encodeURIComponent(`/portal/shop/products/${product.slug}`)}`}>
              <Button variant="primary" size="lg" className="w-full">
                {product.inStock ? "Sign in to buy" : "Out of stock"}
              </Button>
            </Link>
            <p className="text-[11px] text-text-subtle mt-2 text-center">
              Checkout opens after you sign in — keeps dosing and outcome
              tracking tied to your chart.
            </p>
          </div>

          {/* Trust signals */}
          <ul className="flex flex-col gap-1.5 mt-3">
            {product.labVerified && (
              <TrustLine>Third-party lab verified — COA available.</TrustLine>
            )}
            {product.clinicianPick && (
              <TrustLine>Physician reviewed before listing.</TrustLine>
            )}
            {product.beginnerFriendly && (
              <TrustLine>Beginner-friendly formulation.</TrustLine>
            )}
          </ul>
        </div>
      </section>

      {/* ── Description ─────────────────────────────────── */}
      <section className="space-y-10 mb-14">
        <div>
          <h2 className="text-lg font-semibold text-text mb-3">
            About this product
          </h2>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>

        {/* Cannabinoid profile */}
        {(product.thcContent != null ||
          product.cbdContent != null ||
          product.cbnContent != null ||
          strainLabel) && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold text-text mb-4">
                Cannabinoid profile
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {product.thcContent != null && (
                  <Stat label="THC" value={`${product.thcContent}%`} />
                )}
                {product.cbdContent != null && (
                  <Stat label="CBD" value={`${product.cbdContent}%`} />
                )}
                {product.cbnContent != null && (
                  <Stat label="CBN" value={`${product.cbnContent}%`} />
                )}
                {strainLabel && <Stat label="Strain" value={strainLabel} />}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onset & duration */}
        {(product.onsetTime || product.duration) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {product.onsetTime && (
              <InfoBox title="Onset">{product.onsetTime}</InfoBox>
            )}
            {product.duration && (
              <InfoBox title="Duration">{product.duration}</InfoBox>
            )}
          </div>
        )}

        {/* Use cases */}
        {(product.symptoms.length > 0 || product.goals.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">
              May support
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.symptoms.map((s) => (
                <Badge key={`s-${s}`} tone="neutral">
                  {s}
                </Badge>
              ))}
              {product.goals.map((g) => (
                <Badge key={`g-${g}`} tone="accent">
                  {g}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-text-subtle mt-3">
              Structure/function terms only — not a claim to treat, cure, or
              prevent any disease.
            </p>
          </div>
        )}

        {product.beginnerFriendly && (
          <Badge tone="success" className="text-sm px-3 py-1">
            Beginner-friendly
          </Badge>
        )}

        {product.coaUrl && product.coaUrl !== "#" && (
          <div>
            <Link
              href={product.coaUrl}
              className="text-sm text-accent hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Download Certificate of Analysis →
            </Link>
          </div>
        )}
      </section>

      {/* ── Reviews ─────────────────────────────────────── */}
      {product.reviews.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-semibold text-text">Reviews</h2>
            <RatingStars rating={product.averageRating} />
            <span className="text-sm text-text-muted">
              {product.averageRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
          <div className="space-y-6">
            {product.reviews.map((r) => (
              <div
                key={r.id}
                className="border-b border-border pb-6 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-text">
                    {r.authorName}
                  </span>
                  <RatingStars rating={r.rating} />
                  {r.verified && (
                    <Badge tone="success" className="text-[11px]">
                      Verified purchase
                    </Badge>
                  )}
                  <span className="text-xs text-text-subtle ml-auto">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                {r.title && (
                  <p className="text-sm font-semibold text-text mb-1">
                    {r.title}
                  </p>
                )}
                {r.body && (
                  <p className="text-sm text-text-muted leading-relaxed">
                    {r.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Related ─────────────────────────────────────── */}
      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-text mb-6">
            You may also like
          </h2>
          <PublicProductGrid products={related} columns={4} />
        </section>
      )}
    </div>
  );
}

async function getRelatedPublic(product: {
  id: string;
  symptoms: string[];
  goals: string[];
}) {
  const all = await getAllPublicProducts();
  const targets = new Set([...product.symptoms, ...product.goals]);
  return all
    .filter((p) => p.id !== product.id)
    .map((p) => {
      const shared = [...p.symptoms, ...p.goals].filter((t) => targets.has(t));
      return { p, score: shared.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.p);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold text-text tabular-nums">{value}</p>
      <p className="text-xs text-text-subtle mt-1">{label}</p>
    </div>
  );
}

function InfoBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wider text-text-subtle mb-1">
        {title}
      </p>
      <p className="text-sm font-medium text-text">{children}</p>
    </div>
  );
}

function TrustLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-text-muted">
      <span className="text-success" aria-hidden="true">
        ✓
      </span>
      {children}
    </li>
  );
}

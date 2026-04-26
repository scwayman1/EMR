import "server-only";
import type {
  Product,
  ProductVariant,
  ProductReview,
  MarketplaceCategory,
  Vendor,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  LeafmartProduct,
  LeafmartVariant,
  LeafmartReview,
} from "@/components/leafmart/LeafmartProductCard";
import {
  DEMO_PRODUCTS,
  CATEGORIES as DEMO_CATEGORIES,
  PARTNERS as DEMO_PARTNERS,
} from "@/components/leafmart/demo-data";
import { PRODUCTS as MARKETPLACE_PRODUCTS } from "@/lib/marketplace/data";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

/**
 * Server-side data layer for the Leafmart storefront.
 *
 * Every getter falls back to the curated demo data when the database is
 * empty, unreachable, or returning malformed rows. The storefront must
 * never render a blank shelf because of an infra issue.
 */

export interface LeafmartCategory {
  name: string;
  slug: string;
  sub: string;
  count: number;
  bg: string;
  deep: string;
  shape: LeafmartProduct["shape"];
}

export interface LeafmartPartner {
  name: string;
  desc: string;
  bg: string;
  deep: string;
  shape: LeafmartProduct["shape"];
}

type ProductWithJoins = Product & {
  categoryMappings: Array<{
    category: Pick<MarketplaceCategory, "slug" | "name">;
  }>;
  variants?: ProductVariant[];
  reviews?: ProductReview[];
};

/* ── Visual mappings for derived UI fields ───────────────────── */

/**
 * SHELF_BY_CATEGORY — every Leafmart category gets its own visual world.
 *
 * `deep` uses a `--{name}-stamp` token (defined in globals.css) so the
 * silhouette colour flips for dark mode automatically. Hardcoding hex
 * here would leave silhouettes invisible on dark shelves.
 */
const SHELF_BY_CATEGORY: Record<
  string,
  { bg: string; deep: string; shape: LeafmartProduct["shape"] }
> = {
  // Goals / Symptoms
  sleep:               { bg: "var(--sage)",     deep: "var(--sage-stamp)",     shape: "can" },
  recovery:            { bg: "var(--peach)",    deep: "var(--peach-stamp)",    shape: "tin" },
  calm:                { bg: "var(--butter)",   deep: "var(--butter-stamp)",   shape: "bottle" },
  skin:                { bg: "var(--blush)",    deep: "var(--blush-stamp)",    shape: "serum" },
  focus:               { bg: "var(--sky)",      deep: "var(--sky-stamp)",      shape: "box" },
  anxiety:             { bg: "var(--lavender)", deep: "var(--lavender-stamp)", shape: "bottle" },
  "pain-support":      { bg: "var(--coral)",    deep: "var(--coral-stamp)",    shape: "tin" },
  nausea:              { bg: "var(--seafoam)",  deep: "var(--seafoam-stamp)",  shape: "can" },
  energy:              { bg: "var(--honey)",    deep: "var(--honey-stamp)",    shape: "can" },
  // Formats
  tinctures:           { bg: "var(--lilac)",    deep: "var(--lilac-stamp)",    shape: "bottle" },
  edibles:             { bg: "var(--cream)",    deep: "var(--cream-stamp)",    shape: "box" },
  topicals:            { bg: "var(--stone)",    deep: "var(--stone-stamp)",    shape: "tin" },
  capsules:            { bg: "var(--sand)",     deep: "var(--sand-stamp)",     shape: "bottle" },
  vaporizers:          { bg: "var(--moss)",     deep: "var(--moss-stamp)",     shape: "jar" },
  // Collections
  "clinician-picks":   { bg: "var(--gold)",     deep: "var(--gold-stamp)",     shape: "bottle" },
  "best-sellers":      { bg: "var(--cloud)",    deep: "var(--cloud-stamp)",    shape: "can" },
  "beginner-friendly": { bg: "var(--sprout)",   deep: "var(--sprout-stamp)",   shape: "bottle" },
};

const SHELF_BY_FORMAT: Record<string, LeafmartProduct["shape"]> = {
  beverage: "can",
  tincture: "bottle",
  topical: "tin",
  serum: "serum",
  capsule: "bottle",
  edible: "box",
  flower: "jar",
  vape: "bottle",
};

const DEFAULT_SHELF = {
  bg: "var(--sage)",
  deep: "var(--leaf)",
  shape: "bottle" as const,
};

function shelfFor(
  categorySlugs: string[],
  format: string
): { bg: string; deep: string; shape: LeafmartProduct["shape"] } {
  for (const slug of categorySlugs) {
    if (SHELF_BY_CATEGORY[slug]) return SHELF_BY_CATEGORY[slug];
  }
  const shape = SHELF_BY_FORMAT[format.toLowerCase()] ?? DEFAULT_SHELF.shape;
  return { ...DEFAULT_SHELF, shape };
}

function formatLabelFrom(p: Product): string {
  const fmt = p.format
    ? p.format[0].toUpperCase() + p.format.slice(1)
    : "Product";
  const dominant =
    (p.cbnContent ?? 0) > 0
      ? "CBN"
      : (p.cbdContent ?? 0) > 0
        ? "CBD"
        : (p.thcContent ?? 0) > 0
          ? "THC"
          : null;
  return dominant ? `${fmt} · ${dominant}` : fmt;
}

function doseLabelFrom(p: Product): string {
  // Prefer total-mg when present; otherwise format-aware default.
  const mg = (p.cbdContent ?? 0) + (p.cbnContent ?? 0) + (p.thcContent ?? 0);
  if (mg > 0) return `${Math.round(mg)}mg`;
  switch (p.format?.toLowerCase()) {
    case "beverage":
      return "12 fl oz";
    case "tincture":
      return "30ml";
    case "topical":
      return "2oz";
    case "serum":
      return "30ml";
    case "capsule":
      return "30 ct";
    case "edible":
      return "20 ct";
    default:
      return "—";
  }
}

function tagFor(p: Product): string | undefined {
  if (p.clinicianPick) return "Clinician Pick";
  const days = (Date.now() - new Date(p.createdAt).getTime()) / 86_400_000;
  if (days <= 30) return "New";
  return undefined;
}

const VALID_SHAPES = new Set<LeafmartProduct["shape"]>([
  "bottle",
  "can",
  "jar",
  "tin",
  "serum",
  "box",
]);

function asShape(value: string | null): LeafmartProduct["shape"] | null {
  if (!value) return null;
  return VALID_SHAPES.has(value as LeafmartProduct["shape"])
    ? (value as LeafmartProduct["shape"])
    : null;
}

/** Map a Prisma Product (with category joins) to the UI's LeafmartProduct. */
export function mapProductToLeafmart(p: ProductWithJoins): LeafmartProduct {
  const categorySlugs = p.categoryMappings.map((m) => m.category.slug);
  const derivedShelf = shelfFor(categorySlugs, p.format);
  const dbShape = asShape(p.displayShape);
  const pct =
    p.outcomePct ??
    (p.averageRating > 0 ? Math.round(p.averageRating * 20) : 78);
  const n =
    p.outcomeSampleSize ?? (p.reviewCount > 0 ? p.reviewCount : 120);
  return {
    slug: p.slug,
    partner: p.brand.toUpperCase(),
    name: p.name,
    format: p.format,
    formatLabel: formatLabelFrom(p),
    support: p.shortDescription || p.description,
    dose: p.doseLabel ?? doseLabelFrom(p),
    price: p.price,
    pct,
    n,
    bg: p.bgColor ?? derivedShelf.bg,
    deep: p.deepColor ?? derivedShelf.deep,
    shape: dbShape ?? derivedShelf.shape,
    tag: tagFor(p),
    imageUrl: p.imageUrl,
    description: p.description,
    compareAtPrice: p.compareAtPrice ?? null,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    labVerified: p.labVerified,
    coaUrl: p.coaUrl,
    clinicianPick: p.clinicianPick,
    clinicianNote: p.clinicianNote,
    variants: (p.variants ?? []).map<LeafmartVariant>((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      inStock: v.inStock,
    })),
    reviews: (p.reviews ?? []).map<LeafmartReview>((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
  };
}

/* ── Static-data fallback ────────────────────────────────────
 * When the DB is empty (local/dev/preview), we still want the PDP to render
 * with the rich variant/review data the marketplace catalog ships with.
 * MARKETPLACE_PRODUCTS is the curated source of truth; this maps it into
 * the same LeafmartProduct shape the DB-backed mapper produces.
 */

const MARKETPLACE_FALLBACK_SHELVES: Record<string, { bg: string; deep: string; shape: LeafmartProduct["shape"] }> = {
  "cat-sleep":     SHELF_BY_CATEGORY.sleep,
  "cat-recovery":  SHELF_BY_CATEGORY.recovery,
  "cat-calm":      SHELF_BY_CATEGORY.calm,
  "cat-skin":      SHELF_BY_CATEGORY.skin,
  "cat-focus":     SHELF_BY_CATEGORY.focus,
  "cat-anxiety":   SHELF_BY_CATEGORY.anxiety,
  "cat-pain":      SHELF_BY_CATEGORY["pain-support"],
  "cat-nausea":    SHELF_BY_CATEGORY.nausea,
  "cat-energy":    SHELF_BY_CATEGORY.energy,
  "cat-tincture":  SHELF_BY_CATEGORY.tinctures,
  "cat-edible":    SHELF_BY_CATEGORY.edibles,
  "cat-topical":   SHELF_BY_CATEGORY.topicals,
  "cat-capsule":   SHELF_BY_CATEGORY.capsules,
  "cat-vape":      SHELF_BY_CATEGORY.vaporizers,
  "cat-clinician": SHELF_BY_CATEGORY["clinician-picks"],
  "cat-best":      SHELF_BY_CATEGORY["best-sellers"],
  "cat-beginner":  SHELF_BY_CATEGORY["beginner-friendly"],
};

function mapMarketplaceToLeafmart(m: MarketplaceProduct): LeafmartProduct {
  const fallbackShelf =
    m.categoryIds.map((id) => MARKETPLACE_FALLBACK_SHELVES[id]).find(Boolean) ??
    { ...DEFAULT_SHELF, shape: SHELF_BY_FORMAT[m.format] ?? DEFAULT_SHELF.shape };
  const totalMg = (m.cbdContent ?? 0) + (m.cbnContent ?? 0) + (m.thcContent ?? 0);
  const formatTitle = m.format[0].toUpperCase() + m.format.slice(1);
  const dominant =
    (m.cbnContent ?? 0) > 0 ? "CBN" :
    (m.cbdContent ?? 0) > 0 ? "CBD" :
    (m.thcContent ?? 0) > 0 ? "THC" : null;
  const formatLabel = dominant ? `${formatTitle} · ${dominant}` : formatTitle;
  const dose = m.doseLabel ?? (totalMg > 0 ? `${Math.round(totalMg)}mg` : formatTitle);
  const tag = m.clinicianPick ? "Clinician Pick" : undefined;
  const shape =
    (m.displayShape as LeafmartProduct["shape"] | undefined) ?? fallbackShelf.shape;
  return {
    slug: m.slug,
    partner: m.brand.toUpperCase(),
    name: m.name,
    format: m.format,
    formatLabel,
    support: m.shortDescription || m.description,
    dose,
    price: m.price,
    pct: m.outcomePct ?? (m.averageRating > 0 ? Math.round(m.averageRating * 20) : 78),
    n: m.outcomeSampleSize ?? (m.reviewCount > 0 ? m.reviewCount : 120),
    bg: m.bgColor ?? fallbackShelf.bg,
    deep: m.deepColor ?? fallbackShelf.deep,
    shape,
    tag,
    imageUrl: m.imageUrl,
    description: m.description,
    compareAtPrice: m.compareAtPrice ?? null,
    averageRating: m.averageRating,
    reviewCount: m.reviewCount,
    labVerified: m.labVerified,
    coaUrl: m.coaUrl,
    clinicianPick: m.clinicianPick,
    clinicianNote: m.clinicianNote,
    variants: m.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      inStock: v.inStock,
    })),
    reviews: m.reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
  };
}

function findMarketplaceBySlug(slug: string): LeafmartProduct | null {
  const m = MARKETPLACE_PRODUCTS.find((p) => p.slug === slug);
  return m ? mapMarketplaceToLeafmart(m) : null;
}

function relatedFromMarketplace(slug: string, limit: number): LeafmartProduct[] {
  const target = MARKETPLACE_PRODUCTS.find((p) => p.slug === slug);
  if (!target) {
    return MARKETPLACE_PRODUCTS.filter((p) => p.slug !== slug)
      .slice(0, limit)
      .map(mapMarketplaceToLeafmart);
  }
  const targetTags = new Set([...target.symptoms, ...target.goals]);
  return MARKETPLACE_PRODUCTS.filter((p) => p.slug !== slug)
    .map((p) => ({
      product: p,
      score: [...p.symptoms, ...p.goals].filter((t) => targetTags.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => mapMarketplaceToLeafmart(r.product));
}

/* ── Public getters ─────────────────────────────────────────── */

export async function getProducts(): Promise<LeafmartProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { status: "active", deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        categoryMappings: { include: { category: { select: { slug: true, name: true } } } },
      },
    });
    if (rows.length === 0) return DEMO_PRODUCTS;
    return rows.map(mapProductToLeafmart);
  } catch (err) {
    console.error("[leafmart] getProducts failed, falling back to demo data:", err);
    return DEMO_PRODUCTS;
  }
}

export async function getProductBySlug(slug: string): Promise<LeafmartProduct | null> {
  try {
    const row = await prisma.product.findFirst({
      where: { slug, status: "active", deletedAt: null },
      include: {
        categoryMappings: { include: { category: { select: { slug: true, name: true } } } },
        variants: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (row) return mapProductToLeafmart(row);
  } catch (err) {
    console.error(`[leafmart] getProductBySlug(${slug}) failed:`, err);
  }
  // DB miss: prefer the rich marketplace catalog (variants + reviews + COA),
  // and only fall through to the lean DEMO_PRODUCTS if nothing matches there.
  const marketplaceMatch = findMarketplaceBySlug(slug);
  if (marketplaceMatch) return marketplaceMatch;
  return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export async function getProductsByCategory(slug: string): Promise<LeafmartProduct[]> {
  try {
    const rows = await prisma.product.findMany({
      where: {
        status: "active",
        deletedAt: null,
        categoryMappings: { some: { category: { slug } } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        categoryMappings: { include: { category: { select: { slug: true, name: true } } } },
      },
    });
    if (rows.length > 0) return rows.map(mapProductToLeafmart);
  } catch (err) {
    console.error(`[leafmart] getProductsByCategory(${slug}) failed:`, err);
  }
  // Fallback: every demo product (all are clinician-curated) until DB is seeded.
  return DEMO_PRODUCTS;
}

export async function getRelatedProducts(
  slug: string,
  limit = 3
): Promise<LeafmartProduct[]> {
  try {
    // Find the source product so we can match its categories — "pairs well
    // with" should surface same-category neighbours, not arbitrary picks.
    const source = await prisma.product.findFirst({
      where: { slug, status: "active", deletedAt: null },
      select: { id: true, categoryMappings: { select: { categoryId: true } } },
    });
    const categoryIds = source?.categoryMappings.map((m) => m.categoryId) ?? [];

    const rows = await prisma.product.findMany({
      where: {
        status: "active",
        deletedAt: null,
        slug: { not: slug },
        ...(categoryIds.length > 0
          ? { categoryMappings: { some: { categoryId: { in: categoryIds } } } }
          : {}),
      },
      orderBy: [{ clinicianPick: "desc" }, { sortOrder: "asc" }],
      take: limit,
      include: {
        categoryMappings: { include: { category: { select: { slug: true, name: true } } } },
        variants: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] },
      },
    });
    if (rows.length > 0) return rows.map(mapProductToLeafmart);
  } catch (err) {
    console.error(`[leafmart] getRelatedProducts(${slug}) failed:`, err);
  }
  // DB miss: rank the marketplace catalog by shared symptoms/goals.
  const marketplaceRelated = relatedFromMarketplace(slug, limit);
  if (marketplaceRelated.length > 0) return marketplaceRelated;
  return DEMO_PRODUCTS.filter((p) => p.slug !== slug).slice(0, limit);
}

/* ── Categories & partners ──────────────────────────────────── */

type CategoryRow = MarketplaceCategory & { _count: { products: number } };

export async function getCategories(): Promise<LeafmartCategory[]> {
  try {
    const rows = (await prisma.marketplaceCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    })) as CategoryRow[];
    if (rows.length === 0) return DEMO_CATEGORIES;
    return rows.map((c) => {
      const shelf = SHELF_BY_CATEGORY[c.slug] ?? DEFAULT_SHELF;
      const fallback = DEMO_CATEGORIES.find((d) => d.slug === c.slug);
      return {
        name: c.name,
        slug: c.slug,
        sub: c.description ?? fallback?.sub ?? "Curated for the way you want to feel.",
        count: c._count.products,
        bg: shelf.bg,
        deep: shelf.deep,
        shape: shelf.shape,
      };
    });
  } catch (err) {
    console.error("[leafmart] getCategories failed:", err);
    return DEMO_CATEGORIES;
  }
}

export async function getVendors(): Promise<LeafmartPartner[]> {
  try {
    const rows = await prisma.vendor.findMany({
      where: { foundingPartnerFlag: true },
      orderBy: [{ name: "asc" }],
    });
    if (rows.length === 0) return DEMO_PARTNERS;
    return rows.map((v: Vendor, i: number) => {
      const fallback =
        DEMO_PARTNERS.find((p) => p.name.toLowerCase() === v.name.toLowerCase()) ??
        DEMO_PARTNERS[i % DEMO_PARTNERS.length];
      return {
        name: v.name,
        desc: fallback.desc,
        bg: fallback.bg,
        deep: fallback.deep,
        shape: fallback.shape,
      };
    });
  } catch (err) {
    console.error("[leafmart] getVendors failed:", err);
    return DEMO_PARTNERS;
  }
}

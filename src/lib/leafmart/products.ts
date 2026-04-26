import "server-only";
import type { Product, MarketplaceCategory, Vendor } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";
import {
  DEMO_PRODUCTS,
  CATEGORIES as DEMO_CATEGORIES,
  PARTNERS as DEMO_PARTNERS,
} from "@/components/leafmart/demo-data";

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
};

/* ── Visual mappings for derived UI fields ───────────────────── */

const SHELF_BY_CATEGORY: Record<
  string,
  { bg: string; deep: string; shape: LeafmartProduct["shape"] }
> = {
  sleep: { bg: "var(--sage)", deep: "var(--leaf)", shape: "can" },
  recovery: { bg: "var(--peach)", deep: "#9E5621", shape: "tin" },
  calm: { bg: "var(--butter)", deep: "#8A6A1F", shape: "bottle" },
  skin: { bg: "var(--rose)", deep: "#9E4D45", shape: "serum" },
  focus: { bg: "var(--lilac)", deep: "#5C4972", shape: "box" },
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
  };
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
      },
    });
    if (row) return mapProductToLeafmart(row);
  } catch (err) {
    console.error(`[leafmart] getProductBySlug(${slug}) failed:`, err);
  }
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
    const rows = await prisma.product.findMany({
      where: { status: "active", deletedAt: null, slug: { not: slug } },
      orderBy: [{ clinicianPick: "desc" }, { sortOrder: "asc" }],
      take: limit,
      include: {
        categoryMappings: { include: { category: { select: { slug: true, name: true } } } },
      },
    });
    if (rows.length > 0) return rows.map(mapProductToLeafmart);
  } catch (err) {
    console.error(`[leafmart] getRelatedProducts(${slug}) failed:`, err);
  }
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

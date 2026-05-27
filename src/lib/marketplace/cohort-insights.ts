// EMR-270 — Cohort-driven marketplace insights.
//
// Consumed by the "Patients Like You" widget on /portal/shop. Aggregates
// active DosingRegimens across a cohort and maps each to its linked
// marketplace Product via the EMR-268 FK (CannabisProduct.marketplaceProductId).
// Returns products ranked by cohort popularity — how many cohort members
// have an active regimen tied to each listing.
//
// HIPAA note: the caller is responsible for enforcing a minimum cohort
// size (MIN_COHORT_SIZE) before displaying any per-product counts. This
// helper always returns counts regardless — the UI gates the display.

import { prisma } from "@/lib/db/prisma";
import { ProductStatus } from "@prisma/client";
import type { MarketplaceProduct } from "./types";

export const MIN_COHORT_SIZE = 3;

export interface CohortPopularProduct {
  product: MarketplaceProduct;
  regimenCount: number; // # of cohort members with an active regimen → this marketplace product
}

export interface CohortInsightOptions {
  organizationId: string;
  limit?: number;
}

export async function getPopularProductsInCohort(
  patientIds: string[],
  options: CohortInsightOptions,
): Promise<CohortPopularProduct[]> {
  if (patientIds.length === 0) return [];
  const limit = options.limit ?? 4;

  // Active regimens in the cohort, joined to the cannabis product and
  // (via EMR-268 FK) the marketplace product.
  const regimens = await prisma.dosingRegimen.findMany({
    where: {
      patientId: { in: patientIds },
      active: true,
      product: {
        marketplaceProductId: { not: null },
      },
    },
    select: {
      patientId: true,
      product: {
        select: {
          marketplaceProductId: true,
        },
      },
    },
  });

  // Count DISTINCT patients per marketplace product — a patient with two
  // regimens on the same product still counts once (this is a "people who
  // use X" metric, not "active regimens on X").
  const patientsByProduct = new Map<string, Set<string>>();
  for (const r of regimens) {
    const mpId = r.product.marketplaceProductId;
    if (!mpId) continue;
    const set = patientsByProduct.get(mpId) ?? new Set<string>();
    set.add(r.patientId);
    patientsByProduct.set(mpId, set);
  }

  if (patientsByProduct.size === 0) return [];

  // Hydrate marketplace rows. Scope by org + active status — don't surface
  // a draft/archived listing even if the FK points at it.
  const productIds = [...patientsByProduct.keys()];
  const rows = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      organizationId: options.organizationId,
      deletedAt: null,
      status: ProductStatus.active,
    },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      categoryMappings: { include: { category: true } },
    },
  });

  const ranked = rows
    .map((row) => ({
      product: mapProductRow(row),
      regimenCount: patientsByProduct.get(row.id)?.size ?? 0,
    }))
    .filter((r) => r.regimenCount > 0)
    .sort(
      (a, b) =>
        b.regimenCount - a.regimenCount ||
        a.product.name.localeCompare(b.product.name),
    )
    .slice(0, limit);

  return ranked;
}

// Local mapper — duplicated from queries.ts / ranking.ts on purpose. The
// other mappers require a user session (queries.ts) or live in a module
// we don't want to widen the export surface of (ranking.ts is private
// to the moat).
type ProductRow = Awaited<
  ReturnType<
    typeof prisma.product.findFirstOrThrow<{
      include: {
        variants: { orderBy: { sortOrder: "asc" } };
        reviews: { orderBy: { createdAt: "desc" } };
        categoryMappings: { include: { category: true } };
      };
    }>
  >
>;

function mapProductRow(p: ProductRow): MarketplaceProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    description: p.description,
    shortDescription: p.shortDescription ?? "",
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? undefined,
    status: p.status,
    format: p.format as MarketplaceProduct["format"],
    imageUrl: p.imageUrl ?? undefined,
    images: p.images,
    thcContent: p.thcContent ?? undefined,
    cbdContent: p.cbdContent ?? undefined,
    cbnContent: p.cbnContent ?? undefined,
    terpeneProfile: (p.terpeneProfile ?? {}) as Record<string, number>,
    strainType: (p.strainType ?? undefined) as MarketplaceProduct["strainType"],
    symptoms: p.symptoms,
    goals: p.goals,
    useCases: p.useCases,
    onsetTime: p.onsetTime ?? undefined,
    duration: p.duration ?? undefined,
    dosageGuidance: p.dosageGuidance ?? undefined,
    beginnerFriendly: p.beginnerFriendly,
    labVerified: p.labVerified,
    coaUrl: p.coaUrl ?? undefined,
    clinicianPick: p.clinicianPick,
    clinicianNote: p.clinicianNote ?? undefined,
    inStock: p.inStock,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    featured: p.featured,
    categoryIds: p.categoryMappings.map((m) => m.categoryId),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      upc: v.upc ?? undefined,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? undefined,
      inStock: v.inStock,
    })),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title ?? undefined,
      body: r.body ?? undefined,
      verified: r.verified,
      createdAt: r.createdAt.toISOString().slice(0, 10),
    })),
  };
}

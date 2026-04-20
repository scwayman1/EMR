// Per-product efficacy report — data reuse surface (Dr. Patel Directive).
//
// Consumed by:
//   - My Health (patient-facing "what's working for me")
//   - Research export (de-identified cohort efficacy studies)
//   - Reimbursement documentation (outcomes evidence)
//   - Pharma real-world-evidence feeds
//
// Returns a ranked list of products with the data the downstream
// consumers need to stitch in names, strain types, and cohort context.

import { prisma } from "@/lib/db/prisma";
import {
  productRanking,
  type ProductOutcomeLike,
  type ProductRankingEntry,
} from "./product-outcomes";

export interface ProductEfficacyReportItem extends ProductRankingEntry {
  productName: string;
  brand: string | null;
  format: string | null;
  strainType: string | null;
  topSideEffects: { label: string; count: number }[];
}

export interface ProductEfficacyReport {
  patientId: string;
  organizationId: string;
  generatedAt: Date;
  items: ProductEfficacyReportItem[];
  totalLogs: number;
}

const MAX_SIDE_EFFECTS = 5;

/**
 * Build a ranked per-product efficacy report for one patient inside an
 * organization. All outcome rows are scoped to the (patientId, organizationId)
 * pair so a cross-org read cannot leak another practice's data.
 *
 * The returned items are the same shape `productRanking` produces, enriched
 * with the product's display metadata and the most-frequent side-effects so
 * callers can render a report card / export row without another query.
 */
export async function getProductEfficacyReport(
  patientId: string,
  organizationId: string,
  now: Date = new Date(),
): Promise<ProductEfficacyReport> {
  const outcomes = await prisma.productOutcome.findMany({
    where: { patientId, organizationId },
    select: {
      productId: true,
      effectivenessScore: true,
      sideEffects: true,
      loggedAt: true,
    },
    orderBy: { loggedAt: "desc" },
  });

  if (outcomes.length === 0) {
    return {
      patientId,
      organizationId,
      generatedAt: now,
      items: [],
      totalLogs: 0,
    };
  }

  const likeRows: ProductOutcomeLike[] = outcomes.map((o) => ({
    productId: o.productId,
    effectivenessScore: o.effectivenessScore,
    sideEffects: o.sideEffects ?? [],
    loggedAt: o.loggedAt,
  }));

  const ranked = productRanking(likeRows, now);

  // Lookup display metadata for the ranked product IDs — one query.
  const productIds = ranked.map((r) => r.productId);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: {
          id: { in: productIds },
          organizationId,
        },
        select: {
          id: true,
          name: true,
          brand: true,
          format: true,
          strainType: true,
        },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  // Tally side-effects per product across its logs.
  const sideEffectCounts = new Map<string, Map<string, number>>();
  for (const o of outcomes) {
    if (!Array.isArray(o.sideEffects) || o.sideEffects.length === 0) continue;
    let m = sideEffectCounts.get(o.productId);
    if (!m) {
      m = new Map<string, number>();
      sideEffectCounts.set(o.productId, m);
    }
    for (const raw of o.sideEffects) {
      const label = String(raw).trim();
      if (!label) continue;
      m.set(label, (m.get(label) ?? 0) + 1);
    }
  }

  const items: ProductEfficacyReportItem[] = ranked.map((entry) => {
    const product = productById.get(entry.productId);
    const seCounts = sideEffectCounts.get(entry.productId);
    const topSideEffects = seCounts
      ? Array.from(seCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, MAX_SIDE_EFFECTS)
          .map(([label, count]) => ({ label, count }))
      : [];

    return {
      ...entry,
      productName: product?.name ?? "Unknown product",
      brand: product?.brand ?? null,
      format: product?.format ?? null,
      strainType: product?.strainType ?? null,
      topSideEffects,
    };
  });

  return {
    patientId,
    organizationId,
    generatedAt: now,
    items,
    totalLogs: outcomes.length,
  };
}

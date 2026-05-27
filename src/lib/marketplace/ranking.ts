// EMR-230 — Outcome-weighted product ranking engine.
//
// Per-patient marketplace product recommendations from real clinical and
// outcome data. The scoring model is intentionally legible + auditable — not
// an ML black box. Each returned ranking carries a `reasons[]` explaining why
// the product was boosted, so clinicians and patients can trust it.
//
// Clinical ↔ marketplace bridge: `CannabisProduct.marketplaceProductId`
// (EMR-268) is the authoritative link when set. When null, we fall back to a
// normalized name (+ brand) match. The fallback exists only until the seed +
// vendor onboarding backfills every CannabisProduct with its marketplace
// twin; remove once null-rate on that column is effectively zero.

import { prisma } from "@/lib/db/prisma";
import { ProductStatus, type OutcomeMetric } from "@prisma/client";
import type { MarketplaceProduct } from "./types";

// Scoring weights — tweak here.
export const WEIGHT_CONDITION_MATCH = 40; // cumulative cap
export const WEIGHT_CONDITION_PER_HIT = 10;
export const WEIGHT_PRODUCT_EFFICACY = 30;
export const WEIGHT_CLINICIAN_PICK = 15;
export const WEIGHT_IN_STOCK_AND_RATED = 15;
export const WEIGHT_IN_STOCK_ONLY = 7;
export const WEIGHT_BEGINNER_SAFETY = 10;

// Outcome analysis window + thresholds.
const OUTCOME_LOOKBACK_DAYS = 30;
const OUTCOME_HIGH_THRESHOLD = 5; // value > 5 = symptom present (pain/anxiety/nausea)
const OUTCOME_LOW_THRESHOLD = 5; // value < 5 = deficit (sleep/mood/energy)
const REGIMEN_IMPROVEMENT_POINTS = 2; // ≥2 point improvement across a regimen window

// Which metrics are "high = bad" vs "low = bad". Maps to symptom/goal labels
// our marketplace uses (see SYMPTOM_OPTIONS / GOAL_OPTIONS in types.ts).
const METRIC_TO_TARGETS: Record<
  OutcomeMetric,
  { direction: "high-bad" | "low-bad"; labels: string[] }
> = {
  pain: { direction: "high-bad", labels: ["Pain", "Pain support"] },
  anxiety: { direction: "high-bad", labels: ["Anxiety", "Calm"] },
  nausea: { direction: "high-bad", labels: ["Nausea"] },
  side_effects: { direction: "high-bad", labels: [] },
  sleep: { direction: "low-bad", labels: ["Sleep"] },
  mood: { direction: "low-bad", labels: ["Calm", "Everyday wellness"] },
  energy: { direction: "low-bad", labels: ["Energy", "Focus"] },
  appetite: { direction: "low-bad", labels: ["Appetite"] },
  adherence: { direction: "low-bad", labels: [] },
};

export interface RankedProduct {
  product: MarketplaceProduct;
  score: number;
  reasons: string[];
}

export interface RankOptions {
  limit?: number;
  organizationId?: string;
}

// Cannabis product identifier, normalized for a best-effort bridge match.
function normalizeName(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// Given a patient's memory + recent outcome signals, return which
// symptom/goal labels the patient currently needs help with.
interface ConditionSignal {
  label: string;
  reason: string;
}

function collectConditionSignals(
  memoryTags: string[],
  recentLogs: { metric: OutcomeMetric; value: number }[],
): ConditionSignal[] {
  const signals: ConditionSignal[] = [];
  const seenLabel = new Set<string>();

  // Memory tags — treat the tag itself as a symptom/goal hint.
  for (const raw of memoryTags) {
    const tag = raw.trim();
    if (!tag) continue;
    // Title-case first letter to match marketplace symptom/goal options.
    const label = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
    if (seenLabel.has(label)) continue;
    seenLabel.add(label);
    signals.push({ label, reason: `matches a tracked concern: ${label}` });
  }

  // Outcome logs — group by metric, use latest value to decide.
  const byMetric = new Map<OutcomeMetric, number>();
  for (const log of recentLogs) {
    // Keep the most recent value per metric (logs are ordered desc below).
    if (!byMetric.has(log.metric)) byMetric.set(log.metric, log.value);
  }
  for (const [metric, value] of byMetric) {
    const spec = METRIC_TO_TARGETS[metric];
    if (!spec) continue;
    const flagged =
      (spec.direction === "high-bad" && value > OUTCOME_HIGH_THRESHOLD) ||
      (spec.direction === "low-bad" && value < OUTCOME_LOW_THRESHOLD);
    if (!flagged) continue;
    for (const label of spec.labels) {
      if (seenLabel.has(label)) continue;
      seenLabel.add(label);
      signals.push({
        label,
        reason: `matches your goal: ${label} (recent ${metric}=${value})`,
      });
    }
  }

  return signals;
}

// For each past regimen, compute the outcome delta across its window and
// return the product identifier (normalized name[+brand]) if the patient
// improved by ≥REGIMEN_IMPROVEMENT_POINTS on any tracked metric.
interface EfficacySignal {
  marketplaceProductId: string | null; // authoritative link when non-null
  key: string; // normalized name (fallback bridge)
  brand: string; // normalized brand ("" if none)
  metric: OutcomeMetric;
  before: number;
  after: number;
}

function computeEfficacySignals(
  regimens: {
    startDate: Date;
    endDate: Date | null;
    product: {
      name: string;
      brand: string | null;
      marketplaceProductId: string | null;
    };
  }[],
  allLogs: { metric: OutcomeMetric; value: number; loggedAt: Date }[],
): EfficacySignal[] {
  const out: EfficacySignal[] = [];
  for (const r of regimens) {
    const start = r.startDate;
    const end = r.endDate ?? new Date();
    const windowLogs = allLogs.filter(
      (l) => l.loggedAt >= start && l.loggedAt <= end,
    );
    if (windowLogs.length < 2) continue;

    const byMetric = new Map<OutcomeMetric, { metric: OutcomeMetric; value: number; loggedAt: Date }[]>();
    for (const l of windowLogs) {
      const arr = byMetric.get(l.metric) ?? [];
      arr.push(l);
      byMetric.set(l.metric, arr);
    }
    for (const [metric, entries] of byMetric) {
      if (entries.length < 2) continue;
      const sorted = [...entries].sort(
        (a, b) => a.loggedAt.getTime() - b.loggedAt.getTime(),
      );
      const first = sorted[0].value;
      const last = sorted[sorted.length - 1].value;
      const spec = METRIC_TO_TARGETS[metric];
      if (!spec) continue;
      const improvement =
        spec.direction === "high-bad" ? first - last : last - first;
      if (improvement >= REGIMEN_IMPROVEMENT_POINTS) {
        out.push({
          marketplaceProductId: r.product.marketplaceProductId,
          key: normalizeName(r.product.name),
          brand: normalizeName(r.product.brand),
          metric,
          before: first,
          after: last,
        });
      }
    }
  }
  return out;
}

export async function rankProductsForPatient(
  patientId: string,
  options: RankOptions = {},
): Promise<RankedProduct[]> {
  if (!patientId) return [];
  const limit = options.limit ?? 10;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, organizationId: true },
  });
  if (!patient) return [];

  const organizationId = options.organizationId ?? patient.organizationId;
  const sinceOutcomes = new Date(
    Date.now() - OUTCOME_LOOKBACK_DAYS * 86_400_000,
  );

  const [
    productRows,
    recentOutcomes,
    allOutcomes,
    memories,
    regimens,
    orderedItems,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: ProductStatus.active,
      },
      include: {
        variants: { orderBy: { sortOrder: "asc" } },
        reviews: { orderBy: { createdAt: "desc" } },
        categoryMappings: { include: { category: true } },
      },
    }),
    prisma.outcomeLog.findMany({
      where: { patientId, loggedAt: { gte: sinceOutcomes } },
      orderBy: { loggedAt: "desc" },
      select: { metric: true, value: true, loggedAt: true },
    }),
    prisma.outcomeLog.findMany({
      where: { patientId },
      orderBy: { loggedAt: "asc" },
      select: { metric: true, value: true, loggedAt: true },
    }),
    prisma.patientMemory.findMany({
      where: {
        patientId,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { tags: true },
    }),
    prisma.dosingRegimen.findMany({
      where: { patientId },
      select: {
        startDate: true,
        endDate: true,
        product: {
          select: {
            name: true,
            brand: true,
            marketplaceProductId: true,
          },
        },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { patientId } },
      select: { productId: true },
    }),
  ]);

  const alreadyOrdered = new Set(orderedItems.map((i) => i.productId));
  const memoryTags = memories.flatMap((m) => m.tags);
  const signals = collectConditionSignals(memoryTags, recentOutcomes);
  const efficacy = computeEfficacySignals(regimens, allOutcomes);
  const hasPriorRegimens = regimens.length > 0;

  const ranked: RankedProduct[] = [];
  for (const row of productRows) {
    if (alreadyOrdered.has(row.id)) continue;

    let score = 0;
    const reasons: string[] = [];

    // 1. Condition match — up to WEIGHT_CONDITION_MATCH.
    const matchable = new Set<string>([...row.symptoms, ...row.goals]);
    let conditionScore = 0;
    for (const sig of signals) {
      if (matchable.has(sig.label)) {
        conditionScore += WEIGHT_CONDITION_PER_HIT;
        reasons.push(sig.reason);
      }
    }
    if (conditionScore > WEIGHT_CONDITION_MATCH) {
      conditionScore = WEIGHT_CONDITION_MATCH;
    }
    score += conditionScore;

    // 2. Product efficacy — prefer the authoritative FK; fall back to
    // normalized name+brand match while the backfill is rolling out.
    const rowKey = normalizeName(row.name);
    const rowBrand = normalizeName(row.brand);
    for (const eff of efficacy) {
      const fkMatch =
        eff.marketplaceProductId != null &&
        eff.marketplaceProductId === row.id;
      let nameMatch = false;
      if (!fkMatch && eff.marketplaceProductId == null) {
        const nameEq = eff.key && eff.key === rowKey;
        // Brand match is required only when both sides have a brand.
        const brandEq = !eff.brand || !rowBrand || eff.brand === rowBrand;
        nameMatch = Boolean(nameEq && brandEq);
      }
      if (fkMatch || nameMatch) {
        score += WEIGHT_PRODUCT_EFFICACY;
        reasons.push(
          `similar to regimen that improved ${eff.metric} ${eff.before}→${eff.after}`,
        );
        break;
      }
    }

    // 3. Clinician pick.
    if (row.clinicianPick) {
      score += WEIGHT_CLINICIAN_PICK;
      reasons.push("clinician pick");
    }

    // 4. In-stock + rating.
    if (row.inStock && row.averageRating >= 4.5) {
      score += WEIGHT_IN_STOCK_AND_RATED;
      reasons.push(`in stock, highly rated (${row.averageRating.toFixed(1)}★)`);
    } else if (row.inStock) {
      score += WEIGHT_IN_STOCK_ONLY;
    }

    // 5. Beginner safety.
    if (!hasPriorRegimens && row.beginnerFriendly) {
      score += WEIGHT_BEGINNER_SAFETY;
      reasons.push("beginner-friendly — a gentle starting point");
    }

    if (score <= 0) continue;

    ranked.push({
      product: mapProductRow(row),
      score,
      reasons,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  return ranked.slice(0, limit);
}

// Local copy of the queries.ts mapper — duplicated to keep this module
// independent (the queries.ts version pulls in next/cache via getCurrentUser).
type ProductRow = Awaited<
  ReturnType<typeof prisma.product.findFirstOrThrow<{
    include: {
      variants: { orderBy: { sortOrder: "asc" } };
      reviews: { orderBy: { createdAt: "desc" } };
      categoryMappings: { include: { category: true } };
    };
  }>>
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

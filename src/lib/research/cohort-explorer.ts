// EMR-271 — Clinician cohort explorer data layer.
//
// Drives `/clinic/cohorts`. Wraps cohortBuilderAgent + the EMR-270
// cohort-insights helper + a clinician-pick usage calculation into one
// view model so the UI can render without chaining queries.
//
// The tag discovery path (`listOrgMemoryTags`) flattens `PatientMemory.tags[]`
// in JS because Prisma doesn't expose a generic SELECT DISTINCT over array
// elements. Fine at seed scale; at practice scale (10k+ patients) this
// would move to a raw `unnest` query or a materialized tag-count table.

import { prisma } from "@/lib/db/prisma";
import { cohortBuilderAgent } from "@/lib/agents/research/cohort-builder-agent";
import {
  getPopularProductsInCohort,
  MIN_COHORT_SIZE,
  type CohortPopularProduct,
} from "@/lib/marketplace/cohort-insights";

export { MIN_COHORT_SIZE };

export interface TagUsage {
  tag: string;
  patientCount: number;
}

/**
 * Distinct non-empty tags from currently-valid PatientMemory rows in the
 * org, ranked by the number of patients using each tag. Drives the tag
 * picker on the cohort explorer page.
 */
export async function listOrgMemoryTags(
  organizationId: string,
  limit = 20,
): Promise<TagUsage[]> {
  const memories = await prisma.patientMemory.findMany({
    where: {
      patient: { organizationId, deletedAt: null },
      tags: { isEmpty: false },
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
    select: { patientId: true, tags: true },
  });

  // Tag → distinct patient count. A patient with two memories tagged
  // "sleep" still counts once.
  const patientsByTag = new Map<string, Set<string>>();
  for (const m of memories) {
    for (const raw of m.tags) {
      const tag = raw.trim();
      if (!tag) continue;
      const set = patientsByTag.get(tag) ?? new Set<string>();
      set.add(m.patientId);
      patientsByTag.set(tag, set);
    }
  }

  return [...patientsByTag.entries()]
    .map(([tag, patients]) => ({ tag, patientCount: patients.size }))
    .sort(
      (a, b) => b.patientCount - a.patientCount || a.tag.localeCompare(b.tag),
    )
    .slice(0, limit);
}

export interface CohortExplorerView {
  tag: string;
  lookbackDays: number;
  cohortSize: number;
  peerCount: number; // same as cohortSize — named for clarity
  medianAgeYears: number | null;
  activeRegimenPatientCount: number;
  clinicianPickUsageRate: number | null; // 0..1 or null when cohortSize < MIN
  metricBaselines: Array<{
    metric: string;
    mean: number;
    sampleSize: number;
  }>;
  popularProducts: CohortPopularProduct[];
  belowMinCohort: boolean;
}

/**
 * One-shot view model for `/clinic/cohorts?tag=...`. Fans out
 * cohortBuilder + cohort-insights + clinician-pick usage in parallel;
 * the route renders straight from this object.
 */
export async function getCohortExplorerView(params: {
  organizationId: string;
  memoryTag: string;
  lookbackDays?: number;
  productLimit?: number;
}): Promise<CohortExplorerView> {
  const lookbackDays = params.lookbackDays ?? 90;

  // cohortBuilder only calls ctx.log — stub is safe.
  const stubCtx = { log: () => {} } as unknown as Parameters<
    typeof cohortBuilderAgent.run
  >[1];

  const cohort = await cohortBuilderAgent.run(
    {
      organizationId: params.organizationId,
      memoryTag: params.memoryTag,
      activeRegimenOnly: false,
      lookbackDays,
    },
    stubCtx,
  );

  const cohortSize = cohort.size;
  const belowMinCohort = cohortSize < MIN_COHORT_SIZE;

  if (belowMinCohort) {
    return {
      tag: params.memoryTag,
      lookbackDays,
      cohortSize,
      peerCount: cohortSize,
      medianAgeYears:
        cohort.medianAgeDays != null
          ? Math.round(cohort.medianAgeDays / 365)
          : null,
      activeRegimenPatientCount: 0,
      clinicianPickUsageRate: null,
      metricBaselines: [],
      popularProducts: [],
      belowMinCohort: true,
    };
  }

  const [activeRegimens, popularProducts] = await Promise.all([
    prisma.dosingRegimen.findMany({
      where: {
        patientId: { in: cohort.patientIds },
        active: true,
      },
      select: {
        patientId: true,
        product: {
          select: {
            marketplaceProduct: { select: { clinicianPick: true } },
          },
        },
      },
    }),
    getPopularProductsInCohort(cohort.patientIds, {
      organizationId: params.organizationId,
      limit: params.productLimit ?? 6,
    }),
  ]);

  const patientsWithActiveRegimen = new Set(
    activeRegimens.map((r) => r.patientId),
  );
  const patientsOnClinicianPick = new Set(
    activeRegimens
      .filter((r) => r.product.marketplaceProduct?.clinicianPick)
      .map((r) => r.patientId),
  );
  const clinicianPickUsageRate =
    patientsWithActiveRegimen.size === 0
      ? 0
      : Number(
          (
            patientsOnClinicianPick.size / patientsWithActiveRegimen.size
          ).toFixed(3),
        );

  const metricBaselines = Object.entries(cohort.metricBaselines)
    .map(([metric, stats]) => ({ metric, ...stats }))
    .sort((a, b) => b.sampleSize - a.sampleSize);

  return {
    tag: params.memoryTag,
    lookbackDays,
    cohortSize,
    peerCount: cohortSize,
    medianAgeYears:
      cohort.medianAgeDays != null
        ? Math.round(cohort.medianAgeDays / 365)
        : null,
    activeRegimenPatientCount: patientsWithActiveRegimen.size,
    clinicianPickUsageRate,
    metricBaselines,
    popularProducts,
    belowMinCohort: false,
  };
}

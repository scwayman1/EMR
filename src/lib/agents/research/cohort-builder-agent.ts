import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  memoryTag: z.string().optional(),
  activeRegimenOnly: z.boolean().optional(),
  minOutcomeLogs: z.number().int().min(0).optional(),
  lookbackDays: z.number().int().positive().max(3650).optional(),
  limit: z.number().int().positive().max(10_000).optional(),
});

const output = z.object({
  patientIds: z.array(z.string()),
  size: z.number(),
  medianAgeDays: z.number().nullable(),
  metricBaselines: z.record(
    z.object({
      mean: z.number(),
      sampleSize: z.number(),
    }),
  ),
  criteria: z.object({
    memoryTag: z.string().optional(),
    activeRegimenOnly: z.boolean(),
    minOutcomeLogs: z.number(),
    lookbackDays: z.number(),
  }),
});

type CohortOutput = z.infer<typeof output>;

/**
 * Cohort Builder Agent
 * --------------------
 * Filters patients by research cohort criteria. First piece of the
 * research fleet with real Prisma logic — the other agents scaffold shapes
 * only until the use case is proven.
 *
 * Criteria today:
 *  - Memory tag (e.g. "sleep", "pain") via `PatientMemory.tags[]`
 *  - Active regimen requirement (DosingRegimen.active)
 *  - Minimum outcome-log count in the lookback window
 *  - Org-scoped, soft-delete respected
 *
 * Returns the cohort shape used by every downstream research agent:
 * `{ patientIds, size, medianAgeDays, metricBaselines }`.
 */
export const cohortBuilderAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "cohortBuilder",
  version: "0.1.0",
  description:
    "Filters patients by condition / regimen / outcome-log criteria and returns a cohort spec + metric baselines.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run(payload, ctx) {
    const { prisma } = await import("@/lib/db/prisma");

    const activeRegimenOnly = payload.activeRegimenOnly ?? false;
    const minOutcomeLogs = payload.minOutcomeLogs ?? 0;
    const lookbackDays = payload.lookbackDays ?? 90;
    const limit = payload.limit ?? 500;
    const since = new Date(Date.now() - lookbackDays * 86_400_000);

    // Start with the org-scoped patient list. We filter in app code rather
    // than building one giant `where` clause so the criteria stay legible.
    const patients = await prisma.patient.findMany({
      where: {
        organizationId: payload.organizationId,
        deletedAt: null,
        ...(payload.memoryTag
          ? {
              patientMemories: {
                some: {
                  tags: { has: payload.memoryTag },
                  OR: [
                    { validUntil: null },
                    { validUntil: { gt: new Date() } },
                  ],
                },
              },
            }
          : {}),
        ...(activeRegimenOnly
          ? { dosingRegimens: { some: { active: true } } }
          : {}),
      },
      select: {
        id: true,
        dateOfBirth: true,
      },
      take: limit * 2, // room to drop after min-log filter
    });

    if (patients.length === 0) {
      return emptyCohort(payload, activeRegimenOnly, minOutcomeLogs, lookbackDays);
    }

    const patientIds = patients.map((p) => p.id);

    // Pull outcome logs across the cohort in one query, group by patient +
    // metric so we can both enforce minOutcomeLogs and compute baselines.
    const logs = await prisma.outcomeLog.findMany({
      where: {
        patientId: { in: patientIds },
        loggedAt: { gte: since },
      },
      select: {
        patientId: true,
        metric: true,
        value: true,
      },
    });

    const logsByPatient = new Map<string, number>();
    const valuesByMetric = new Map<string, number[]>();
    for (const log of logs) {
      logsByPatient.set(log.patientId, (logsByPatient.get(log.patientId) ?? 0) + 1);
      const arr = valuesByMetric.get(log.metric) ?? [];
      arr.push(log.value);
      valuesByMetric.set(log.metric, arr);
    }

    const filtered = patients.filter(
      (p) => (logsByPatient.get(p.id) ?? 0) >= minOutcomeLogs,
    );
    const capped = filtered.slice(0, limit);

    // Median age in days.
    const now = Date.now();
    const ages = capped
      .map((p) => (p.dateOfBirth ? now - p.dateOfBirth.getTime() : null))
      .filter((d): d is number => d != null)
      .map((ms) => Math.floor(ms / 86_400_000))
      .sort((a, b) => a - b);
    const medianAgeDays = ages.length === 0
      ? null
      : ages[Math.floor(ages.length / 2)];

    // Metric baselines — mean of values in the window (by all cohort patients;
    // limit doesn't affect this since we slice after computing).
    const metricBaselines: Record<string, { mean: number; sampleSize: number }> = {};
    for (const [metric, values] of valuesByMetric) {
      const sum = values.reduce((a, b) => a + b, 0);
      metricBaselines[metric] = {
        mean: Number((sum / values.length).toFixed(3)),
        sampleSize: values.length,
      };
    }

    ctx.log("info", "cohortBuilder assembled cohort", {
      candidatePatients: patients.length,
      filteredSize: capped.length,
      metricCount: Object.keys(metricBaselines).length,
    });

    return {
      patientIds: capped.map((p) => p.id),
      size: capped.length,
      medianAgeDays,
      metricBaselines,
      criteria: {
        memoryTag: payload.memoryTag,
        activeRegimenOnly,
        minOutcomeLogs,
        lookbackDays,
      },
    };
  },
};

function emptyCohort(
  payload: z.infer<typeof input>,
  activeRegimenOnly: boolean,
  minOutcomeLogs: number,
  lookbackDays: number,
): CohortOutput {
  return {
    patientIds: [],
    size: 0,
    medianAgeDays: null,
    metricBaselines: {},
    criteria: {
      memoryTag: payload.memoryTag,
      activeRegimenOnly,
      minOutcomeLogs,
      lookbackDays,
    },
  };
}

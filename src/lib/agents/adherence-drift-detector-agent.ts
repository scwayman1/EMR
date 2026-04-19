import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { recordObservation } from "@/lib/agents/memory/clinical-observation";
import type { ObservationSeverity } from "@prisma/client";

// ---------------------------------------------------------------------------
// Adherence Drift Detector
// ---------------------------------------------------------------------------
// Cold-temperature daily sweep. For each active DosingRegimen on a patient,
// compares the last 7 days of DoseLog activity against the preceding 14-day
// baseline and flags drifts the physician should see at the next touchpoint.
//
// Three flag conditions, most urgent wins:
//
//   URGENT  — >=72 hours since the last dose on an active regimen
//             (likely missed doses, treatment is stalling).
//   CONCERN — current 7-day adherence <30% OR dropped >=25 percentage
//             points vs. the 14-day-prior baseline (real drift, not
//             just a low baseline).
//   NOTABLE — current 7-day adherence 30-60% with no baseline drop
//             (chronically underdosing the regimen as written).
//
// Observations write into category "adherence" with evidence linking
// to the regimen. Output flows into the Command Center's Clinical
// Discovery tile under "care gaps."
//
// Idempotency — rewrites an observation each run; the tile shows the
// most recent unacknowledged one, so a physician acknowledging clears
// the nag until it re-fires on tomorrow's sweep.
// ---------------------------------------------------------------------------

const input = z.object({ patientId: z.string() });

const output = z.object({
  regimensChecked: z.number(),
  driftsFlagged: z.number(),
  observationIds: z.array(z.string()),
});

const DAY_MS = 86_400_000;

type DriftFinding = {
  regimenId: string;
  productName: string;
  severity: ObservationSeverity;
  summary: string;
  action: string;
  metadata: Record<string, unknown>;
};

export const adherenceDriftDetectorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "adherenceDriftDetector",
  version: "1.0.0",
  description:
    "Daily sweep: compares a patient's recent dose-log pace against a " +
    "preceding baseline for each active regimen and writes an adherence " +
    "observation when the patient has drifted, stalled, or is chronically " +
    "under-dosing.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.outcome.reminder"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * DAY_MS);

    const regimens = await prisma.dosingRegimen.findMany({
      where: { patientId, active: true },
      include: { product: { select: { name: true } } },
    });

    if (regimens.length === 0) {
      return { regimensChecked: 0, driftsFlagged: 0, observationIds: [] };
    }

    const allLogs = await prisma.doseLog.findMany({
      where: {
        patientId,
        loggedAt: { gte: twentyOneDaysAgo },
      },
      select: { regimenId: true, loggedAt: true },
      orderBy: { loggedAt: "desc" },
    });

    const findings: DriftFinding[] = [];

    for (const r of regimens) {
      const regimenLogs = allLogs.filter((l) => l.regimenId === r.id);
      const recentLogs = regimenLogs.filter(
        (l) => l.loggedAt >= sevenDaysAgo,
      );
      const baselineLogs = regimenLogs.filter(
        (l) => l.loggedAt < sevenDaysAgo,
      );

      const expected7 = r.frequencyPerDay * 7;
      const expected14Baseline = r.frequencyPerDay * 14;

      const recentPct = Math.min(
        100,
        Math.round((recentLogs.length / expected7) * 100),
      );
      const baselinePct =
        baselineLogs.length === 0
          ? null
          : Math.min(
              100,
              Math.round((baselineLogs.length / expected14Baseline) * 100),
            );

      const lastLog = regimenLogs[0]?.loggedAt ?? null;
      const hoursSinceLastLog = lastLog
        ? (now.getTime() - lastLog.getTime()) / 3_600_000
        : null;

      // Regimen that started <72h ago can't have stalled yet — skip the
      // stale-dose check so a fresh prescription doesn't fire a false alarm.
      const regimenAgeHours =
        (now.getTime() - r.startDate.getTime()) / 3_600_000;

      // URGENT — stalled regimen.
      if (
        regimenAgeHours >= 72 &&
        (hoursSinceLastLog == null || hoursSinceLastLog >= 72)
      ) {
        findings.push({
          regimenId: r.id,
          productName: r.product.name,
          severity: "urgent",
          summary: `No doses logged for ${r.product.name} in ${
            hoursSinceLastLog == null
              ? "the regimen's lifetime"
              : `${Math.round(hoursSinceLastLog)} hours`
          } — the regimen has stalled.`,
          action:
            "Reach out today — confirm the patient has the product, understands the schedule, and isn't hitting a side-effect barrier.",
          metadata: {
            checkKind: "stalled",
            hoursSinceLastLog:
              hoursSinceLastLog == null ? null : Math.round(hoursSinceLastLog),
            recentPct,
            baselinePct,
          },
        });
        continue;
      }

      const baselineDrop =
        baselinePct != null ? baselinePct - recentPct : null;

      // CONCERN — real drift (significant drop) or severely low pace.
      if (
        recentPct < 30 ||
        (baselineDrop != null && baselineDrop >= 25)
      ) {
        findings.push({
          regimenId: r.id,
          productName: r.product.name,
          severity: "concern",
          summary:
            baselineDrop != null && baselineDrop >= 25
              ? `${r.product.name} adherence dropped from ${baselinePct}% to ${recentPct}% this week — a real drift, not a baseline issue.`
              : `${r.product.name} adherence at ${recentPct}% over the last 7 days — likely under-dosing the regimen.`,
          action:
            "Check in at the next visit — a short conversation about what's changed often surfaces the barrier.",
          metadata: {
            checkKind:
              baselineDrop != null && baselineDrop >= 25 ? "drift" : "low_pace",
            recentPct,
            baselinePct,
            baselineDrop,
          },
        });
        continue;
      }

      // NOTABLE — chronic middle-range (30-60%) without a recent drop.
      if (recentPct < 60) {
        findings.push({
          regimenId: r.id,
          productName: r.product.name,
          severity: "notable",
          summary: `${r.product.name} adherence holding at ${recentPct}% — consistent with the patient's baseline but below the regimen as prescribed.`,
          action:
            "Worth asking whether the prescribed frequency matches how the patient actually uses it.",
          metadata: {
            checkKind: "chronic_low",
            recentPct,
            baselinePct,
          },
        });
      }
    }

    if (findings.length === 0) {
      ctx.log("info", "No adherence drift detected", {
        regimens: regimens.length,
      });
      return {
        regimensChecked: regimens.length,
        driftsFlagged: 0,
        observationIds: [],
      };
    }

    ctx.assertCan("write.outcome.reminder");

    const observationIds: string[] = [];
    for (const f of findings) {
      const obs = await recordObservation({
        patientId,
        observedBy: "adherenceDriftDetector@1.0.0",
        observedByKind: "agent",
        category: "adherence",
        severity: f.severity,
        summary: f.summary,
        actionSuggested: f.action,
        evidence: {},
        metadata: f.metadata,
      });
      observationIds.push(obs.id);
    }

    ctx.log("info", "Adherence drift observations written", {
      count: observationIds.length,
    });

    return {
      regimensChecked: regimens.length,
      driftsFlagged: findings.length,
      observationIds,
    };
  },
};

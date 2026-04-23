// Clinical risk scoring + cohort comparisons + trend detection

// ── No-show risk ────────────────────────────────────────

export interface NoShowRiskFactors {
  priorNoShowCount: number;
  daysSinceLastVisit: number;
  appointmentTypeIsNewPatient: boolean;
  hoursUntilAppointment: number;
  isTelehealthAppointment: boolean;
  hasConfirmedAttendance: boolean;
}

export interface NoShowRisk {
  score: number; // 0-100
  level: "low" | "medium" | "high";
  factors: string[];
  recommendation: string;
}

export function calculateNoShowRisk(factors: NoShowRiskFactors): NoShowRisk {
  let score = 10;
  const reasons: string[] = [];

  if (factors.priorNoShowCount > 0) {
    score += factors.priorNoShowCount * 15;
    reasons.push(`${factors.priorNoShowCount} prior no-show${factors.priorNoShowCount > 1 ? "s" : ""}`);
  }

  if (factors.daysSinceLastVisit > 90) {
    score += 20;
    reasons.push(`${Math.round(factors.daysSinceLastVisit / 30)} months since last visit`);
  }

  if (factors.appointmentTypeIsNewPatient) {
    score += 15;
    reasons.push("New patient visit");
  }

  if (factors.hoursUntilAppointment > 72) {
    score += 10;
    reasons.push("Appointment >3 days away");
  }

  if (!factors.isTelehealthAppointment) {
    score += 5;
    reasons.push("In-person visit");
  }

  if (!factors.hasConfirmedAttendance) {
    score += 10;
    reasons.push("Not yet confirmed");
  } else {
    score = Math.max(5, score - 20);
    reasons.push("Confirmed attendance");
  }

  score = Math.min(100, Math.max(0, score));

  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  const recommendation =
    level === "high"
      ? "Call patient 24-48h before. Consider sending SMS reminder with confirmation link."
      : level === "medium"
        ? "Send automated SMS reminder 24h before. Offer reschedule option."
        : "Standard reminder flow.";

  return { score, level, factors: reasons, recommendation };
}

// ── Cohort comparison ───────────────────────────────────

export interface CohortBenchmark {
  metric: string;
  yourValue: number;
  cohortMean: number;
  cohortMedian: number;
  percentile: number; // where you rank (0-100, higher = better if metric is "positive")
  cohortSize: number;
  isDeidentified: boolean;
}

/**
 * Generate demo cohort benchmarks for a patient.
 * In production, this aggregates from the full patient population with
 * similar conditions, de-identified per HIPAA Safe Harbor.
 */
export function generateCohortBenchmarks(
  patientMetrics: Record<string, number>,
  conditionLabel: string = "chronic pain"
): CohortBenchmark[] {
  const cohortNorms: Record<string, { mean: number; median: number }> = {
    pain: { mean: 5.2, median: 5 },
    sleep: { mean: 6.8, median: 7 },
    anxiety: { mean: 4.5, median: 4 },
    mood: { mean: 7.0, median: 7 },
  };

  return Object.entries(patientMetrics).map(([metric, yourValue]) => {
    const norm = cohortNorms[metric] ?? { mean: 5, median: 5 };
    // Rough percentile calculation
    const diff = yourValue - norm.mean;
    const percentile = Math.round(50 + (diff / 10) * 100);

    return {
      metric,
      yourValue,
      cohortMean: norm.mean,
      cohortMedian: norm.median,
      percentile: Math.max(0, Math.min(100, percentile)),
      cohortSize: 342,
      isDeidentified: true,
    };
  });
}

// ── Symptom trend detection ─────────────────────────────

export interface TrendAlert {
  metric: string;
  severity: "info" | "concern" | "urgent";
  direction: "worsening" | "improving";
  summary: string;
  detail: string;
  daysObserved: number;
}

/**
 * Detect worsening trends from a series of outcome values.
 * Returns alerts if a metric has worsened for 2+ consecutive days.
 */
export function detectTrends(
  values: { metric: string; value: number; loggedAt: Date }[]
): TrendAlert[] {
  const byMetric = new Map<string, typeof values>();
  for (const v of values) {
    if (!byMetric.has(v.metric)) byMetric.set(v.metric, []);
    byMetric.get(v.metric)!.push(v);
  }

  const alerts: TrendAlert[] = [];

  for (const [metric, entries] of byMetric) {
    const sorted = [...entries].sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
    if (sorted.length < 3) continue;

    const recent = sorted.slice(0, 3);
    // For metrics where lower is better (pain, anxiety, nausea), worsening = values increasing
    const lowerIsBetter = ["pain", "anxiety", "nausea"].includes(metric);

    const isWorsening = lowerIsBetter
      ? recent[0].value > recent[1].value && recent[1].value > recent[2].value
      : recent[0].value < recent[1].value && recent[1].value < recent[2].value;

    const isImproving = lowerIsBetter
      ? recent[0].value < recent[1].value && recent[1].value < recent[2].value
      : recent[0].value > recent[1].value && recent[1].value > recent[2].value;

    if (isWorsening) {
      const severity = recent[0].value >= 8 ? "urgent" : recent[0].value >= 6 ? "concern" : "info";
      alerts.push({
        metric,
        severity,
        direction: "worsening",
        summary: `${metric} worsening over ${recent.length} days`,
        detail: `Latest value: ${recent[0].value}/10. Trend: ${recent[2].value} → ${recent[1].value} → ${recent[0].value}.`,
        daysObserved: recent.length,
      });
    } else if (isImproving) {
      alerts.push({
        metric,
        severity: "info",
        direction: "improving",
        summary: `${metric} improving over ${recent.length} days`,
        detail: `Latest value: ${recent[0].value}/10. Trend: ${recent[2].value} → ${recent[1].value} → ${recent[0].value}.`,
        daysObserved: recent.length,
      });
    }
  }

  return alerts;
}

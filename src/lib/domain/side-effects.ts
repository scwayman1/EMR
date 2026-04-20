// Side Effect Reporting — structured cannabis side-effect capture.
// Pure helpers: no Prisma, no IO. Safe to import in client + server code.
//
// Dr. Patel Directive: simple dropdown + 1-10 severity, fun to submit, easy
// to aggregate for research, reimbursement, and product-fit signals.

export type SideEffectCode =
  | "dry_mouth"
  | "drowsiness"
  | "dizziness"
  | "anxiety"
  | "headache"
  | "nausea"
  | "red_eyes"
  | "memory_fog"
  | "increased_appetite"
  | "other";

export const SIDE_EFFECT_CODES: readonly SideEffectCode[] = [
  "dry_mouth",
  "drowsiness",
  "dizziness",
  "anxiety",
  "headache",
  "nausea",
  "red_eyes",
  "memory_fog",
  "increased_appetite",
  "other",
] as const;

/**
 * Canonical code → human-readable label.
 * Keep in sync with the Prisma SideEffectCode enum.
 */
export const SIDE_EFFECT_OPTIONS: Record<SideEffectCode, string> = {
  dry_mouth: "Dry mouth",
  drowsiness: "Drowsiness",
  dizziness: "Dizziness",
  anxiety: "Anxiety",
  headache: "Headache",
  nausea: "Nausea",
  red_eyes: "Red eyes",
  memory_fog: "Memory fog",
  increased_appetite: "Increased appetite",
  other: "Other",
};

/**
 * Optional emoji per side effect — for the iOS-style UI. Kept separate so
 * the label record stays a clean code→label map.
 */
export const SIDE_EFFECT_EMOJI: Record<SideEffectCode, string> = {
  dry_mouth: "🏜️",
  drowsiness: "😴",
  dizziness: "💫",
  anxiety: "😰",
  headache: "🤕",
  nausea: "🤢",
  red_eyes: "👁️",
  memory_fog: "🌫️",
  increased_appetite: "🍕",
  other: "✏️",
};

export type SeverityBucket = "mild" | "moderate" | "severe";

/**
 * 1-3 → mild, 4-6 → moderate, 7-10 → severe.
 * Out-of-range severities clamp to the nearest bucket.
 */
export function severityBucket(severity: number): SeverityBucket {
  if (!Number.isFinite(severity)) return "mild";
  if (severity <= 3) return "mild";
  if (severity <= 6) return "moderate";
  return "severe";
}

export interface SideEffectReportLike {
  effect: SideEffectCode;
  customEffect?: string | null;
  severity: number;
  productId?: string | null;
  occurredAt?: Date | string;
}

/**
 * Resolve the display label for a side effect, honoring customEffect when
 * the code is "other".
 */
export function resolveLabel(report: SideEffectReportLike): string {
  if (report.effect === "other" && report.customEffect?.trim()) {
    return report.customEffect.trim();
  }
  return SIDE_EFFECT_OPTIONS[report.effect];
}

/**
 * Group reports by severity bucket (mild / moderate / severe).
 * Returns a record with every bucket present (empty arrays allowed).
 */
export function groupBySeverity<T extends SideEffectReportLike>(
  reports: readonly T[]
): Record<SeverityBucket, T[]> {
  const out: Record<SeverityBucket, T[]> = {
    mild: [],
    moderate: [],
    severe: [],
  };
  for (const r of reports) {
    out[severityBucket(r.severity)].push(r);
  }
  return out;
}

export interface TopSideEffectEntry {
  effect: SideEffectCode;
  label: string;
  count: number;
  avgSeverity: number; // rounded to 1 decimal
}

/**
 * Count reports by effect code and rank descending by frequency, tiebreak
 * by higher average severity, then alphabetically by label for stability.
 * Returns at most `limit` entries. "other" is grouped as a single bucket.
 */
export function topSideEffects<T extends SideEffectReportLike>(
  reports: readonly T[],
  limit = 5
): TopSideEffectEntry[] {
  if (limit <= 0 || reports.length === 0) return [];

  const buckets = new Map<SideEffectCode, { count: number; sum: number }>();
  for (const r of reports) {
    const key = r.effect;
    const prev = buckets.get(key) ?? { count: 0, sum: 0 };
    prev.count += 1;
    prev.sum += Number.isFinite(r.severity) ? r.severity : 0;
    buckets.set(key, prev);
  }

  const entries: TopSideEffectEntry[] = [];
  for (const [effect, { count, sum }] of buckets) {
    const avg = count > 0 ? sum / count : 0;
    entries.push({
      effect,
      label: SIDE_EFFECT_OPTIONS[effect],
      count,
      avgSeverity: Math.round(avg * 10) / 10,
    });
  }

  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.avgSeverity !== a.avgSeverity) return b.avgSeverity - a.avgSeverity;
    return a.label.localeCompare(b.label);
  });

  return entries.slice(0, limit);
}

/**
 * Narrow runtime guard — useful when validating untrusted form input.
 */
export function isSideEffectCode(value: unknown): value is SideEffectCode {
  return typeof value === "string" && (SIDE_EFFECT_CODES as readonly string[]).includes(value);
}

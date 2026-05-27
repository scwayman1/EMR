/**
 * NCCI / MUE compliance module — EMR-222 entrypoint
 * -------------------------------------------------
 * Re-exports the canonical implementation in `src/lib/billing/ncci-mue.ts`
 * and adds quarterly-refresh helpers used by the operator dashboard.
 *
 * The canonical file owns:
 *   - CMS CSV parsing (PTP edits + MUE limits)
 *   - DB loaders (`loadNcciCsv`, `loadMueCsv`) with quarter-tagging
 *   - Runtime resolvers + in-memory cache (1h TTL)
 *
 * This file adds:
 *   - `currentQuarter()` / `quartersBehind()` — answer "are we
 *     compliant with this quarter's tables?" without re-implementing
 *     the date math everywhere it's needed.
 *   - `refreshStatusFor()` — operator dashboard summary row.
 */

export {
  checkMueLimit,
  checkNcciPair,
  getLoadStatus,
  invalidateNcciCache,
  loadMueCsv,
  loadNcciCsv,
  parseCmsDate,
  parseCsv,
  parseMueRow,
  parseNcciRow,
  quarterFromDate,
  quarterToStartDate,
  type LoadResult,
  type MueCheckResult,
  type NcciCheckResult,
  type ParsedMueRow,
  type ParsedNcciRow,
} from "../ncci-mue";

import {
  getLoadStatus,
  quarterFromDate,
  quarterToStartDate,
} from "../ncci-mue";

// ---------------------------------------------------------------------------
// Quarterly refresh helpers
// ---------------------------------------------------------------------------

/** The CMS quarter we *should* be running today. CMS publishes quarterly
 *  with a 30-day blackout grace period — claims processed within 30 days
 *  of a quarter boundary may use either. We always report the new
 *  quarter as soon as it begins; the freshness check below is what
 *  enforces the grace window. */
export function currentQuarter(now: Date = new Date()): string {
  return quarterFromDate(now);
}

/** Number of full quarters between `loadedQuarter` and `now`. Zero means
 *  we're current; ≥ 1 means we should refresh. */
export function quartersBehind(loadedQuarter: string | null | undefined, now: Date = new Date()): number {
  if (!loadedQuarter) return Infinity;
  const loadedStart = quarterToStartDate(loadedQuarter);
  const currentStart = quarterToStartDate(quarterFromDate(now));
  const monthDiff =
    (currentStart.getUTCFullYear() - loadedStart.getUTCFullYear()) * 12 +
    (currentStart.getUTCMonth() - loadedStart.getUTCMonth());
  return Math.max(0, Math.floor(monthDiff / 3));
}

/** Stale = the quarter we shipped is more than one quarter behind today
 *  AND we're past the 30-day grace window. */
export function isLoadStatusStale(
  loadedQuarter: string | null | undefined,
  loadedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!loadedQuarter || !loadedAt) return true;
  const behind = quartersBehind(loadedQuarter, now);
  if (behind === 0) return false;
  const currentStart = quarterToStartDate(quarterFromDate(now));
  const daysIntoQuarter = Math.floor((now.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000));
  // Within the first 30 days of a new quarter, the prior quarter's tables
  // are still acceptable. Past day 30, the load is officially stale.
  return behind > 1 || daysIntoQuarter > 30;
}

export interface RefreshStatusRow {
  table: "ncci" | "mue";
  loadedQuarter: string | null;
  rowCount: number;
  loadedAt: Date | null;
  currentQuarter: string;
  quartersBehind: number;
  stale: boolean;
}

/** Operator-dashboard friendly snapshot — one row per table with a
 *  staleness flag the UI can paint red. */
export async function refreshStatusFor(now: Date = new Date()): Promise<RefreshStatusRow[]> {
  const status = await getLoadStatus();
  const cur = currentQuarter(now);
  const make = (table: "ncci" | "mue", row: { quarter: string; rowCount: number; loadedAt: Date } | null): RefreshStatusRow => ({
    table,
    loadedQuarter: row?.quarter ?? null,
    rowCount: row?.rowCount ?? 0,
    loadedAt: row?.loadedAt ?? null,
    currentQuarter: cur,
    quartersBehind: quartersBehind(row?.quarter ?? null, now),
    stale: isLoadStatusStale(row?.quarter ?? null, row?.loadedAt ?? null, now),
  });
  return [make("ncci", status.ncci), make("mue", status.mue)];
}

// CSV serialisation for de-identified research cohort exports.
//
// Consumers (research / insurance / pharma data workflows) rely on a
// STABLE column order. Any change here is a breaking change to the
// external data contract — bump the version column header in
// documentation before doing so.
//
// Column order (documented contract, do not reorder without a migration):
//
//   1.  pseudonym_id        — stable SHA-256(salt:patientId) truncated to 16 hex
//   2.  age_bucket          — 5-year band ("30-34") or empty
//   3.  gender              — self-reported or empty
//   4.  state               — US state code or empty
//   5.  condition           — primary condition label or empty
//   6.  icd10_code          — ICD-10 code or empty
//   7.  treatment_summary   — structured regimen summary or empty
//   8.  cannabinoids        — semicolon-joined, sorted, e.g. "CBD;THC"
//   9.  outcome_event_count — integer total of outcome events in window
//   10. metric_<name>_count — one triple per metric, alphabetically ordered
//   11. metric_<name>_mean
//   12. metric_<name>_min
//   13. metric_<name>_max
//
// The metric_* triples depend on which metrics appear in the dataset, so
// the header row is derived from the rows passed to `toCohortCsv`.
// Serialisation is streaming-friendly: `streamCohortCsv` yields lines
// one at a time so the route handler can pipe straight into the HTTP
// response without buffering the whole cohort in memory.

import type { CohortRow, OutcomeAggregate } from "./cohort-export";

// ──────────────────────────────────────────────────────────────────────
// Column contract
// ──────────────────────────────────────────────────────────────────────

/**
 * The fixed prefix columns. Order is load-bearing — consumers index by
 * position in some pipelines.
 */
export const FIXED_COLUMNS = [
  "pseudonym_id",
  "age_bucket",
  "gender",
  "state",
  "condition",
  "icd10_code",
  "treatment_summary",
  "cannabinoids",
  "outcome_event_count",
] as const;

const METRIC_SUFFIXES = ["count", "mean", "min", "max"] as const;

/**
 * Collect the distinct metric names across all rows, sorted
 * alphabetically so column placement is deterministic.
 */
export function collectMetricNames(
  rows: ReadonlyArray<CohortRow>,
): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    for (const o of r.outcomes) s.add(o.metric);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

/**
 * Build the header array for a given set of rows.
 */
export function buildHeader(rows: ReadonlyArray<CohortRow>): string[] {
  const metrics = collectMetricNames(rows);
  const header: string[] = [...FIXED_COLUMNS];
  for (const m of metrics) {
    for (const suffix of METRIC_SUFFIXES) {
      header.push(`metric_${m}_${suffix}`);
    }
  }
  return header;
}

// ──────────────────────────────────────────────────────────────────────
// Cell escaping
// ──────────────────────────────────────────────────────────────────────

/**
 * RFC 4180-compliant CSV escaping. Wraps in double quotes when the cell
 * contains a comma, quote, CR, or LF; doubles embedded quotes.
 */
export function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ──────────────────────────────────────────────────────────────────────
// Row rendering
// ──────────────────────────────────────────────────────────────────────

function indexOutcomes(
  outcomes: ReadonlyArray<OutcomeAggregate>,
): Map<string, OutcomeAggregate> {
  const m = new Map<string, OutcomeAggregate>();
  for (const o of outcomes) m.set(o.metric, o);
  return m;
}

function rowCells(row: CohortRow, metrics: ReadonlyArray<string>): string[] {
  const byMetric = indexOutcomes(row.outcomes);
  const cells: string[] = [
    escapeCell(row.pseudonymId),
    escapeCell(row.ageBucket ?? ""),
    escapeCell(row.gender ?? ""),
    escapeCell(row.state ?? ""),
    escapeCell(row.condition ?? ""),
    escapeCell(row.icd10Code ?? ""),
    escapeCell(row.treatmentSummary ?? ""),
    // cannabinoids joined with ; so a single CSV cell holds the set
    escapeCell(row.cannabinoids.join(";")),
    escapeCell(row.outcomeEventCount),
  ];
  for (const m of metrics) {
    const agg = byMetric.get(m);
    cells.push(escapeCell(agg ? agg.count : ""));
    cells.push(escapeCell(agg ? agg.mean : ""));
    cells.push(escapeCell(agg ? agg.min : ""));
    cells.push(escapeCell(agg ? agg.max : ""));
  }
  return cells;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Serialise the full cohort as a single CSV string. Useful for tests and
 * small exports. Terminates with a trailing newline for POSIX tool
 * compatibility.
 */
export function toCohortCsv(rows: ReadonlyArray<CohortRow>): string {
  const chunks: string[] = [];
  for (const line of streamCohortCsv(rows)) {
    chunks.push(line);
  }
  return chunks.join("");
}

/**
 * Streaming generator — yields the CSV one line at a time (each line
 * already ends in `\n`). The route handler converts this to a
 * ReadableStream so very large cohorts don't buffer in memory.
 *
 * Empty input still yields a header row (with only the fixed columns)
 * — a CSV with headers and no data is a valid, common artifact.
 */
export function* streamCohortCsv(
  rows: ReadonlyArray<CohortRow>,
): Generator<string> {
  const metrics = collectMetricNames(rows);
  const header: string[] = [...FIXED_COLUMNS];
  for (const m of metrics) {
    for (const suffix of METRIC_SUFFIXES) header.push(`metric_${m}_${suffix}`);
  }
  yield header.map(escapeCell).join(",") + "\n";
  for (const r of rows) {
    yield rowCells(r, metrics).join(",") + "\n";
  }
}

/**
 * Convenience: adapt the streaming generator into a Web ReadableStream
 * of UTF-8 bytes — the exact shape Next.js route handlers want.
 */
export function toCohortCsvStream(
  rows: ReadonlyArray<CohortRow>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const iter = streamCohortCsv(rows);
  return new ReadableStream({
    pull(controller) {
      const next = iter.next();
      if (next.done) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(next.value));
      }
    },
  });
}

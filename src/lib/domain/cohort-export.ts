// Research cohort export — de-identified patient data for efficacy studies.
//
// This module fulfills CLAUDE.md "Data Reuse Targets / Research":
//
//   > De-identified cohort data for efficacy studies.
//
// Design principles:
//   1. Framework-free. Everything here is pure TypeScript — no Next, no
//      Prisma types in the signature. Tests exercise the logic in isolation;
//      the Prisma-bound adapter lives in the route handler.
//   2. PII never leaves this module. Name, email, phone, address, and the
//      real patientId are stripped by `deidentifyPatient` before a row is
//      ever produced. `exportCohort` composes that helper with outcome +
//      treatment aggregation, so there is a single choke-point and a single
//      place to audit.
//   3. Demographics are generalised, not erased. Age is bucketed into 5-year
//      bands (HIPAA Safe Harbor allows age < 90 with no date, so 5-year bands
//      are strictly more protective). Gender passes through when the patient
//      self-identified, otherwise is omitted.
//   4. Stable pseudonyms. The same (patientId, organizationSalt) always maps
//      to the same pseudonymId, so researchers can re-join rows across
//      multiple exports of the same cohort without us ever surfacing the
//      real ID.
//
// What is explicitly NOT exported:
//   - Names, emails, phone numbers, addresses, postal codes
//   - Free-text notes / treatment plans (may contain PHI)
//   - Exact date of birth, exact visit timestamps (only bucketed/aggregate)
//   - The patient's raw database ID
//
// See cohort-export.test.ts — the PII-leak regression test is the
// non-negotiable guarantee this module offers.

import { createHash } from "node:crypto";

// ──────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────

/**
 * Filter applied server-side before rows are produced. All fields optional
 * — an empty filter exports every patient in the organisation.
 *
 *   condition    Substring match (case-insensitive) against the patient's
 *                primary condition code or label. e.g. "chronic pain".
 *   dateRange    Limits the outcomes / treatment data to events whose
 *                `loggedAt` falls within [start, end] inclusive. Patients
 *                with no events in the range are still emitted (with empty
 *                aggregates) so researchers can compute denominators.
 *   cannabinoids List of cannabinoid keywords (e.g. ["THC", "CBD", "CBG"]).
 *                A patient is included only if at least one active regimen
 *                mentions any of the listed cannabinoids in its treatment
 *                summary. Case-insensitive.
 */
export interface CohortFilter {
  condition?: string;
  dateRange?: { start: Date; end: Date };
  cannabinoids?: string[];
}

/**
 * Input shape. This is the minimum structured data the adapter must hand
 * to `exportCohort`. We deliberately accept a plain structure rather than
 * a Prisma model so the domain layer stays framework-free.
 *
 * Sensitive fields (firstName, lastName, email, phone, addressLine1,
 * addressLine2, city, postalCode) are intentionally part of this input —
 * so the adapter has a realistic type to bind against — but `exportCohort`
 * guarantees none of them ever reach a CohortRow. The test suite pins
 * that guarantee.
 */
export interface CohortPatientInput {
  id: string;
  organizationId: string;
  /** PHI — dropped. */
  firstName?: string | null;
  /** PHI — dropped. */
  lastName?: string | null;
  /** PHI — dropped. */
  email?: string | null;
  /** PHI — dropped. */
  phone?: string | null;
  /** PHI — dropped. */
  addressLine1?: string | null;
  /** PHI — dropped. */
  addressLine2?: string | null;
  /** PHI — dropped. */
  city?: string | null;
  /** PHI — dropped. */
  postalCode?: string | null;
  /** State is coarser than postal code and allowed under Safe Harbor. */
  state?: string | null;
  /** Used for age bucketing. Never surfaced raw. */
  dateOfBirth?: Date | null;
  /** Self-reported gender, passed through if present. */
  gender?: string | null;
  /** Short clinical label — e.g. "chronic_pain" / "Chronic pain". */
  primaryCondition?: string | null;
  /** ICD-10 code if coded. */
  icd10Code?: string | null;
  /** Aggregated treatment summary (e.g. "THC 10mg/day + CBD 20mg/day").
   *  Already structured by the adapter — do not include free-text notes. */
  treatmentSummary?: string | null;
  /** All outcome log events, already org-scoped by the adapter. */
  outcomes?: ReadonlyArray<{
    metric: string;
    value: number;
    loggedAt: Date;
  }>;
  /** List of cannabinoids active in the patient's regimens
   *  (e.g. ["THC", "CBD"]). Used for filtering. */
  cannabinoids?: ReadonlyArray<string>;
}

/**
 * De-identified row emitted to research consumers. This is the only shape
 * that should ever leave the domain module.
 */
export interface CohortRow {
  /** Stable hash of (patientId + orgSalt). Never the real id. */
  pseudonymId: string;
  /** 5-year bucket, e.g. "30-34". `null` when DOB unknown. */
  ageBucket: string | null;
  /** Self-reported gender, if known. */
  gender: string | null;
  /** US state (safe-harbor allowable), if known. */
  state: string | null;
  /** Primary clinical label, if known. */
  condition: string | null;
  /** ICD-10 code, if coded. */
  icd10Code: string | null;
  /** Structured treatment summary. */
  treatmentSummary: string | null;
  /** Active cannabinoids, deduped and sorted. */
  cannabinoids: ReadonlyArray<string>;
  /** Aggregate outcomes per metric within the filter window. */
  outcomes: OutcomeAggregate[];
  /** Total number of outcome events in the window. */
  outcomeEventCount: number;
}

/**
 * Per-metric aggregate. `mean`/`min`/`max` round to two decimals so CSV
 * output is stable and readable. `count = 0` is impossible — if a metric
 * has no events it's simply absent.
 */
export interface OutcomeAggregate {
  metric: string;
  count: number;
  mean: number;
  min: number;
  max: number;
}

// ──────────────────────────────────────────────────────────────────────
// De-identification primitives
// ──────────────────────────────────────────────────────────────────────

/**
 * One-way hash of `patientId + salt`. Uses SHA-256 truncated to 16 hex
 * chars (64 bits) — more than enough to avoid collisions within a single
 * practice's cohort, and short enough to read in a CSV.
 *
 * The org salt MUST be stable per-org. If it rotates, pseudonyms rotate,
 * which breaks longitudinal joins — so rotate only when re-pseudonymising
 * is desired.
 */
export function pseudonymize(patientId: string, salt: string): string {
  if (!patientId) throw new Error("pseudonymize: patientId required");
  if (!salt) throw new Error("pseudonymize: salt required");
  const digest = createHash("sha256")
    .update(`${salt}:${patientId}`)
    .digest("hex");
  return digest.slice(0, 16);
}

/**
 * Bucket a date of birth into a 5-year band relative to `asOf`
 * (default: now). Returns strings like "30-34", "55-59", or "90+"
 * for ages 90 and above (HIPAA Safe Harbor).
 *
 * Returns `null` when the DOB is missing or in the future.
 */
export function bucketAge(
  dob: Date | null | undefined,
  asOf: Date = new Date(),
): string | null {
  if (!dob) return null;
  const ageMs = asOf.getTime() - dob.getTime();
  if (ageMs < 0) return null;
  const age = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
  if (age < 0) return null;
  // Safe Harbor — collapse anyone 90+ into a single bucket.
  if (age >= 90) return "90+";
  const low = Math.floor(age / 5) * 5;
  const high = low + 4;
  return `${low}-${high}`;
}

/**
 * Core de-identification for a single patient record.
 *
 * Strips: firstName, lastName, email, phone, addressLine1, addressLine2,
 * city, postalCode, raw DOB, raw patient id.
 * Keeps:  pseudonymId (hashed), ageBucket (5-year), gender, state,
 *         condition, icd10Code, treatmentSummary, cannabinoids.
 *
 * Does NOT attach outcomes — that's the caller's job once they've
 * applied dateRange filtering.
 */
export function deidentifyPatient(
  patient: CohortPatientInput,
  salt: string,
): Omit<CohortRow, "outcomes" | "outcomeEventCount"> {
  return {
    pseudonymId: pseudonymize(patient.id, salt),
    ageBucket: bucketAge(patient.dateOfBirth ?? null),
    gender: normaliseString(patient.gender),
    state: normaliseString(patient.state),
    condition: normaliseString(patient.primaryCondition),
    icd10Code: normaliseString(patient.icd10Code),
    treatmentSummary: normaliseString(patient.treatmentSummary),
    cannabinoids: dedupeAndSort(patient.cannabinoids ?? []),
  };
}

function normaliseString(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const trimmed = String(v).trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dedupeAndSort(items: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  for (const i of items) {
    const v = i.trim();
    if (v) seen.add(v);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

// ──────────────────────────────────────────────────────────────────────
// Aggregation helpers
// ──────────────────────────────────────────────────────────────────────

function aggregateOutcomes(
  events: ReadonlyArray<{ metric: string; value: number; loggedAt: Date }>,
  dateRange: { start: Date; end: Date } | undefined,
): { aggregates: OutcomeAggregate[]; totalCount: number } {
  const byMetric = new Map<string, { count: number; sum: number; min: number; max: number }>();
  let total = 0;
  for (const ev of events) {
    if (dateRange) {
      const t = ev.loggedAt.getTime();
      if (t < dateRange.start.getTime() || t > dateRange.end.getTime()) continue;
    }
    const v = Number(ev.value);
    if (!Number.isFinite(v)) continue;
    total += 1;
    const m = byMetric.get(ev.metric);
    if (!m) {
      byMetric.set(ev.metric, { count: 1, sum: v, min: v, max: v });
    } else {
      m.count += 1;
      m.sum += v;
      if (v < m.min) m.min = v;
      if (v > m.max) m.max = v;
    }
  }
  const aggregates: OutcomeAggregate[] = [];
  for (const [metric, agg] of byMetric) {
    aggregates.push({
      metric,
      count: agg.count,
      mean: round2(agg.sum / agg.count),
      min: round2(agg.min),
      max: round2(agg.max),
    });
  }
  aggregates.sort((a, b) => a.metric.localeCompare(b.metric));
  return { aggregates, totalCount: total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ──────────────────────────────────────────────────────────────────────
// Filtering
// ──────────────────────────────────────────────────────────────────────

function matchesFilter(
  patient: CohortPatientInput,
  filter: CohortFilter,
): boolean {
  if (filter.condition) {
    const needle = filter.condition.trim().toLowerCase();
    if (needle.length > 0) {
      const hay = [
        patient.primaryCondition ?? "",
        patient.icd10Code ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
  }
  if (filter.cannabinoids && filter.cannabinoids.length > 0) {
    const haves = new Set(
      (patient.cannabinoids ?? []).map((c) => c.trim().toLowerCase()),
    );
    const wanted = filter.cannabinoids.map((c) => c.trim().toLowerCase());
    const overlap = wanted.some((w) => haves.has(w));
    if (!overlap) return false;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────────────
// Public data source contract
// ──────────────────────────────────────────────────────────────────────

/**
 * Adapter signature. The route handler binds this to Prisma; tests bind it
 * to an in-memory array. Staying framework-free here means the test suite
 * can exercise every branch without booting a DB.
 *
 * Must return only patients belonging to `organizationId` — this is the
 * org-isolation choke point.
 */
export type CohortDataSource = (
  organizationId: string,
) => Promise<ReadonlyArray<CohortPatientInput>>;

/**
 * Options. `salt` MUST be org-specific (per "pseudonymize" docstring).
 * Callers are responsible for resolving it — typically a per-org secret
 * stored outside the patient record.
 */
export interface ExportCohortOptions {
  dataSource: CohortDataSource;
  salt: string;
}

/**
 * Produce the de-identified cohort for a given org + filter.
 *
 * Ordering: rows come back sorted by `pseudonymId` (stable ASCII order) so
 * the CSV output is deterministic across runs — researchers diffing two
 * snapshots will only see semantic deltas, not row-reordering noise.
 */
export async function exportCohort(
  organizationId: string,
  filter: CohortFilter,
  opts: ExportCohortOptions,
): Promise<CohortRow[]> {
  if (!organizationId) throw new Error("exportCohort: organizationId required");
  if (!opts?.dataSource) throw new Error("exportCohort: dataSource required");
  if (!opts?.salt) throw new Error("exportCohort: salt required");

  const patients = await opts.dataSource(organizationId);

  const rows: CohortRow[] = [];
  for (const p of patients) {
    // Defence-in-depth: if the data source leaks a different org, drop it.
    if (p.organizationId && p.organizationId !== organizationId) continue;
    if (!matchesFilter(p, filter)) continue;

    const base = deidentifyPatient(p, opts.salt);
    const { aggregates, totalCount } = aggregateOutcomes(
      p.outcomes ?? [],
      filter.dateRange,
    );
    rows.push({
      ...base,
      outcomes: aggregates,
      outcomeEventCount: totalCount,
    });
  }

  rows.sort((a, b) => a.pseudonymId.localeCompare(b.pseudonymId));
  return rows;
}

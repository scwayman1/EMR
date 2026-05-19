// EMR-646 — Universal patient search.
//
// One shared helper used everywhere a clinician (or any operator) needs
// to look up a Patient by free-form text. Replaces the half-dozen ad-hoc
// `firstName.contains` patterns scattered across server actions today.
//
// Match rules (per spec):
//   - Partial first name        (case-insensitive substring)
//   - Partial last name         (case-insensitive substring)
//   - DOB in MM/DD/YYYY, M/D/YY, ISO (YYYY-MM-DD)
//   - Phone w/ or w/o hyphens/spaces/parens
//   - Combined queries: `Reyes 1990` → AND(name=Reyes, dob.year=1990)
//
// Design:
//   1. `parseQuery` tokenizes raw input into:
//        - tokens : plain word/name fragments
//        - dates  : parsed Date objects (full DOBs + bare years promoted)
//        - phones : digit-only phone candidates (>= 7 digits)
//   2. `buildPatientWhereClause` turns the parsed query into a
//      Prisma.PatientWhereInput. Multiple tokens are AND'd; within each
//      token we OR across all possible match shapes (first/last name,
//      DOB equality, phone digit substring, etc.).
//   3. `searchPatients` is the thin Prisma wrapper — accepts a scope and
//      a limit, applies the soft-delete filter, returns hydrated rows.
//
// The where-clause builder is intentionally extracted from the DB query
// helper so it can be reused by tests, server actions that need a custom
// `select`, or any caller that wants the filter without the round-trip.

import type { Prisma } from "@prisma/client";

// ── Constants ────────────────────────────────────────────────

/** Hard ceiling on `searchPatients` rows. UIs cap themselves lower. */
export const PATIENT_SEARCH_MAX_LIMIT = 100;
export const PATIENT_SEARCH_DEFAULT_LIMIT = 25;

/**
 * Minimum digits required to treat a token as a phone candidate. Below
 * this we leave the digits in the `tokens` list and let them flow into
 * date-year matching instead — a 4-digit token alone is almost always a
 * year, not a phone fragment.
 */
const PHONE_MIN_DIGITS = 7;

/**
 * 2-digit year cutoff. Years <= this are interpreted as 20xx, otherwise
 * 19xx. Matches the common US clinical convention — a patient born in
 * 2024 (24) is far more likely than 1924, but 1980 (80) is the obvious
 * default for `5/17/80`. Tunable.
 */
const TWO_DIGIT_YEAR_PIVOT = 30;

// ── Types ────────────────────────────────────────────────────

export interface ParsedQuery {
  /**
   * Word/name fragments. Always lower-cased; punctuation stripped.
   * Tokens that were promoted to `dates` or `phones` are NOT duplicated
   * here — each raw token is classified into exactly one bucket.
   */
  tokens: string[];
  /**
   * Date hints. Includes full DOBs (MM/DD/YYYY, ISO) and bare years
   * promoted to a year-range. Year-only entries set the date to Jan 1
   * of that year so callers can `gte/lt` over a year range.
   */
  dates: Date[];
  /** Digit-only phone candidates (>= PHONE_MIN_DIGITS). */
  phones: string[];
}

export interface SearchPatientsOptions {
  query: string;
  /** Defaults to PATIENT_SEARCH_DEFAULT_LIMIT, clamped to ceiling. */
  limit?: number;
  /**
   * Restrict the search to a single organization. The clinic UI passes
   * the current org id; cross-tenant callers (super-admin) omit it.
   */
  scope?: { organizationId?: string };
  /** Set true to include soft-deleted rows. Defaults to false. */
  includeDeleted?: boolean;
}

/**
 * Narrow Prisma surface used by `searchPatients`. Typed against the
 * generated client so we get real intellisense, but expressed as just
 * the one method we depend on so tests can drop in a fake.
 */
export interface PatientSearchPrisma {
  patient: {
    findMany: (args: Prisma.PatientFindManyArgs) => Promise<
      Array<{
        id: string;
        firstName: string;
        lastName: string;
        dateOfBirth: Date | null;
        phone: string | null;
        email: string | null;
        organizationId: string;
      }>
    >;
  };
}

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  phone: string | null;
  email: string | null;
  organizationId: string;
}

// ── Parsing ──────────────────────────────────────────────────

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Expand a 2-digit year to a 4-digit year using the TWO_DIGIT_YEAR_PIVOT.
 * `80` → 1980, `15` → 2015, `30` → 2030.
 */
function expandTwoDigitYear(yy: number): number {
  return yy <= TWO_DIGIT_YEAR_PIVOT ? 2000 + yy : 1900 + yy;
}

/**
 * Try to parse a single token as a date. Recognised shapes:
 *   - YYYY-MM-DD     (ISO)
 *   - MM/DD/YYYY
 *   - M/D/YY  + M/D/YYYY
 *   - MM-DD-YYYY     (US-style with dashes — less common but tolerated)
 *   - YYYY           (bare year → Jan 1 of that year)
 *
 * Returns null when the token isn't a parseable date. Constructs UTC
 * dates so test assertions are TZ-stable.
 */
function tryParseDate(token: string): Date | null {
  // ISO first — unambiguous.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token);
  if (iso) {
    const [, y, m, d] = iso;
    return makeUtcDate(Number(y), Number(m), Number(d));
  }

  // MM/DD/YYYY or MM/DD/YY (also accept `.` and `-` separators).
  const usSlash = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(token);
  if (usSlash) {
    const [, m, d, yRaw] = usSlash;
    const yNum = Number(yRaw);
    const y = yRaw!.length === 2 ? expandTwoDigitYear(yNum) : yNum;
    return makeUtcDate(y, Number(m), Number(d));
  }

  // Bare 4-digit year — only when the token has nothing else. We only
  // promote plausible-DOB years (1900..currentYear+1) to avoid eating
  // things like a 4-digit street number that happens to land in range.
  if (/^\d{4}$/.test(token)) {
    const y = Number(token);
    const thisYear = new Date().getUTCFullYear();
    if (y >= 1900 && y <= thisYear + 1) {
      return makeUtcDate(y, 1, 1);
    }
  }

  return null;
}

/**
 * Was this date built from a bare year (i.e., the caller should treat it
 * as a year range rather than a specific day)? We flag year-only dates
 * via their (month=1, day=1) + a stash on a side-channel: returning a
 * boolean alongside the Date is simpler than monkey-patching.
 *
 * In practice, callers detect "year-only" by checking month + day. We
 * expose that as a helper so `buildPatientWhereClause` doesn't need to
 * duplicate the heuristic.
 */
function isYearOnly(d: Date): boolean {
  return d.getUTCMonth() === 0 && d.getUTCDate() === 1;
}

function makeUtcDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject impossible dates (e.g. 2/30 → JS rolls forward; we want null).
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Tokenize a raw query into the three sub-buckets. Each whitespace-
 * separated piece is classified into exactly one of:
 *
 *   - phone  : digitsOnly(piece).length >= PHONE_MIN_DIGITS
 *   - date   : tryParseDate(piece) !== null
 *   - token  : otherwise
 *
 * This single-bucket rule keeps the where-clause AND/OR shape predictable.
 */
export function parseQuery(input: string): ParsedQuery {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return { tokens: [], dates: [], phones: [] };
  }

  // First pass: extract anything that parses as a date out of the
  // whitespace-split pieces. Done BEFORE the phone-shape extraction so
  // ISO dates like `1980-05-17` aren't accidentally consumed as a phone
  // number (10 digits with dashes — same shape as `555-123-4567`).
  const phones: string[] = [];
  const tokens: string[] = [];
  const dates: Date[] = [];

  const pieces = trimmed.split(/\s+/).filter(Boolean);
  const datePieces = new Set<string>();
  for (const piece of pieces) {
    const parsedDate = tryParseDate(piece);
    if (parsedDate) {
      dates.push(parsedDate);
      datePieces.add(piece);
    }
  }

  // Second pass: phone-shaped substrings on the remainder. We rebuild a
  // working string from non-date pieces so `(555) 123-4567` can survive
  // across the whitespace boundary inside the parens.
  const remainder = pieces.filter((p) => !datePieces.has(p)).join(" ");
  const phoneShaped = /(?:\+?\d[\d\s().\-]{6,}\d)/g;
  const wordRemainder = remainder.replace(phoneShaped, (match) => {
    const d = digitsOnly(match);
    if (d.length >= PHONE_MIN_DIGITS) {
      phones.push(d);
      return " ";
    }
    return match;
  });

  for (const piece of wordRemainder.split(/\s+/).filter(Boolean)) {
    // Plain word — keep it. We do NOT lowercase here; case sensitivity
    // is handled by Prisma's `mode: "insensitive"` at query time.
    tokens.push(piece);
  }

  return { tokens, dates, phones };
}

// ── Where-clause builder ─────────────────────────────────────

/**
 * Sentinel WHERE that always matches zero rows. Used as the default for
 * empty queries — safer than returning `{}` which would page through
 * every patient in the database.
 */
const EMPTY_QUERY_WHERE: Prisma.PatientWhereInput = { id: { in: [] } };

/**
 * Build the OR group for a single name/word token. We match against
 * first name AND last name (substring, case-insensitive). Phone digits
 * are handled separately by the phone path.
 */
function nameOrGroup(token: string): Prisma.PatientWhereInput {
  return {
    OR: [
      { firstName: { contains: token, mode: "insensitive" } },
      { lastName: { contains: token, mode: "insensitive" } },
    ],
  };
}

/**
 * Build the OR group for a single phone digit string. We match by
 * suffix-equivalence: stored phones may have separators, so we use a
 * `contains` filter on the digit-stripped string. (Prisma can't index a
 * regex, but `contains` on a normalised column is index-friendly when
 * the column is denormalised; for now, a plain ilike works fine on the
 * scale we have today.)
 */
function phoneOrGroup(digits: string): Prisma.PatientWhereInput {
  return {
    OR: [
      // Direct substring match against the raw stored value.
      { phone: { contains: digits } },
      // Tolerate stored values that contain separators by matching
      // against a few common formats. This is a best-effort fallback —
      // production should run a one-time backfill to normalize the
      // phone column, after which the first clause suffices.
      { phone: { contains: formatPhoneWithDashes(digits) } },
      { phone: { contains: formatPhoneWithParens(digits) } },
    ],
  };
}

function formatPhoneWithDashes(d: string): string {
  if (d.length < 10) return d;
  return `${d.slice(-10, -7)}-${d.slice(-7, -4)}-${d.slice(-4)}`;
}
function formatPhoneWithParens(d: string): string {
  if (d.length < 10) return d;
  return `(${d.slice(-10, -7)}) ${d.slice(-7, -4)}-${d.slice(-4)}`;
}

/**
 * Build the OR group for a single date hint. Year-only dates expand
 * into a year-range filter (gte Jan 1 / lt Jan 1 of next year). Full
 * DOBs match the day exactly — encoded as a 1-day range so DB-side
 * timezone shifts don't cause near-midnight misses.
 */
function dateOrGroup(d: Date): Prisma.PatientWhereInput {
  if (isYearOnly(d)) {
    const y = d.getUTCFullYear();
    return {
      dateOfBirth: {
        gte: new Date(Date.UTC(y, 0, 1)),
        lt: new Date(Date.UTC(y + 1, 0, 1)),
      },
    };
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return {
    dateOfBirth: {
      gte: new Date(Date.UTC(y, m, day)),
      lt: new Date(Date.UTC(y, m, day + 1)),
    },
  };
}

/**
 * Turn a raw query string into a Prisma where filter. The shape is:
 *
 *   { AND: [
 *       { OR: [ /* token 1 expansions *​/ ] },
 *       { OR: [ /* token 2 expansions *​/ ] },
 *       ...
 *   ]}
 *
 * which gives us "every parsed piece of the query must match at least
 * one field on the patient." Returns `EMPTY_QUERY_WHERE` for blank
 * input so callers don't accidentally enumerate every patient.
 */
export function buildPatientWhereClause(
  input: string,
): Prisma.PatientWhereInput {
  const parsed = parseQuery(input);
  const groups: Prisma.PatientWhereInput[] = [];

  for (const token of parsed.tokens) {
    groups.push(nameOrGroup(token));
  }
  for (const phone of parsed.phones) {
    groups.push(phoneOrGroup(phone));
  }
  for (const d of parsed.dates) {
    groups.push(dateOrGroup(d));
  }

  if (groups.length === 0) {
    return EMPTY_QUERY_WHERE;
  }

  return { AND: groups };
}

// ── DB-touching helper ───────────────────────────────────────

/**
 * Run a patient search against Prisma. Applies the soft-delete filter,
 * scopes to organizationId when supplied, and clamps the result limit.
 *
 * The caller is responsible for auth — this helper assumes the caller
 * has already verified the actor is allowed to see patients in the
 * given scope.
 */
export async function searchPatients(
  db: PatientSearchPrisma,
  options: SearchPatientsOptions,
): Promise<PatientSearchResult[]> {
  const queryWhere = buildPatientWhereClause(options.query);

  // Short-circuit empty queries — saves a DB round-trip for the very
  // common "user cleared the input" case. The sentinel where would
  // return zero rows anyway, but skipping the call is cheaper.
  if (isEmptyQueryWhere(queryWhere)) {
    return [];
  }

  const limit = clampLimit(
    options.limit ?? PATIENT_SEARCH_DEFAULT_LIMIT,
  );

  const scopeWhere: Prisma.PatientWhereInput = {};
  if (options.scope?.organizationId) {
    scopeWhere.organizationId = options.scope.organizationId;
  }
  if (!options.includeDeleted) {
    scopeWhere.deletedAt = null;
  }

  const where: Prisma.PatientWhereInput = {
    ...scopeWhere,
    ...queryWhere,
  };

  return db.patient.findMany({
    where,
    take: limit,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      organizationId: true,
    },
  });
}

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return PATIENT_SEARCH_DEFAULT_LIMIT;
  return Math.min(Math.floor(n), PATIENT_SEARCH_MAX_LIMIT);
}

function isEmptyQueryWhere(where: Prisma.PatientWhereInput): boolean {
  const id = (where as { id?: { in?: unknown[] } }).id;
  return Array.isArray(id?.in) && id.in.length === 0;
}

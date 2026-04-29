/**
 * Lockbox / bank-deposit reconciliation — EMR-224
 * -----------------------------------------------
 * Closing the day's books means matching every payment posted to the
 * ledger to a real-world bank deposit. This module is the pure layer:
 *
 *   - Bank-statement parsers: CSV (most banks), OFX (Quicken-flavour),
 *     BAI2 (legacy banks). Each one normalizes to `BankDepositRow`.
 *   - Matching: greedy match-by-amount-and-date with a configurable
 *     window. ERA totals + patient-payment batches are the candidates;
 *     a deposit may be filled by 1..N candidates (lockbox banks
 *     consolidate same-day receipts).
 *   - Variance reporting: any deposit not fully matched lands on the
 *     daily-close exception list (EMR-230).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankDepositRow {
  /** Bank-side trace identifier — must be unique per institution. */
  bankReference: string;
  depositDate: Date;
  amountCents: number;
  source: "lockbox" | "ach" | "wire" | "branch" | "other";
  rawLine: string;
}

/** A candidate the matcher can attribute deposit dollars to.
 *  Either an ERA file (insurance payment) or a patient payment batch. */
export interface MatchCandidate {
  kind: "era" | "payment";
  /** Foreign-key id for the candidate. */
  id: string;
  /** Money in. */
  amountCents: number;
  /** Date the practice expected the funds (ERA receivedAt or payment paymentDate). */
  expectedDate: Date;
  /** Free-text label for the matcher's reason string. */
  label: string;
}

export interface MatchAssignment {
  candidate: MatchCandidate;
  appliedCents: number;
}

export interface MatchOutcome {
  status: "matched" | "partially_matched" | "unmatched" | "variance";
  assignments: MatchAssignment[];
  matchedCents: number;
  varianceCents: number;
  reason: string;
}

export interface ParsedBankFile {
  rows: BankDepositRow[];
  errors: Array<{ row: number; message: string }>;
}

// ---------------------------------------------------------------------------
// Parsers — CSV (header-based)
// ---------------------------------------------------------------------------

/** Parse a generic bank-export CSV. Looks for headers `date`, `amount`,
 *  `description`, `reference`. Most US banks export columns close to
 *  this — exact column names are configurable per-bank later. */
export function parseBankCsv(csv: string): ParsedBankFile {
  const lines = csv.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  const rows: BankDepositRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  if (lines.length === 0) return { rows, errors };

  const header = splitCsv(lines[0]).map((s) => s.trim().toLowerCase());
  const idx = {
    date: findCol(header, ["date", "posted_date", "transaction_date"]),
    amount: findCol(header, ["amount", "credit", "deposit_amount"]),
    desc: findCol(header, ["description", "memo", "narrative"]),
    ref: findCol(header, ["reference", "trace", "transaction_id", "id", "deposit_id"]),
  };
  if (idx.date < 0 || idx.amount < 0) {
    errors.push({ row: 1, message: "CSV must contain a date and amount column" });
    return { rows, errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsv(lines[i]);
    const dateRaw = cells[idx.date]?.trim();
    const amountRaw = cells[idx.amount]?.trim();
    if (!dateRaw || !amountRaw) {
      errors.push({ row: i + 1, message: "missing date or amount" });
      continue;
    }
    const depositDate = parseLooseDate(dateRaw);
    if (!depositDate) {
      errors.push({ row: i + 1, message: `unparseable date '${dateRaw}'` });
      continue;
    }
    const amount = parseFloat(amountRaw.replace(/[$,]/g, ""));
    if (!Number.isFinite(amount) || amount === 0) {
      errors.push({ row: i + 1, message: `invalid amount '${amountRaw}'` });
      continue;
    }
    // Skip non-deposits — only credits (positive amounts) are relevant.
    if (amount < 0) continue;
    const desc = idx.desc >= 0 ? cells[idx.desc] ?? "" : "";
    const ref = idx.ref >= 0 ? cells[idx.ref] ?? "" : "";
    const bankReference = ref || `${formatYmd(depositDate)}-${Math.round(amount * 100)}-${i}`;
    rows.push({
      bankReference,
      depositDate,
      amountCents: Math.round(amount * 100),
      source: classifySource(desc),
      rawLine: lines[i],
    });
  }
  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Parsers — BAI2 (record-type 16 = deposit credit)
// ---------------------------------------------------------------------------

/** Parse a BAI2 (Bank Administration Institute Cash Management Balance
 *  Reporting v2) file. Only record types that affect deposits are
 *  surfaced: 16 (transaction detail) credits, with the file/group/account
 *  envelope used only for date context. */
export function parseBai2(payload: string): ParsedBankFile {
  const lines = payload.replace(/\r\n?/g, "\n").split("\n");
  const rows: BankDepositRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let groupDate: Date | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = line.split(",");
    const recType = fields[0];
    if (recType === "02") {
      // group header — group as-of date is field 5 (yyMMdd).
      const d = fields[4];
      if (d) groupDate = parseYymmdd(d);
    } else if (recType === "16") {
      // transaction detail. fields:
      //  16, type-code, amount-cents, funds-type, bank-ref, customer-ref, text/
      const typeCode = fields[1];
      const amountRaw = fields[2];
      const bankRef = (fields[4] ?? "").replace(/\/$/, "").trim();
      // BAI2 deposit credit type codes: 100 (total credits), 115 (lockbox
      // deposit), 116 (ACH credit received), 165 (preauthorized ACH
      // credit), 195 (deposit-incoming wire). Treat any 1xx code as a
      // candidate; 4xx are debits we ignore here.
      if (!typeCode || !typeCode.startsWith("1")) continue;
      const amount = parseInt(amountRaw ?? "0", 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push({ row: i + 1, message: `invalid BAI2 amount '${amountRaw}'` });
        continue;
      }
      const date = groupDate ?? new Date();
      const ref = bankRef || `BAI2-${formatYmd(date)}-${amount}-${i}`;
      rows.push({
        bankReference: ref,
        depositDate: date,
        amountCents: amount,
        source: typeCode === "115" ? "lockbox" : typeCode === "195" ? "wire" : "ach",
        rawLine: line,
      });
    }
  }
  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Parsers — OFX (limited, just credit STMTTRN entries)
// ---------------------------------------------------------------------------

export function parseOfx(payload: string): ParsedBankFile {
  const rows: BankDepositRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  // Quick & dirty: extract <STMTTRN> blocks via regex. Sufficient for
  // standard OFX 1.x SGML and the 2.x XML flavours we see.
  const blocks = payload.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  blocks.forEach((block, i) => {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<\\s]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const type = get("TRNTYPE").toUpperCase();
    if (type !== "CREDIT" && type !== "DEP" && type !== "XFER") return;
    const amountStr = get("TRNAMT");
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: i + 1, message: `invalid OFX TRNAMT '${amountStr}'` });
      return;
    }
    const dposted = get("DTPOSTED");
    const date = parseOfxDate(dposted) ?? new Date();
    const fitid = get("FITID");
    const memo = get("MEMO");
    rows.push({
      bankReference: fitid || `OFX-${formatYmd(date)}-${Math.round(amount * 100)}-${i}`,
      depositDate: date,
      amountCents: Math.round(amount * 100),
      source: classifySource(memo),
      rawLine: block,
    });
  });
  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

const DEFAULT_TOLERANCE_CENTS = 2;
const DEFAULT_DATE_WINDOW_DAYS = 5;

export interface MatchOptions {
  /** Allowed variance before flagging — default 2¢. */
  toleranceCents?: number;
  /** ± days around the deposit date when picking candidates — default 5. */
  dateWindowDays?: number;
}

/** Match a single deposit against a pool of candidates.
 *
 *  Strategy: greedy pick.
 *    1. Filter candidates within ± dateWindowDays of the deposit date
 *       AND not already fully consumed.
 *    2. Try exact match (single candidate equals deposit, within
 *       tolerance). Common case for a single ERA per check.
 *    3. Otherwise fill with the largest-first knapsack approximation
 *       until the deposit is satisfied. Stop when remaining < tolerance.
 *
 *  Returns the assignments (caller persists `BankDepositMatch` rows)
 *  plus a status:
 *    - `matched`: assignments sum to deposit ± tolerance.
 *    - `partially_matched`: some assignments, residual > tolerance.
 *    - `unmatched`: no candidates contributed.
 *    - `variance`: assignments exceeded the deposit (only happens if
 *      candidates carry refund / takeback rows; flagged for human).
 */
export function matchDeposit(
  deposit: { amountCents: number; depositDate: Date },
  candidates: MatchCandidate[],
  options: MatchOptions = {},
): MatchOutcome {
  const tolerance = options.toleranceCents ?? DEFAULT_TOLERANCE_CENTS;
  const windowDays = options.dateWindowDays ?? DEFAULT_DATE_WINDOW_DAYS;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  const inWindow = candidates.filter(
    (c) => Math.abs(c.expectedDate.getTime() - deposit.depositDate.getTime()) <= windowMs,
  );

  // Exact single-candidate match
  const exact = inWindow.find(
    (c) => Math.abs(c.amountCents - deposit.amountCents) <= tolerance,
  );
  if (exact) {
    return {
      status: "matched",
      assignments: [{ candidate: exact, appliedCents: deposit.amountCents }],
      matchedCents: deposit.amountCents,
      varianceCents: 0,
      reason: `exact match: ${exact.label}`,
    };
  }

  // Largest-first greedy fill
  const sorted = [...inWindow].sort((a, b) => b.amountCents - a.amountCents);
  const assignments: MatchAssignment[] = [];
  let remaining = deposit.amountCents;
  for (const c of sorted) {
    if (remaining <= tolerance) break;
    if (c.amountCents <= 0) continue;
    if (c.amountCents <= remaining + tolerance) {
      const applied = Math.min(c.amountCents, remaining);
      assignments.push({ candidate: c, appliedCents: applied });
      remaining -= applied;
    }
  }

  const matchedCents = assignments.reduce((a, x) => a + x.appliedCents, 0);

  if (assignments.length === 0) {
    return {
      status: "unmatched",
      assignments: [],
      matchedCents: 0,
      varianceCents: deposit.amountCents,
      reason: "no candidates within date window matched the deposit amount",
    };
  }
  if (matchedCents > deposit.amountCents + tolerance) {
    return {
      status: "variance",
      assignments,
      matchedCents,
      varianceCents: matchedCents - deposit.amountCents,
      reason: `assignments exceed deposit by ${(matchedCents - deposit.amountCents) / 100}`,
    };
  }
  if (Math.abs(remaining) <= tolerance) {
    return {
      status: "matched",
      assignments,
      matchedCents,
      varianceCents: 0,
      reason: `${assignments.length}-piece match`,
    };
  }
  return {
    status: "partially_matched",
    assignments,
    matchedCents,
    varianceCents: remaining,
    reason: `${assignments.length} candidate(s) matched; ${(remaining / 100).toFixed(2)} unaccounted for`,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifySource(desc: string): BankDepositRow["source"] {
  const d = desc.toLowerCase();
  if (d.includes("lockbox") || d.includes("ach payer") || d.includes("hcfa")) return "lockbox";
  if (d.includes("wire")) return "wire";
  if (d.includes("ach")) return "ach";
  if (d.includes("branch") || d.includes("teller")) return "branch";
  return "other";
}

function findCol(header: string[], names: string[]): number {
  for (const n of names) {
    const i = header.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else cur += ch;
    } else {
      if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else if (ch === '"' && cur.length === 0) inQ = true;
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseLooseDate(s: string): Date | null {
  // YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY all accepted.
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(Date.UTC(y, +m[1] - 1, +m[2]));
  }
  return null;
}

function parseYymmdd(s: string): Date | null {
  if (s.length !== 6) return null;
  const yy = parseInt(s.slice(0, 2), 10);
  const m = parseInt(s.slice(2, 4), 10);
  const d = parseInt(s.slice(4, 6), 10);
  if (![yy, m, d].every(Number.isFinite)) return null;
  return new Date(Date.UTC(yy < 50 ? 2000 + yy : 1900 + yy, m - 1, d));
}

function parseOfxDate(s: string): Date | null {
  if (s.length < 8) return null;
  return new Date(
    Date.UTC(
      +s.slice(0, 4),
      +s.slice(4, 6) - 1,
      +s.slice(6, 8),
      s.length >= 12 ? +s.slice(8, 10) : 0,
      s.length >= 12 ? +s.slice(10, 12) : 0,
    ),
  );
}

function formatYmd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

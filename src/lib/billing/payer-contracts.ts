/**
 * Per-payer contract allowables — EMR-223
 * ----------------------------------------
 * The hardened underpayment detector currently scales fee schedule by
 * payer class (commercial / medicare). Real production compares against
 * each payer's CONTRACT — the negotiated allowable per CPT × modifier.
 *
 * This module is the pure layer over `PayerContract` + `PayerContractRate`:
 *   - `findEffectiveContract` — picks the contract effective on a DOS
 *   - `lookupContractRate`   — best (CPT, modifier) match within a contract
 *   - `evaluateUnderpayment` — flags when allowed < contractRate * threshold
 *   - `parseContractCsv`     — turn an admin-uploaded CSV into rate rows
 *
 * The Prisma reads live in the agent / page layer; this file stays pure
 * so it tests cleanly and can be reused by the underpayment-detection
 * agent without dragging Prisma into agent unit tests.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ContractRateLite {
  cptCode: string;
  modifier: string | null;
  allowedCents: number;
}

export interface ContractLite {
  id: string;
  payerId: string;
  payerName: string;
  effectiveStart: Date;
  effectiveEnd: Date | null;
  active: boolean;
  rates: ContractRateLite[];
}

export interface UnderpaymentFinding {
  /** True when allowed < contractRate * threshold. */
  underpaid: boolean;
  contractRateCents: number | null;
  allowedCents: number;
  /** Underpaid amount in cents; 0 when not underpaid or no contract. */
  shortfallCents: number;
  /** Reason this finding fires or doesn't — for audit + UI. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Contract selection
// ---------------------------------------------------------------------------

/** Pick the contract that was effective on `serviceDate`. Multiple
 *  active contracts for the same payer are allowed — the one with the
 *  latest `effectiveStart` ≤ DOS wins, and `effectiveEnd` (if set) must
 *  be ≥ DOS. Returns null when no contract covers the DOS. */
export function findEffectiveContract(
  contracts: ContractLite[],
  payerId: string,
  serviceDate: Date,
): ContractLite | null {
  const candidates = contracts
    .filter((c) => c.payerId === payerId && c.active)
    .filter((c) => c.effectiveStart.getTime() <= serviceDate.getTime())
    .filter((c) => !c.effectiveEnd || c.effectiveEnd.getTime() >= serviceDate.getTime())
    .sort((a, b) => b.effectiveStart.getTime() - a.effectiveStart.getTime());
  return candidates[0] ?? null;
}

/** Find the most specific rate row for (cpt, modifier).
 *  Resolution order:
 *    1. Exact (cpt, modifier) match
 *    2. (cpt, null) — base rate, when modifier-specific rate not on file
 *    3. null — payer hasn't loaded a rate for this CPT
 *  Modifiers like "GT" / "95" (telehealth) are commonly priced separately
 *  from the base; when both rows exist, exact wins.
 */
export function lookupContractRate(
  contract: ContractLite,
  cptCode: string,
  modifiers: string[] = [],
): ContractRateLite | null {
  // Try modifiers in the order they were billed — the first match wins.
  for (const m of modifiers) {
    const exact = contract.rates.find(
      (r) => r.cptCode === cptCode && r.modifier === m,
    );
    if (exact) return exact;
  }
  const base = contract.rates.find(
    (r) => r.cptCode === cptCode && r.modifier === null,
  );
  return base ?? null;
}

// ---------------------------------------------------------------------------
// Underpayment evaluation
// ---------------------------------------------------------------------------

/** Default threshold: flag when allowed < 95% of contract rate. */
export const UNDERPAYMENT_THRESHOLD = 0.95;

export function evaluateUnderpayment(args: {
  contract: ContractLite | null;
  cptCode: string;
  modifiers?: string[];
  allowedCents: number;
  threshold?: number;
}): UnderpaymentFinding {
  const threshold = args.threshold ?? UNDERPAYMENT_THRESHOLD;
  if (!args.contract) {
    return {
      underpaid: false,
      contractRateCents: null,
      allowedCents: args.allowedCents,
      shortfallCents: 0,
      reason: "no contract on file for this payer/DOS",
    };
  }
  const rate = lookupContractRate(args.contract, args.cptCode, args.modifiers ?? []);
  if (!rate) {
    return {
      underpaid: false,
      contractRateCents: null,
      allowedCents: args.allowedCents,
      shortfallCents: 0,
      reason: `no contract rate for CPT ${args.cptCode}`,
    };
  }
  const minAllowed = Math.round(rate.allowedCents * threshold);
  if (args.allowedCents < minAllowed) {
    return {
      underpaid: true,
      contractRateCents: rate.allowedCents,
      allowedCents: args.allowedCents,
      shortfallCents: rate.allowedCents - args.allowedCents,
      reason: `allowed $${(args.allowedCents / 100).toFixed(2)} < contract $${(rate.allowedCents / 100).toFixed(2)} (${Math.round(threshold * 100)}% floor)`,
    };
  }
  return {
    underpaid: false,
    contractRateCents: rate.allowedCents,
    allowedCents: args.allowedCents,
    shortfallCents: 0,
    reason: `within contract (${Math.round((args.allowedCents / rate.allowedCents) * 100)}% of rate)`,
  };
}

// ---------------------------------------------------------------------------
// Contract CSV ingestion
// ---------------------------------------------------------------------------

export interface ParsedContractCsv {
  rates: ContractRateLite[];
  errors: Array<{ row: number; message: string }>;
}

/** Parse an admin-uploaded contract CSV into rate rows.
 *
 *  Expected header: `cpt_code,modifier,allowed_amount[,notes]`
 *    - `cpt_code`: 5-char string ("99214")
 *    - `modifier`: empty, or a 2-char modifier ("25", "59", "95", "GT")
 *    - `allowed_amount`: dollars (e.g. "130.00") — converted to cents
 *  Lines starting with `#` and blank lines are ignored.
 */
export function parseContractCsv(csv: string): ParsedContractCsv {
  const lines = csv.replace(/\r\n?/g, "\n").split("\n");
  const errors: Array<{ row: number; message: string }> = [];
  const rates: ContractRateLite[] = [];
  let headerSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;
    const cells = parseCsvLine(raw);

    // Header detection: must be the first non-blank, non-comment line.
    if (!headerSeen) {
      headerSeen = true;
      const lower = cells.map((c) => c.toLowerCase());
      if (lower[0] === "cpt_code" || lower[0] === "cpt") {
        continue; // skip header
      }
      // No header — fall through to treat this row as data.
    }

    if (cells.length < 3) {
      errors.push({ row: i + 1, message: "row needs at least cpt_code, modifier, allowed_amount" });
      continue;
    }
    const [cptRaw, modRaw, amountRaw] = cells;
    const cpt = cptRaw.trim();
    if (!/^[0-9A-Z]{5}$/i.test(cpt)) {
      errors.push({ row: i + 1, message: `invalid CPT '${cpt}'` });
      continue;
    }
    const modifier = modRaw.trim() === "" ? null : modRaw.trim().toUpperCase();
    const dollars = parseFloat(amountRaw.replace(/[$,]/g, ""));
    if (!Number.isFinite(dollars) || dollars < 0) {
      errors.push({ row: i + 1, message: `invalid allowed amount '${amountRaw}'` });
      continue;
    }
    rates.push({
      cptCode: cpt.toUpperCase(),
      modifier,
      allowedCents: Math.round(dollars * 100),
    });
  }
  return { rates, errors };
}

/** Minimal CSV line parser — handles quoted fields and embedded commas
 *  but doesn't try to be RFC 4180 perfect. Good enough for the admin
 *  CSV loader; for hostile inputs we'd swap in `csv-parse`. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else if (ch === '"' && cur.length === 0) {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  cells.push(cur);
  return cells;
}

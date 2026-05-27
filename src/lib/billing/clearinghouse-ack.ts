/**
 * Clearinghouse acknowledgment parsing
 * ------------------------------------
 * Real EDI submission produces three acknowledgment levels:
 *
 *   1. TA1 — Interchange-level acknowledgment (very rare to see in prod
 *            code paths; the gateway handles it).
 *   2. 999 — Functional acknowledgment. "Did the file structurally
 *            validate?" One per ISA/GS envelope. Rejections here mean
 *            the clearinghouse never even passed the file to the payer.
 *   3. 277CA — Claim-level acknowledgment. "Did the payer ADR accept
 *            the claim?" Per-claim status. This is where we learn that
 *            our 837P looked valid but the payer rejected it (e.g.
 *            "invalid member id").
 *
 * V1 swaps a simulated clearinghouse for the real gateway. These
 * parsers are deliberately written to accept:
 *   - Real ANSI X12 999 / 277CA segment strings (AK* / STC* segments)
 *   - Clearinghouse-specific JSON response payloads (Availity, Waystar,
 *     Change Healthcare all wrap 277CA in their own JSON)
 *   - Simulator output (minimal JSON)
 *
 * So every gateway integration can feed this module its native format
 * and the billing agents downstream operate on the normalized shape.
 */

// ---------------------------------------------------------------------------
// 999 Functional Acknowledgment
// ---------------------------------------------------------------------------

export type Ack999Status = "accepted" | "accepted_with_errors" | "rejected" | "unknown";

export interface Parsed999 {
  status: Ack999Status;
  /** Interchange control number from the originating 837P */
  icn: string | null;
  /** Functional group control number */
  gcn: string | null;
  /** Transaction set control numbers that were rejected in the group */
  rejectedTransactionSetIds: string[];
  errors: Array<{
    segmentId: string | null;
    /** X12 element position of the bad field, if provided */
    elementPosition: number | null;
    code: string;
    message: string;
  }>;
  /** Raw payload for audit storage */
  raw: string;
}

/**
 * Parse a 999 acknowledgment. Accepts either an ANSI X12 string
 * (looks like "ISA*...AK1*HC*1~AK2*837*0001~IK5*A~AK9*A*1*1*1~IEA*1~")
 * or a JSON envelope from a commercial clearinghouse. Returns a
 * normalized Parsed999. Never throws — a malformed payload yields
 * status="unknown" with a diagnostic error appended.
 */
export function parse999(payload: string | object): Parsed999 {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const out: Parsed999 = {
    status: "unknown",
    icn: null,
    gcn: null,
    rejectedTransactionSetIds: [],
    errors: [],
    raw,
  };

  // ── JSON path (clearinghouse-native payloads) ──────────────
  if (typeof payload === "object" && payload !== null) {
    const p = payload as any;
    const status = (p.status ?? p.ack999Status ?? "").toString().toLowerCase();
    if (status === "a" || status === "accepted") out.status = "accepted";
    else if (status === "e" || status === "accepted_with_errors") out.status = "accepted_with_errors";
    else if (status === "r" || status === "rejected") out.status = "rejected";
    out.icn = p.icn ?? p.interchangeControlNumber ?? null;
    out.gcn = p.gcn ?? p.groupControlNumber ?? null;
    if (Array.isArray(p.rejectedTransactionSetIds)) {
      out.rejectedTransactionSetIds = p.rejectedTransactionSetIds.map((x: any) => String(x));
    }
    if (Array.isArray(p.errors)) {
      out.errors = p.errors.map((e: any) => ({
        segmentId: e.segmentId ?? null,
        elementPosition: typeof e.elementPosition === "number" ? e.elementPosition : null,
        code: String(e.code ?? ""),
        message: String(e.message ?? ""),
      }));
    }
    return out;
  }

  // ── X12 string path ────────────────────────────────────────
  const text = raw.replace(/\r?\n/g, "");
  // AK9 is the functional group trailer — the last char of its first
  // element is the overall ack status: A=accepted, E=errors, R=rejected,
  // P=partial. We're tolerant of either * or | segment separators.
  const ak9 = text.match(/AK9\*([AERP])/i) ?? text.match(/AK9\|([AERP])/i);
  if (ak9) {
    const code = ak9[1].toUpperCase();
    out.status =
      code === "A"
        ? "accepted"
        : code === "E" || code === "P"
          ? "accepted_with_errors"
          : "rejected";
  }
  // ISA06/ISA13 are positionally tedious — look for ISA and grab the 13th
  // element after it by splitting on the separator.
  const isaMatch = text.match(/ISA([*|])([^~]+)~/i);
  if (isaMatch) {
    const parts = isaMatch[2].split(isaMatch[1]);
    if (parts.length >= 12) out.icn = parts[12].trim();
  }
  const gsMatch = text.match(/GS([*|])([^~]+)~/i);
  if (gsMatch) {
    const parts = gsMatch[2].split(gsMatch[1]);
    if (parts.length >= 5) out.gcn = parts[5].trim();
  }
  const ak2Regex = /AK2[*|](\w+)[*|](\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = ak2Regex.exec(text)) !== null) {
    const tsId = m[2];
    if (!out.rejectedTransactionSetIds.includes(tsId)) {
      // Peek at the following IK3/IK4/IK5 segments to decide if this
      // transaction set was rejected.
      const tail = text.slice(m.index, Math.min(text.length, m.index + 400));
      const rejected = /IK5[*|](R)/i.test(tail) || /IK3[*|]/i.test(tail);
      if (rejected) out.rejectedTransactionSetIds.push(tsId);
    }
  }
  const ik3Regex = /IK3[*|](\w+)[*|](\d+)?[*|]?[^~]*~/gi;
  while ((m = ik3Regex.exec(text)) !== null) {
    out.errors.push({
      segmentId: m[1],
      elementPosition: m[2] ? parseInt(m[2], 10) : null,
      code: "IK3",
      message: `Segment ${m[1]} rejected`,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// 277CA — Claim-level acknowledgment
// ---------------------------------------------------------------------------

export type ClaimAckCategory =
  | "accepted"
  | "rejected"
  | "pending"
  | "finalized"
  | "suspended"
  | "unknown";

export interface Parsed277CaClaim {
  /** Our original claim id / claim number / control number echoed back */
  claimControlNumber: string;
  category: ClaimAckCategory;
  /** Payer/clearinghouse status codes (STC01-1, STC01-2) */
  statusCode: string | null;
  statusDescription: string | null;
  /** Dollar amounts the payer acknowledges */
  totalBilledCents: number | null;
  /** Reject reason when category=rejected */
  rejectReason: string | null;
  /** Free-text notes from the payer (STC12) */
  notes: string | null;
}

export interface Parsed277Ca {
  claims: Parsed277CaClaim[];
  raw: string;
}

const STC_CATEGORY_MAP: Record<string, ClaimAckCategory> = {
  A0: "accepted", // Acknowledgement / Forwarded
  A1: "accepted", // Acknowledgement / Receipt
  A2: "accepted",
  A3: "rejected", // Acknowledgement / Returned as unprocessable
  A4: "accepted",
  A5: "accepted",
  A6: "accepted",
  A7: "rejected",
  A8: "rejected",
  D0: "finalized",
  D1: "finalized",
  F0: "finalized",
  F1: "finalized",
  F2: "finalized",
  F3: "finalized",
  F3F: "pending",
  P0: "pending", // Pending
  P1: "pending",
  P2: "pending",
  P3: "pending",
  P4: "pending",
  P5: "pending",
  R0: "rejected", // Request for resubmission
  R1: "rejected",
  R3: "rejected",
  R4: "rejected",
  R5: "rejected",
  R6: "rejected",
  R7: "rejected",
  R8: "rejected",
  R9: "rejected",
};

/**
 * Parse a 277CA. Same input flexibility as parse999. Returns one entry
 * per claim in the acknowledgment file.
 */
export function parse277CA(payload: string | object): Parsed277Ca {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const out: Parsed277Ca = { claims: [], raw };

  // ── JSON path ───────────────────────────────────────────────
  if (typeof payload === "object" && payload !== null) {
    const p = payload as any;
    const list = Array.isArray(p.claims) ? p.claims : Array.isArray(p) ? p : [];
    for (const c of list) {
      const statusCode = (c.statusCode ?? c.stc ?? "").toString();
      const mappedCategory =
        (c.category as ClaimAckCategory | undefined) ??
        STC_CATEGORY_MAP[statusCode] ??
        "unknown";
      out.claims.push({
        claimControlNumber: String(c.claimControlNumber ?? c.claimId ?? c.controlNumber ?? ""),
        category: mappedCategory,
        statusCode: statusCode || null,
        statusDescription: c.statusDescription ?? c.description ?? null,
        totalBilledCents: typeof c.totalBilledCents === "number" ? c.totalBilledCents : null,
        rejectReason: c.rejectReason ?? (mappedCategory === "rejected" ? c.description ?? null : null),
        notes: c.notes ?? null,
      });
    }
    return out;
  }

  // ── X12 string path ─────────────────────────────────────────
  // Per claim loop: TRN*2* (trace) tells us the originator's claim id;
  // STC* gives status category. We iterate on TRN and for each one peek
  // forward for the nearest STC.
  const text = raw.replace(/\r?\n/g, "");
  const trnRegex = /TRN[*|]2[*|]([^*|~]+)/gi;
  const stcRegex = /STC[*|]([A-Z0-9]+):([A-Z0-9]+)(?:[*|:]([^~*|]+))?/i;
  let m: RegExpExecArray | null;
  while ((m = trnRegex.exec(text)) !== null) {
    const claimControlNumber = m[1].trim();
    const tail = text.slice(m.index, Math.min(text.length, m.index + 800));
    const stc = tail.match(stcRegex);
    let category: ClaimAckCategory = "unknown";
    let statusCode: string | null = null;
    if (stc) {
      statusCode = `${stc[1]}${stc[2] ? "" : ""}`;
      const combined = `${stc[1]}${stc[2] ?? ""}`;
      category = STC_CATEGORY_MAP[stc[1]] ?? STC_CATEGORY_MAP[combined] ?? "unknown";
    }
    out.claims.push({
      claimControlNumber,
      category,
      statusCode,
      statusDescription: stc?.[3] ?? null,
      totalBilledCents: null,
      rejectReason: category === "rejected" ? stc?.[3] ?? null : null,
      notes: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Combined decision helper
// ---------------------------------------------------------------------------

export type ClaimAckAction =
  | { action: "advance_to_accepted"; claimControlNumber: string }
  | { action: "resubmit"; claimControlNumber: string; reason: string }
  | { action: "mark_pending"; claimControlNumber: string }
  | { action: "investigate"; claimControlNumber: string; reason: string };

/**
 * Given a parsed 277CA, decide per claim what the fleet should do next.
 * This is the glue the clearinghouse-submission agent uses to route
 * responses back into the pipeline without embedding the decision table
 * in the agent.
 */
export function decide277Actions(ack: Parsed277Ca): ClaimAckAction[] {
  return ack.claims.map((c) => {
    switch (c.category) {
      case "accepted":
      case "finalized":
        return { action: "advance_to_accepted", claimControlNumber: c.claimControlNumber };
      case "rejected":
        return {
          action: "resubmit",
          claimControlNumber: c.claimControlNumber,
          reason: c.rejectReason ?? c.statusDescription ?? "Payer returned claim as unprocessable.",
        };
      case "pending":
      case "suspended":
        return { action: "mark_pending", claimControlNumber: c.claimControlNumber };
      default:
        return {
          action: "investigate",
          claimControlNumber: c.claimControlNumber,
          reason: `Unknown claim status code ${c.statusCode ?? "(missing)"}`,
        };
    }
  });
}

// EMR-216 — SNIP types 1–5 validator (post-build sanity check)
// ------------------------------------------------------------
// SNIP (Strategic National Implementation Process) defines 7 levels of
// HIPAA EDI validation. Clearinghouses run all 7; we run the first 5
// in-house so we catch the bulk of structural mistakes before the round
// trip.
//
//   SNIP-1: integrity      — segment terminator, balanced ISA/IEA, etc.
//   SNIP-2: requirement    — required loops/segments present per IG
//   SNIP-3: balancing      — control counts (SE segment count, IEA group
//                            count) match what was emitted
//   SNIP-4: situational    — situational rules (e.g. REF*F8 only on
//                            corrected claims)
//   SNIP-5: code-set       — values come from the published code lists
//                            (POS, claim frequency, group code, gender)
//
// SNIP-6 (product) and SNIP-7 (trading-partner) are gateway-specific and
// validated by the clearinghouse adapter (EMR-217) instead.

import { DEFAULT_DELIMITERS, type X12Delimiters } from "./x12";

export type SnipLevel = 1 | 2 | 3 | 4 | 5;

export interface SnipFinding {
  level: SnipLevel;
  segment: string | null;
  message: string;
}

export interface SnipReport {
  passed: boolean;
  findings: SnipFinding[];
}

const REQUIRED_SEGMENT_TAGS = ["ISA", "GS", "ST", "BHT", "CLM", "SE", "GE", "IEA"];

const VALID_PLACE_OF_SERVICE = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16",
  "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "31", "32", "33", "34", "35",
  "41", "42", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "60", "61", "62", "65",
  "71", "72", "81", "99",
]);

const VALID_FREQUENCY_CODES = new Set(["1", "7", "8"]);
const VALID_GENDERS = new Set(["M", "F", "U"]);
const VALID_CAS_GROUPS = new Set(["CO", "PR", "OA", "PI", "CR"]);

export function validateSnip1to5(
  payload: string,
  delimiters: X12Delimiters = DEFAULT_DELIMITERS,
): SnipReport {
  const findings: SnipFinding[] = [];

  const normalized = payload.replace(/\n/g, "");
  const segs = normalized
    .split(delimiters.segment)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // ── SNIP-1: integrity ──────────────────────────────────────────────
  if (segs.length === 0) {
    findings.push({ level: 1, segment: null, message: "Empty payload — no segments found." });
    return { passed: false, findings };
  }
  if (!segs[0].startsWith("ISA" + delimiters.element)) {
    findings.push({ level: 1, segment: segs[0]?.slice(0, 30), message: "Payload does not start with ISA segment." });
  }
  const isaCount = segs.filter((s) => s.startsWith("ISA" + delimiters.element)).length;
  const ieaCount = segs.filter((s) => s.startsWith("IEA" + delimiters.element)).length;
  if (isaCount !== ieaCount) {
    findings.push({ level: 1, segment: null, message: `Unbalanced ISA/IEA pair (${isaCount}/${ieaCount}).` });
  }

  // ── SNIP-2: required segments ─────────────────────────────────────
  for (const tag of REQUIRED_SEGMENT_TAGS) {
    if (!segs.some((s) => s.startsWith(tag + delimiters.element))) {
      findings.push({ level: 2, segment: tag, message: `Missing required segment ${tag}.` });
    }
  }

  // ── SNIP-3: balancing ─────────────────────────────────────────────
  const stIdx = segs.findIndex((s) => s.startsWith("ST" + delimiters.element));
  const seIdx = segs.findIndex((s) => s.startsWith("SE" + delimiters.element));
  if (stIdx >= 0 && seIdx >= 0) {
    const inTransaction = segs.slice(stIdx, seIdx + 1).length;
    const seParts = segs[seIdx].split(delimiters.element);
    const declaredCount = Number(seParts[1]);
    if (declaredCount !== inTransaction) {
      findings.push({
        level: 3,
        segment: "SE",
        message: `SE segment count mismatch: declared ${declaredCount}, actual ${inTransaction}.`,
      });
    }
  }

  // ── SNIP-4: situational ───────────────────────────────────────────
  // REF*F8 (original claim control number) is only valid AT THE CLM LEVEL
  // (Loop 2300) when the claim frequency code is 7 (replacement) or 8
  // (void). At the OTHER-PAYER level (Loop 2320) REF*F8 is the *primary
  // payer's* claim control number and is valid regardless of frequency —
  // the start of Loop 2320 is the first SBR after CLM, so we only check
  // REF*F8 segments that appear between CLM and that SBR boundary.
  const clmIdx = segs.findIndex((s) => s.startsWith("CLM" + delimiters.element));
  if (clmIdx >= 0) {
    const clmSeg = segs[clmIdx];
    const parts = clmSeg.split(delimiters.element);
    const composite = parts[5] ?? "";
    const freq = composite.split(delimiters.subElement)[2];

    // Find the boundary that ends Loop 2300 — first SBR after CLM (Loop
    // 2320 start) or the SE/end-of-transaction.
    let boundaryIdx = segs.length;
    for (let i = clmIdx + 1; i < segs.length; i++) {
      if (
        segs[i].startsWith("SBR" + delimiters.element) ||
        segs[i].startsWith("SE" + delimiters.element)
      ) {
        boundaryIdx = i;
        break;
      }
    }

    const claimLevelHasRefF8 = segs
      .slice(clmIdx, boundaryIdx)
      .some((s) => s.startsWith("REF" + delimiters.element + "F8"));

    if (claimLevelHasRefF8 && freq === "1") {
      findings.push({
        level: 4,
        segment: "REF*F8",
        message: "REF*F8 (original claim control number) is only valid on corrected (freq 7) or void (freq 8) claims.",
      });
    }
  }

  // ── SNIP-5: code sets ─────────────────────────────────────────────
  const clmSegForCodeSet = clmIdx >= 0 ? segs[clmIdx] : undefined;
  if (clmSegForCodeSet) {
    const parts = clmSegForCodeSet.split(delimiters.element);
    const composite = parts[5] ?? "";
    const subParts = composite.split(delimiters.subElement);
    const pos = subParts[0];
    const freq = subParts[2];
    if (pos && !VALID_PLACE_OF_SERVICE.has(pos)) {
      findings.push({ level: 5, segment: "CLM", message: `Invalid place-of-service code "${pos}".` });
    }
    if (freq && !VALID_FREQUENCY_CODES.has(freq)) {
      findings.push({ level: 5, segment: "CLM", message: `Invalid claim frequency code "${freq}".` });
    }
  }
  for (const seg of segs) {
    if (seg.startsWith("DMG" + delimiters.element)) {
      const parts = seg.split(delimiters.element);
      const gender = parts[3];
      if (gender && !VALID_GENDERS.has(gender)) {
        findings.push({ level: 5, segment: "DMG", message: `Invalid gender code "${gender}".` });
      }
    }
    if (seg.startsWith("CAS" + delimiters.element)) {
      const parts = seg.split(delimiters.element);
      const grp = parts[1];
      if (grp && !VALID_CAS_GROUPS.has(grp)) {
        findings.push({ level: 5, segment: "CAS", message: `Invalid claim adjustment group code "${grp}".` });
      }
    }
  }

  return { passed: findings.length === 0, findings };
}

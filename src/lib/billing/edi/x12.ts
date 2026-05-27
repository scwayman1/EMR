// EMR-216 — ANSI X12 v5010 segment + envelope primitives
// ------------------------------------------------------
// Low-level primitives for emitting valid X12 documents. All character-set
// + length enforcement lives here so the higher-level 837P loop builder can
// just compose segments without re-implementing escaping every time.
//
// Default delimiters (ASCII):
//   element  separator: "*"
//   sub-element sep:    ":"
//   segment  terminator: "~"
//   repetition sep:     "^"
//
// X12 v5010 character set:
//   - Basic + Extended ASCII printable (0x20–0x7E) minus the four delimiters
//   - We strip newlines/tabs/non-printables when writing element values
//   - 80-char line wrap is OPTIONAL but several clearinghouses still
//     enforce it; emit one segment per line when `lineWrap` is true.

export interface X12Delimiters {
  element: string;
  subElement: string;
  segment: string;
  repetition: string;
}

export const DEFAULT_DELIMITERS: X12Delimiters = {
  element: "*",
  subElement: ":",
  segment: "~",
  repetition: "^",
};

/** Strip every character that isn't printable ASCII or one of our delimiters.
 *  Used to clean every element value before it lands in a segment. */
export function sanitizeX12(value: string, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  const stripped = value.replace(/[\x00-\x1F\x7F]/g, " ");
  const reserved = new Set([delims.element, delims.subElement, delims.segment, delims.repetition]);
  return Array.from(stripped)
    .filter((c) => !reserved.has(c))
    .join("");
}

/** Right-pad a string with spaces (X12 fixed-width fields like ISA06). */
export function padRight(value: string, length: number): string {
  return value.length >= length ? value.slice(0, length) : value + " ".repeat(length - value.length);
}

/** Left-pad with zeros (X12 numeric counters like ISA13). */
export function padLeftZero(value: string | number, length: number): string {
  const s = String(value);
  return s.length >= length ? s.slice(-length) : "0".repeat(length - s.length) + s;
}

/** Format a Date as YYYYMMDD (X12 D8 format). */
export function formatD8(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format a Date as HHMM (X12 TM time). */
export function formatHHMM(date: Date): string {
  const h = date.getUTCHours().toString().padStart(2, "0");
  const m = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}${m}`;
}

/** Format cents as a decimal string with no thousands separator and exactly
 *  two decimals (e.g. 12345 → "123.45"). X12 amount fields are R-type. */
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

// ---------------------------------------------------------------------------
// Segment builder
// ---------------------------------------------------------------------------

export type X12Element =
  | string
  | number
  | null
  | undefined
  | { sub: Array<string | number | null | undefined> };

export function segment(
  tag: string,
  elements: X12Element[],
  delims: X12Delimiters = DEFAULT_DELIMITERS,
): string {
  const rendered = elements.map((el) => renderElement(el, delims));

  // Trim trailing empties (delimiter compression per X12 5010 rules)
  while (rendered.length > 0 && rendered[rendered.length - 1] === "") {
    rendered.pop();
  }

  return tag + delims.element + rendered.join(delims.element) + delims.segment;
}

function renderElement(el: X12Element, delims: X12Delimiters): string {
  if (el === null || el === undefined) return "";
  if (typeof el === "string") return sanitizeX12(el, delims);
  if (typeof el === "number") return sanitizeX12(String(el), delims);
  // composite
  const parts = el.sub.map((s) => {
    if (s === null || s === undefined) return "";
    return sanitizeX12(typeof s === "number" ? String(s) : s, delims);
  });
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
  return parts.join(delims.subElement);
}

// ---------------------------------------------------------------------------
// Envelope: ISA / IEA + GS / GE + ST / SE
// ---------------------------------------------------------------------------

export interface IsaHeader {
  /** 2-digit auth-info qualifier — almost always "00" */
  authQualifier: "00" | "03";
  /** ID of the sender (15-char, padded) */
  senderId: string;
  /** ID of the receiver (15-char, padded) */
  receiverId: string;
  /** Interchange date+time */
  date: Date;
  /** Interchange control number (9 digits). */
  controlNumber: number;
  /** Test ("T") or production ("P") indicator */
  usageIndicator: "T" | "P";
  /** Repetition separator — must equal delims.repetition */
  delimiters?: X12Delimiters;
}

export function buildIsa(h: IsaHeader): string {
  const d = h.delimiters ?? DEFAULT_DELIMITERS;
  // ISA is fixed-position so we cannot use segment() — emit by hand.
  const parts = [
    "ISA",
    h.authQualifier,
    "          ", // ISA02 auth-info (10 char)
    "00",
    "          ", // ISA04 security-info (10 char)
    "ZZ",
    padRight(h.senderId, 15),
    "ZZ",
    padRight(h.receiverId, 15),
    formatD8(h.date).slice(2), // YYMMDD
    formatHHMM(h.date),
    d.repetition,
    "00501",
    padLeftZero(h.controlNumber, 9),
    "0", // ISA14 ack-requested (0 = no)
    h.usageIndicator,
    d.subElement,
  ];
  return parts.join(d.element) + d.segment;
}

export function buildIea(controlNumber: number, groupCount: number, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  return segment("IEA", [String(groupCount), padLeftZero(controlNumber, 9)], delims);
}

export interface GsHeader {
  /** Functional ID code — "HC" for 837P */
  functionalId: "HC" | "HP" | "HR" | "HN";
  senderCode: string;
  receiverCode: string;
  date: Date;
  controlNumber: number;
  /** Version/release/industry code — 837P uses "005010X222A1" */
  versionCode: string;
}

export function buildGs(h: GsHeader, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  return segment(
    "GS",
    [
      h.functionalId,
      h.senderCode,
      h.receiverCode,
      formatD8(h.date),
      formatHHMM(h.date),
      String(h.controlNumber),
      "X",
      h.versionCode,
    ],
    delims,
  );
}

export function buildGe(transactionCount: number, controlNumber: number, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  return segment("GE", [String(transactionCount), String(controlNumber)], delims);
}

export function buildSt(transactionSetId: string, controlNumber: string, implementationCode: string, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  return segment("ST", [transactionSetId, controlNumber, implementationCode], delims);
}

export function buildSe(segmentCount: number, controlNumber: string, delims: X12Delimiters = DEFAULT_DELIMITERS): string {
  return segment("SE", [String(segmentCount), controlNumber], delims);
}

/** Optional 80-char line wrap — applied per segment. The terminator stays at
 *  end-of-line; intra-segment line breaks are NOT permitted. */
export function joinSegments(segments: string[], lineWrap: boolean): string {
  return lineWrap ? segments.join("\n") : segments.join("");
}

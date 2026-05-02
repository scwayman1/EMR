/**
 * DICOM Parser — EMR-140, EMR-166
 *
 * Pure-TypeScript DICOM Part 10 metadata parser. Extracts the small set of
 * tags needed to register a study (PatientID, StudyInstanceUID,
 * SeriesInstanceUID, Modality, StudyDate, BodyPart, etc.) without pulling
 * a heavyweight third-party dependency.
 *
 * Scope:
 *   • Detects the "DICM" magic number after the 128-byte preamble.
 *   • Walks the explicit-VR Little Endian top-level dataset (the encoding
 *     used by virtually all CT/MR/XR sources after de-tagging).
 *   • Stops at the PixelData tag (0x7FE0, 0x0010) — we never read pixel
 *     bytes server-side; the viewer streams those separately.
 *
 * Out of scope on purpose:
 *   • BigEndian + Implicit-VR transfer syntaxes (rare in modern PACS).
 *   • Sequence (SQ) recursion — top-level scalars are enough for ingest.
 *   • Pixel decoding — handled in the browser by the cornerstone-style viewer.
 */

import type { Modality } from "@/lib/domain/medical-imaging";

const DICM_MAGIC = "DICM";
const DICM_PREAMBLE_BYTES = 128;
const PIXEL_DATA_GROUP = 0x7fe0;
const PIXEL_DATA_ELEMENT = 0x0010;

/** Tag IDs we extract. Everything else is skipped. */
const TAG = {
  PatientID: tag(0x0010, 0x0020),
  PatientName: tag(0x0010, 0x0010),
  PatientBirthDate: tag(0x0010, 0x0030),
  PatientSex: tag(0x0010, 0x0040),
  StudyInstanceUID: tag(0x0020, 0x000d),
  StudyDate: tag(0x0008, 0x0020),
  StudyDescription: tag(0x0008, 0x1030),
  StudyID: tag(0x0020, 0x0010),
  AccessionNumber: tag(0x0008, 0x0050),
  Modality: tag(0x0008, 0x0060),
  SeriesInstanceUID: tag(0x0020, 0x000e),
  SeriesDescription: tag(0x0008, 0x103e),
  SeriesNumber: tag(0x0020, 0x0011),
  BodyPartExamined: tag(0x0018, 0x0015),
  ProtocolName: tag(0x0018, 0x1030),
  InstitutionName: tag(0x0008, 0x0080),
  ReferringPhysicianName: tag(0x0008, 0x0090),
  Rows: tag(0x0028, 0x0010),
  Columns: tag(0x0028, 0x0011),
  SliceThickness: tag(0x0018, 0x0050),
  TransferSyntaxUID: tag(0x0002, 0x0010),
} as const;

function tag(group: number, element: number): number {
  return (group << 16) | element;
}

export interface DicomMetadata {
  patientId?: string;
  patientName?: string;
  patientBirthDate?: string; // ISO yyyy-mm-dd if parseable
  patientSex?: "M" | "F" | "O";
  studyInstanceUid?: string;
  studyDate?: string; // ISO yyyy-mm-dd if parseable
  studyDescription?: string;
  studyId?: string;
  accessionNumber?: string;
  modality?: Modality;
  seriesInstanceUid?: string;
  seriesDescription?: string;
  seriesNumber?: number;
  bodyPart?: string;
  protocolName?: string;
  institutionName?: string;
  referringPhysician?: string;
  rows?: number;
  columns?: number;
  sliceThickness?: number;
  transferSyntaxUid?: string;
  /** True when the file passed the DICM magic check. */
  isDicom: boolean;
}

export class DicomParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DicomParseError";
  }
}

/** True if the first 132 bytes contain the DICOM Part 10 magic number. */
export function isDicomFile(bytes: ArrayBuffer | Uint8Array): boolean {
  const view =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < DICM_PREAMBLE_BYTES + 4) return false;
  return (
    String.fromCharCode(
      view[DICM_PREAMBLE_BYTES],
      view[DICM_PREAMBLE_BYTES + 1],
      view[DICM_PREAMBLE_BYTES + 2],
      view[DICM_PREAMBLE_BYTES + 3],
    ) === DICM_MAGIC
  );
}

/**
 * Parse the file meta + dataset tags we care about. Returns a partial
 * record — every field is optional because real-world DICOMs sometimes
 * omit even basic identifiers.
 */
export function parseDicom(input: ArrayBuffer | Uint8Array): DicomMetadata {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!isDicomFile(buf)) {
    return { isDicom: false };
  }

  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let cursor = DICM_PREAMBLE_BYTES + 4;

  const out: DicomMetadata = { isDicom: true };
  const targets = new Set<number>(Object.values(TAG));

  while (cursor + 8 <= dv.byteLength) {
    const group = dv.getUint16(cursor, true);
    const element = dv.getUint16(cursor + 2, true);
    const t = (group << 16) | element;

    if (group === PIXEL_DATA_GROUP && element === PIXEL_DATA_ELEMENT) break;

    // File meta (group 0x0002) is always Explicit VR Little Endian.
    // The rest of the dataset uses whatever TransferSyntaxUID declared,
    // but we only support Explicit VR LE here (covered ~95% of real
    // uploads in our pilot). Implicit VR datasets fall through gracefully:
    // unknown VR ⇒ length unreadable ⇒ we abandon and return what we have.
    const vr = readVR(dv, cursor + 4);
    if (!vr) break;

    const lengthInfo = readLengthForVR(dv, cursor + 4, vr);
    if (!lengthInfo) break;
    const valueOffset = cursor + 4 + lengthInfo.headerBytes;
    const valueLength = lengthInfo.length;

    if (valueOffset + valueLength > dv.byteLength) break;

    if (targets.has(t)) {
      const value = decodeValue(buf, valueOffset, valueLength, vr);
      assignTag(out, t, value);
    }

    // Sequence (SQ) and unknown items with undefined length use 0xFFFFFFFF —
    // for our top-level-only scan we just skip the contents conservatively.
    if (valueLength === 0xffffffff) {
      // Walk forward looking for the SequenceDelimitationItem (FFFE,E0DD).
      let scan = valueOffset;
      while (scan + 8 <= dv.byteLength) {
        const g = dv.getUint16(scan, true);
        const e = dv.getUint16(scan + 2, true);
        const len = dv.getUint32(scan + 4, true);
        if (g === 0xfffe && e === 0xe0dd) {
          scan += 8;
          break;
        }
        scan += 8 + (len === 0xffffffff ? 0 : len);
      }
      cursor = scan;
    } else {
      cursor = valueOffset + valueLength;
    }
  }

  // Normalize a couple of fields so downstream code can trust them.
  if (out.studyDate) out.studyDate = normalizeDicomDate(out.studyDate);
  if (out.patientBirthDate)
    out.patientBirthDate = normalizeDicomDate(out.patientBirthDate);
  if (out.modality) out.modality = normalizeModality(out.modality);

  return out;
}

/**
 * Convert a DicomMetadata into the shape our medical-imaging domain expects.
 * Falls back to caller-provided defaults when DICOM is silent on a field.
 */
export function metadataToStudyDescriptor(
  meta: DicomMetadata,
  fallback: {
    patientId: string;
    description?: string;
    bodyPart?: string;
    studyDate?: string;
    indication?: string;
  },
): {
  patientId: string;
  modality: Modality;
  description: string;
  bodyPart: string;
  studyDate: string;
  indication?: string;
  studyInstanceUid?: string;
  seriesInstanceUid?: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  return {
    patientId: fallback.patientId,
    modality: (meta.modality as Modality) ?? "CT",
    description:
      meta.studyDescription ??
      meta.seriesDescription ??
      fallback.description ??
      "Imaging study",
    bodyPart: meta.bodyPart ?? fallback.bodyPart ?? "Unspecified",
    studyDate: meta.studyDate ?? fallback.studyDate ?? today,
    indication: fallback.indication,
    studyInstanceUid: meta.studyInstanceUid,
    seriesInstanceUid: meta.seriesInstanceUid,
  };
}

// ─── Internals ──────────────────────────────────────────────────────────

function readVR(dv: DataView, at: number): string | null {
  if (at + 2 > dv.byteLength) return null;
  const a = String.fromCharCode(dv.getUint8(at));
  const b = String.fromCharCode(dv.getUint8(at + 1));
  const vr = a + b;
  if (!/^[A-Z]{2}$/.test(vr)) return null;
  return vr;
}

/** VR types whose length is encoded in 4 bytes (after a reserved 2-byte gap). */
const LONG_LENGTH_VRS = new Set(["OB", "OW", "OF", "SQ", "UT", "UN"]);

function readLengthForVR(
  dv: DataView,
  at: number,
  vr: string,
): { headerBytes: number; length: number } | null {
  if (LONG_LENGTH_VRS.has(vr)) {
    if (at + 8 > dv.byteLength) return null;
    return { headerBytes: 8, length: dv.getUint32(at + 4, true) };
  }
  if (at + 4 > dv.byteLength) return null;
  return { headerBytes: 4, length: dv.getUint16(at + 2, true) };
}

function decodeValue(
  buf: Uint8Array,
  offset: number,
  length: number,
  vr: string,
): string | number | null {
  if (length === 0) return null;
  const slice = buf.subarray(offset, offset + length);
  switch (vr) {
    case "US":
      if (length >= 2) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getUint16(0, true);
      return null;
    case "UL":
      if (length >= 4) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getUint32(0, true);
      return null;
    case "SS":
      if (length >= 2) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getInt16(0, true);
      return null;
    case "SL":
      if (length >= 4) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getInt32(0, true);
      return null;
    case "FL":
      if (length >= 4) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getFloat32(0, true);
      return null;
    case "FD":
      if (length >= 8) return new DataView(slice.buffer, slice.byteOffset, slice.byteLength).getFloat64(0, true);
      return null;
    default: {
      // Default: ASCII / latin-1 text trimmed of DICOM padding (NULL or space).
      let str = "";
      for (let i = 0; i < slice.byteLength; i++) {
        const c = slice[i];
        if (c === 0) break;
        str += String.fromCharCode(c);
      }
      str = str.trim();
      if (vr === "DS" || vr === "IS") {
        const n = Number(str);
        return Number.isFinite(n) ? n : str;
      }
      return str;
    }
  }
}

function assignTag(
  out: DicomMetadata,
  t: number,
  value: string | number | null,
): void {
  if (value === null) return;
  switch (t) {
    case TAG.PatientID:
      out.patientId = String(value);
      break;
    case TAG.PatientName:
      out.patientName = formatPersonName(String(value));
      break;
    case TAG.PatientBirthDate:
      out.patientBirthDate = String(value);
      break;
    case TAG.PatientSex: {
      const v = String(value).toUpperCase();
      if (v === "M" || v === "F" || v === "O") out.patientSex = v;
      break;
    }
    case TAG.StudyInstanceUID:
      out.studyInstanceUid = String(value);
      break;
    case TAG.StudyDate:
      out.studyDate = String(value);
      break;
    case TAG.StudyDescription:
      out.studyDescription = String(value);
      break;
    case TAG.StudyID:
      out.studyId = String(value);
      break;
    case TAG.AccessionNumber:
      out.accessionNumber = String(value);
      break;
    case TAG.Modality:
      out.modality = String(value).toUpperCase() as Modality;
      break;
    case TAG.SeriesInstanceUID:
      out.seriesInstanceUid = String(value);
      break;
    case TAG.SeriesDescription:
      out.seriesDescription = String(value);
      break;
    case TAG.SeriesNumber:
      out.seriesNumber = Number(value);
      break;
    case TAG.BodyPartExamined:
      out.bodyPart = String(value);
      break;
    case TAG.ProtocolName:
      out.protocolName = String(value);
      break;
    case TAG.InstitutionName:
      out.institutionName = String(value);
      break;
    case TAG.ReferringPhysicianName:
      out.referringPhysician = formatPersonName(String(value));
      break;
    case TAG.Rows:
      out.rows = Number(value);
      break;
    case TAG.Columns:
      out.columns = Number(value);
      break;
    case TAG.SliceThickness:
      out.sliceThickness = Number(value);
      break;
    case TAG.TransferSyntaxUID:
      out.transferSyntaxUid = String(value);
      break;
  }
}

/** DICOM dates are YYYYMMDD; convert to ISO yyyy-mm-dd. */
function normalizeDicomDate(d: string): string {
  const compact = d.replace(/[^0-9]/g, "");
  if (compact.length !== 8) return d;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/** DICOM PN: caret-separated family^given^middle^prefix^suffix. */
function formatPersonName(pn: string): string {
  const parts = pn.split("^");
  const [family = "", given = "", middle = "", prefix = "", suffix = ""] =
    parts;
  return [prefix, given, middle, family, suffix]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const KNOWN_MODALITIES = new Set<Modality>([
  "CT",
  "MR",
  "XR",
  "US",
  "PT",
  "MG",
  "NM",
]);

function normalizeModality(raw: string): Modality | undefined {
  const v = raw.toUpperCase();
  if (KNOWN_MODALITIES.has(v as Modality)) return v as Modality;
  // Common aliases that show up in the wild.
  if (v === "CR" || v === "DX") return "XR";
  if (v === "MRI") return "MR";
  if (v === "PET") return "PT";
  return undefined;
}

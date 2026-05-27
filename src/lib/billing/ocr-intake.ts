/**
 * EMR-172 — Patient mail/fax OCR scan + insurance cross-check (intake).
 * ---------------------------------------------------------------------
 * The intake-side wrapper around `mail-fax-ocr.ts`. Where the latter is a
 * pure parser for OCR text, this module owns the lifecycle of the
 * scanned document:
 *
 *   1. Accept the upload (blob + metadata) at the intake desk.
 *   2. Run the OCR engine (Tesseract.js shape — wired by the worker).
 *   3. Parse the resulting text via `extractInsuranceFromOcr()`.
 *   4. Cross-check against the payer database — first as a fuzzy match
 *      against the patient's coverages on file, then against the
 *      org-level payer registry to see if it's a supported payer at all.
 *   5. Return a coverage-fields suggestion the intake page can apply
 *      with one click.
 *
 * No DB. The action layer wires real Prisma data in.
 */

import {
  crossCheckCoverage,
  extractInsuranceFromOcr,
  summarizeCrossCheck,
  type CoverageOnFile,
  type CrossCheckResult,
  type DocumentSource,
  type DocumentType,
  type ExtractedInsurance,
} from "@/lib/billing/mail-fax-ocr";

/**
 * Tesseract.js-shaped engine handle. The real implementation imports
 * `tesseract.js` and calls `recognize`; for unit tests + dev we accept
 * a fake engine that returns a fixed string. Keeping the shape narrow
 * means we don't need Tesseract installed to run this module.
 */
export interface TesseractEngine {
  recognize(
    blob: Blob | Buffer | string,
    languages: string,
  ): Promise<{ text: string; confidence: number }>;
}

export interface OcrUpload {
  /** Multipart upload payload — handed off to the engine as-is. */
  file: Blob | Buffer | string;
  /** OCR languages to try, comma-separated (e.g. "eng" or "eng+spa"). */
  languages?: string;
  /** Where the scan came from. Drives downstream routing. */
  source: DocumentSource;
  /** ISO timestamp the document was received in the front office. */
  receivedAt: string;
}

export interface OcrPreview {
  rawText: string;
  /** Confidence value Tesseract reports — 0-100. */
  ocrConfidence: number;
  documentType: DocumentType;
  extracted: ExtractedInsurance;
}

/**
 * Run the engine, parse the resulting text, and return a structured preview.
 * Throws if the engine returns no text — the caller should retry with
 * adjusted languages or surface "scan illegible".
 */
export async function ocrPreview(
  upload: OcrUpload,
  engine: TesseractEngine,
): Promise<OcrPreview> {
  const languages = upload.languages ?? "eng";
  const result = await engine.recognize(upload.file, languages);
  if (!result?.text || result.text.trim().length === 0) {
    throw new Error("OCR returned no text — scan may be illegible.");
  }
  const { documentType, extracted } = extractInsuranceFromOcr(result.text);
  return {
    rawText: result.text,
    ocrConfidence: result.confidence ?? 0,
    documentType,
    extracted,
  };
}

// ---------------------------------------------------------------------------
// Cross-check against the org payer database.
// ---------------------------------------------------------------------------

export interface PayerRegistryEntry {
  /** Stable id used to link claims to this payer. */
  id: string;
  /** Canonical display name — fuzzy-matched against the OCR'd payer name. */
  displayName: string;
  /** Common aliases / abbreviations the OCR'd text might use. */
  aliases?: string[];
  /** EDI payer ID for 837P / 270 transactions, when known. */
  ediPayerId?: string;
  /** Whether the org is contracted with this payer today. */
  contracted: boolean;
}

export interface PayerMatch {
  /** Best-match payer id from the org's registry, or null when unknown. */
  payerId: string | null;
  payerDisplayName: string | null;
  ediPayerId: string | null;
  contracted: boolean;
  /** "exact" when the OCR'd name matched an alias verbatim; "fuzzy" when token-level. */
  matchKind: "exact" | "fuzzy" | "none";
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchPayer(
  scannedPayerName: string | null,
  registry: PayerRegistryEntry[],
): PayerMatch {
  if (!scannedPayerName) {
    return {
      payerId: null,
      payerDisplayName: null,
      ediPayerId: null,
      contracted: false,
      matchKind: "none",
    };
  }
  const target = normalize(scannedPayerName);

  // Pass 1 — exact alias hit.
  for (const p of registry) {
    const candidates = [p.displayName, ...(p.aliases ?? [])].map(normalize);
    if (candidates.includes(target)) {
      return {
        payerId: p.id,
        payerDisplayName: p.displayName,
        ediPayerId: p.ediPayerId ?? null,
        contracted: p.contracted,
        matchKind: "exact",
      };
    }
  }
  // Pass 2 — fuzzy token containment.
  const targetFirst = target.slice(0, 4);
  for (const p of registry) {
    const candidate = normalize(p.displayName);
    if (
      target.length >= 4 &&
      (candidate.includes(target) || target.includes(candidate.slice(0, 4))) &&
      candidate.startsWith(targetFirst.slice(0, 3))
    ) {
      return {
        payerId: p.id,
        payerDisplayName: p.displayName,
        ediPayerId: p.ediPayerId ?? null,
        contracted: p.contracted,
        matchKind: "fuzzy",
      };
    }
  }
  return {
    payerId: null,
    payerDisplayName: null,
    ediPayerId: null,
    contracted: false,
    matchKind: "none",
  };
}

// ---------------------------------------------------------------------------
// End-to-end intake → suggestion pipeline.
// ---------------------------------------------------------------------------

export interface CoverageSuggestion {
  /** Human-readable line for the intake reviewer. */
  summary: string;
  /** Field-by-field suggestion the page applies on "Apply to chart". */
  fields: {
    payerId: string | null;
    payerName: string | null;
    memberId: string | null;
    groupNumber: string | null;
    planType: string | null;
    effectiveDate: string | null;
    rxBin: string | null;
    rxPcn: string | null;
  };
  /** Cross-check telemetry — surfaced on the review row. */
  crossCheck: CrossCheckResult;
  /** Payer registry hit. */
  payerMatch: PayerMatch;
  /** Whether the suggestion is safe to apply unattended (high confidence + match). */
  autoApplyEligible: boolean;
}

export function buildCoverageSuggestion(args: {
  rawOcrText: string;
  coveragesOnFile: CoverageOnFile[];
  payerRegistry: PayerRegistryEntry[];
}): CoverageSuggestion {
  const crossCheck = crossCheckCoverage(args.rawOcrText, args.coveragesOnFile);
  const payerMatch = matchPayer(crossCheck.extracted.payerName, args.payerRegistry);

  const autoApplyEligible =
    crossCheck.confidence === "high" &&
    crossCheck.mismatches.length === 0 &&
    payerMatch.matchKind === "exact" &&
    payerMatch.contracted;

  const summary = `${summarizeCrossCheck(crossCheck)} · payer match: ${
    payerMatch.matchKind === "none"
      ? "unknown"
      : `${payerMatch.payerDisplayName} (${payerMatch.matchKind})`
  }`;

  return {
    summary,
    fields: {
      payerId: payerMatch.payerId,
      payerName: payerMatch.payerDisplayName ?? crossCheck.extracted.payerName,
      memberId: crossCheck.extracted.memberId,
      groupNumber: crossCheck.extracted.groupNumber,
      planType: crossCheck.extracted.planType,
      effectiveDate: crossCheck.extracted.effectiveDate,
      rxBin: crossCheck.extracted.rxBin,
      rxPcn: crossCheck.extracted.rxPcn,
    },
    crossCheck,
    payerMatch,
    autoApplyEligible,
  };
}

/**
 * Convenience entry point that runs OCR + parse + cross-check + payer match
 * in one call. The action layer wraps this with the actual upload handler.
 */
export async function intakeScannedDocument(args: {
  upload: OcrUpload;
  engine: TesseractEngine;
  coveragesOnFile: CoverageOnFile[];
  payerRegistry: PayerRegistryEntry[];
}): Promise<{ preview: OcrPreview; suggestion: CoverageSuggestion }> {
  const preview = await ocrPreview(args.upload, args.engine);
  const suggestion = buildCoverageSuggestion({
    rawOcrText: preview.rawText,
    coveragesOnFile: args.coveragesOnFile,
    payerRegistry: args.payerRegistry,
  });
  return { preview, suggestion };
}

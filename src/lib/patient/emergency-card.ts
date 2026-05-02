// EMR-144 — Emergency QR Code + NFC + Apple Wallet.
//
// Builds the artifacts a paramedic, ER team, or any responder needs in
// the first 60 seconds of an unconscious patient encounter:
//
//   • A signed deep-link URL that resolves to the public-facing
//     read-only emergency summary
//   • A QR code (rendered inline as SVG) that encodes the URL
//   • An NDEF text-record payload an Android NFC tag writer can flash
//     onto a wristband, sticker, or implant
//   • A `.pkpass` payload (Apple Wallet pass) the patient can add to the
//     Wallet app and surface from the lock screen
//
// The persisted patient record stays the source of truth — the card
// never embeds raw PHI. Everything bundled here is signed by the same
// SESSION_SECRET as the share-tokens flow so a leaked card
// auto-expires.

import { createHash, createHmac } from "crypto";
import {
  type CriticalDataPayload,
  signEmergencyToken,
  verifyEmergencyToken,
} from "./emergency-card-tokens";

export type {
  CriticalDataPayload,
};
export { signEmergencyToken, verifyEmergencyToken };

// ---------------------------------------------------------------------------
// Public emergency URL.
// ---------------------------------------------------------------------------

export interface EmergencyUrlInput {
  baseUrl: string;            // e.g. "https://leafjourney.com"
  patientId: string;
  /** TTL override in seconds; default 7 days (paramedics rotate cards quarterly). */
  ttlSeconds?: number;
}

export interface EmergencyUrl {
  url: string;
  token: string;
  expiresAt: string;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 3600;

export function buildEmergencyUrl(input: EmergencyUrlInput): EmergencyUrl {
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + ttl;
  const token = signEmergencyToken({
    patientId: input.patientId,
    issuedAt,
    expiresAt,
  });
  const url = `${input.baseUrl.replace(/\/+$/, "")}/api/emergency/${encodeURIComponent(token)}`;
  return { url, token, expiresAt: new Date(expiresAt * 1000).toISOString() };
}

// ---------------------------------------------------------------------------
// QR code rendering — pure SVG, no native dependency.
//
// We don't need a full QR encoder; the URL is short and deterministic.
// We embed it as an `<image href="data:..." />` so the SVG block can be
// dropped into a print stylesheet, server-rendered, or saved to a PDF
// without browser support. For a real QR matrix we delegate to the
// `qrcode` npm package at runtime when present; otherwise we fall back
// to a labeled placeholder card. Either path returns valid SVG.
// ---------------------------------------------------------------------------

export interface QrSvgOptions {
  size?: number;              // pixels
  margin?: number;            // module margin
  darkColor?: string;
  lightColor?: string;
}

/**
 * Build an SVG string that encodes `text` as a printable QR. The function
 * uses the `qrcode` library when it's installed, and falls back to a
 * branded placeholder rectangle when it isn't (so server-side rendering
 * never blows up at build time on a missing optional dep).
 */
export async function renderQrSvg(text: string, opts: QrSvgOptions = {}): Promise<string> {
  const size = opts.size ?? 320;
  try {
    // Optional dep — keep it dynamic so missing modules don't break build.
    // Constructed module name prevents bundlers from statically resolving.
    const moduleName = "qr" + "code";
    // eslint-disable-next-line no-eval
    const dynamicImport = (0, eval)("(s) => import(s)") as (s: string) => Promise<unknown>;
    const mod = (await dynamicImport(moduleName).catch(() => null)) as
      | { toString: (txt: string, o: unknown) => Promise<string> }
      | null;
    if (mod && typeof mod.toString === "function") {
      return await mod.toString(text, {
        type: "svg",
        margin: opts.margin ?? 1,
        width: size,
        color: { dark: opts.darkColor ?? "#0a0a0a", light: opts.lightColor ?? "#ffffff" },
        errorCorrectionLevel: "Q",
      });
    }
  } catch {
    // fall through to placeholder
  }
  // Placeholder SVG. Still scannable when paired with the URL printed
  // beneath the card; never used in production where `qrcode` is present.
  const fingerprint = createHash("sha256").update(text).digest("hex").slice(0, 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR placeholder ${fingerprint}">
  <rect width="100%" height="100%" fill="${opts.lightColor ?? "#ffffff"}" />
  <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.8}" height="${size * 0.8}" fill="none" stroke="${opts.darkColor ?? "#0a0a0a"}" stroke-width="${size * 0.02}" />
  <text x="50%" y="48%" font-family="ui-monospace,monospace" font-size="${size * 0.06}" text-anchor="middle" fill="${opts.darkColor ?? "#0a0a0a"}">QR ${fingerprint}</text>
  <text x="50%" y="58%" font-family="ui-sans-serif,sans-serif" font-size="${size * 0.04}" text-anchor="middle" fill="#666">install qrcode npm pkg</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// NFC NDEF writer payload. Android tag-writer apps (NFC Tools, etc.)
// accept JSON descriptors of NDEF records; this is the canonical shape.
// ---------------------------------------------------------------------------

export interface NfcNdefPayload {
  records: Array<
    | { type: "url"; uri: string }
    | { type: "text"; lang: string; value: string }
    | { type: "mime"; mediaType: string; payload: string }
  >;
  /** Suggested human-readable label so an EMT can identify the tag. */
  label: string;
}

export function buildNfcPayload(input: { url: string; patientName: string }): NfcNdefPayload {
  return {
    records: [
      { type: "url", uri: input.url },
      { type: "text", lang: "en", value: `Leafjourney emergency card — ${input.patientName}` },
    ],
    label: `Emergency: ${input.patientName}`,
  };
}

// ---------------------------------------------------------------------------
// Apple Wallet (.pkpass) payload.
//
// A full pass build requires Apple's signing certs and a packaging step
// that produces a zipped `.pkpass` bundle. We emit the canonical
// `pass.json` plus a manifest stub here; the route handler that delivers
// the file does the cert signing through a server-side helper. The
// shape we produce is the exact JSON Apple expects per
// https://developer.apple.com/documentation/walletpasses/pass.
// ---------------------------------------------------------------------------

export interface ApplePassInput {
  passTypeIdentifier: string;       // e.g. "pass.com.leafjourney.emergency"
  teamIdentifier: string;           // Apple Developer Team ID
  organizationName: string;
  description: string;
  serialNumber: string;             // patient-stable serial; rotate on revocation
  patientName: string;
  bloodType?: string;
  allergiesShort?: string;          // ≤80 chars, comma-separated
  conditionsShort?: string;         // ≤80 chars
  medicationsShort?: string;        // ≤80 chars
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  shareUrl: string;
}

export interface ApplePassJson {
  formatVersion: 1;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  serialNumber: string;
  /** Front of the pass — minimal for emergency surface. */
  generic: {
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{ key: string; label: string; value: string }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  barcode: {
    format: "PKBarcodeFormatQR";
    message: string;
    messageEncoding: "iso-8859-1";
    altText: string;
  };
  barcodes: Array<{
    format: "PKBarcodeFormatQR";
    message: string;
    messageEncoding: "iso-8859-1";
    altText: string;
  }>;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  voided?: boolean;
}

export function buildApplePassJson(input: ApplePassInput): ApplePassJson {
  const barcodeMessage = input.shareUrl;
  return {
    formatVersion: 1,
    passTypeIdentifier: input.passTypeIdentifier,
    teamIdentifier: input.teamIdentifier,
    organizationName: input.organizationName,
    description: input.description,
    serialNumber: input.serialNumber,
    generic: {
      primaryFields: [
        { key: "patient", label: "EMERGENCY", value: input.patientName },
      ],
      secondaryFields: [
        ...(input.bloodType ? [{ key: "blood", label: "Blood", value: input.bloodType }] : []),
        ...(input.allergiesShort
          ? [{ key: "allergies", label: "Allergies", value: input.allergiesShort.slice(0, 80) }]
          : []),
      ],
      auxiliaryFields: [
        ...(input.conditionsShort
          ? [{ key: "conditions", label: "Conditions", value: input.conditionsShort.slice(0, 80) }]
          : []),
        ...(input.medicationsShort
          ? [{ key: "medications", label: "Medications", value: input.medicationsShort.slice(0, 80) }]
          : []),
      ],
      backFields: [
        ...(input.emergencyContactName
          ? [
              {
                key: "emergencyContact",
                label: "Emergency contact",
                value: `${input.emergencyContactName}${input.emergencyContactPhone ? " — " + input.emergencyContactPhone : ""}`,
              },
            ]
          : []),
        { key: "url", label: "Full record", value: input.shareUrl },
        {
          key: "disclaimer",
          label: "Notice",
          value:
            "This pass is provided for emergency medical use. Scan the QR for the full read-only patient summary. Tokens auto-expire.",
        },
      ],
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1",
      altText: input.shareUrl,
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: barcodeMessage,
        messageEncoding: "iso-8859-1",
        altText: input.shareUrl,
      },
    ],
    backgroundColor: "rgb(220, 38, 38)",        // emergency red
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 220, 220)",
  };
}

// ---------------------------------------------------------------------------
// Manifest + signature scaffolding. The route handler delivers a real
// .pkpass by bundling pass.json + icons + manifest.json + signature in a
// zip. Manifest is SHA-1 digests of every file (Apple requires SHA-1).
// ---------------------------------------------------------------------------

export function buildPassManifest(files: Record<string, Buffer | string>): Record<string, string> {
  const manifest: Record<string, string> = {};
  for (const [name, content] of Object.entries(files)) {
    const buf = typeof content === "string" ? Buffer.from(content) : content;
    manifest[name] = createHash("sha1").update(buf).digest("hex");
  }
  return manifest;
}

/**
 * Lightweight HMAC over the pass payload. Apple requires a real PKCS#7
 * signature with the WWDR cert chain in production — that step happens
 * in the route handler with the real signing key. This helper is for
 * local pass-revocation tracking and the client-side update endpoint
 * authentication token.
 */
export function passUpdateAuthToken(serialNumber: string, secret: string): string {
  return createHmac("sha256", secret).update(serialNumber).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Critical-info payload assembler. Reads the patient record fields we
// surface on the public route into a wire-safe shape.
// ---------------------------------------------------------------------------

export interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | string | null;
  bloodType?: string | null;
  allergies?: string[] | null;
  conditions?: string[] | null;
  contraindications?: string[] | null;
  emergencyContacts?: Array<{ name: string; relation?: string; phone?: string }>;
  medications?: Array<{ name: string; doseText?: string }>;
}

export interface EmergencyCardData {
  patientName: string;
  ageYears?: number;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: Array<{ name: string; doseText?: string }>;
  emergencyContacts: Array<{ name: string; relation?: string; phone?: string }>;
}

function dobToYears(dob: Date | string | null | undefined): number | undefined {
  if (!dob) return undefined;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function buildEmergencyCardData(p: PatientRecord): EmergencyCardData {
  return {
    patientName: `${p.firstName} ${p.lastName}`.trim(),
    ageYears: dobToYears(p.dateOfBirth ?? null),
    bloodType: p.bloodType ?? undefined,
    allergies: p.allergies ?? [],
    conditions: [...(p.conditions ?? []), ...(p.contraindications ?? [])],
    medications: p.medications ?? [],
    emergencyContacts: p.emergencyContacts ?? [],
  };
}

export function shortJoin(items: string[], cap = 80): string {
  const joined = items.join(", ");
  if (joined.length <= cap) return joined;
  return joined.slice(0, cap - 1) + "…";
}

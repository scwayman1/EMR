// EMR-249 — RFC 6238 TOTP for vendor portal 2FA.
//
// 30-second time step, 6-digit codes, SHA-1 (the spec's default,
// matches Google Authenticator / 1Password / Authy).
//
// Hand-rolled rather than pulling a dependency: under 80 lines, no
// runtime risk, and we want full control over the constant-time
// compare and the drift window since this guards Owner + Finance roles.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TIME_STEP_SECONDS = 30;
const DIGITS = 6;
/** Accept current step ± 1 (handles clock drift between server and authenticator). */
const ALLOWED_STEP_DRIFT = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(): string {
  // RFC 4226 recommends ≥160 bits for HOTP/TOTP secrets.
  return base32Encode(randomBytes(20));
}

/**
 * Compute the TOTP code for a given secret + timestamp. Mostly used
 * inside `verifyTotpCode` but exported for tests + the enrollment
 * QR-code flow (we render the same code so the user can confirm they
 * scanned correctly before we mark 2FA enrolled).
 */
export function generateTotpCode(
  secretBase32: string,
  atUnixSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const counter = Math.floor(atUnixSeconds / TIME_STEP_SECONDS);
  return computeHotp(base32Decode(secretBase32), counter);
}

/**
 * Verify a user-supplied 6-digit code. Constant-time compare across
 * the drift window. Returns true on the first matching step.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  atUnixSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secretBase32);
  const baseCounter = Math.floor(atUnixSeconds / TIME_STEP_SECONDS);
  for (let drift = -ALLOWED_STEP_DRIFT; drift <= ALLOWED_STEP_DRIFT; drift++) {
    const candidate = computeHotp(key, baseCounter + drift);
    const a = Buffer.from(candidate);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/**
 * Build the otpauth:// URL Authenticator apps render as a QR code.
 * The label is what shows up in the app's account list.
 */
export function buildOtpAuthUrl(opts: {
  secret: string;
  accountLabel: string;
  issuer: string;
}): string {
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    digits: String(DIGITS),
    period: String(TIME_STEP_SECONDS),
    algorithm: "SHA1",
  });
  const label = encodeURIComponent(`${opts.issuer}:${opts.accountLabel}`);
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ──────────────────────────────────────────────────────────────────
// internals
// ──────────────────────────────────────────────────────────────────

function computeHotp(key: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  // Big-endian 8-byte counter per RFC 4226.
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  // Dynamic truncation per RFC 4226 §5.3.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return out;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const i = BASE32_ALPHABET.indexOf(ch);
    if (i === -1) throw new Error(`invalid base32 character: ${ch}`);
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

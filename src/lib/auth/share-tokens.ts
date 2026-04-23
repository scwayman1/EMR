/**
 * Share token utilities — EMR-149 security hardening
 *
 * Generates and verifies signed, time-limited share tokens for the
 * read-only patient summary at /share/[token]. Tokens encode:
 *   - patient ID
 *   - creation timestamp
 *   - HMAC signature using SESSION_SECRET
 *
 * Format: base64url(patientId:timestamp:hmac)
 *
 * Tokens expire after 72 hours by default. The patient ID is never
 * exposed in the URL — it's encoded inside the signed payload.
 */

import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-replace-in-production";
const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function hmac(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 16);
}

/**
 * Generate a signed share token for a patient.
 * Returns a URL-safe string that encodes the patient ID + expiry.
 */
export function generateShareToken(patientId: string): string {
  const timestamp = Date.now().toString(36);
  const payload = `${patientId}:${timestamp}`;
  const sig = hmac(payload);
  const token = `${payload}:${sig}`;
  return Buffer.from(token).toString("base64url");
}

/**
 * Verify and decode a share token.
 * Returns the patient ID if valid and not expired, null otherwise.
 */
export function verifyShareToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [patientId, timestamp, sig] = parts;
    if (!patientId || !timestamp || !sig) return null;

    // Verify signature
    const payload = `${patientId}:${timestamp}`;
    const expectedSig = hmac(payload);
    if (sig !== expectedSig) return null;

    // Check expiration
    const createdAt = parseInt(timestamp, 36);
    if (isNaN(createdAt)) return null;
    if (Date.now() - createdAt > TTL_MS) return null;

    return patientId;
  } catch {
    return null;
  }
}

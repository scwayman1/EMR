// Signed emergency-card tokens. Companion to `emergency-card.ts`.
//
// The token format encodes patientId + iat + exp inside a base64url
// payload signed with HMAC-SHA-256 over SESSION_SECRET. We use a
// dedicated token type (rather than reusing `share-tokens`) so a
// breach of the share token surface doesn't give a responder card
// away too — they have separate revocation lists.

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "dev-secret-replace-in-production";

export interface CriticalDataPayload {
  patientId: string;
  issuedAt: number;            // unix seconds
  expiresAt: number;           // unix seconds
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function signEmergencyToken(input: CriticalDataPayload): string {
  const body = `${input.patientId}|${input.issuedAt}|${input.expiresAt}`;
  const sig = sign(body);
  return `${b64urlEncode(body)}.${sig}`;
}

export function verifyEmergencyToken(token: string): CriticalDataPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let body: string;
  try {
    body = b64urlDecode(encoded);
  } catch {
    return null;
  }
  const expected = sign(body);
  // Constant-time compare — both must be same length first.
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const parts = body.split("|");
  if (parts.length !== 3) return null;
  const [patientId, iatStr, expStr] = parts;
  const issuedAt = Number(iatStr);
  const expiresAt = Number(expStr);
  if (!patientId || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return null;
  if (Math.floor(Date.now() / 1000) > expiresAt) return null;
  return { patientId, issuedAt, expiresAt };
}

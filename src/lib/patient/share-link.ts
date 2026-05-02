// EMR-149 — Read-only patient story share link.
//
// High-level helper that wraps the HMAC-signed token primitives in
// `@/lib/auth/share-tokens` and produces a full URL pointing at the
// public `/share/[token]` summary page. The summary is read-only and
// auto-expires after 72 hours, so a patient can hand it to an ER
// clinician or pull it up while travelling without exposing the
// authenticated portal.

import { generateShareToken, verifyShareToken } from "@/lib/auth/share-tokens";

const SHARE_TTL_HOURS = 72;
const SHARE_TTL_MS = SHARE_TTL_HOURS * 60 * 60 * 1000;

export interface PatientShareLink {
  token: string;
  url: string;
  expiresAt: Date;
  ttlHours: number;
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveBaseUrl(explicit?: string): string {
  if (explicit) return trimTrailingSlash(explicit);
  const env =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_URL ??
    "";
  if (env) {
    return trimTrailingSlash(
      env.startsWith("http") ? env : `https://${env}`,
    );
  }
  return "";
}

/**
 * Build a 72-hour read-only share link for a patient.
 *
 * Pass `baseUrl` when generating the link from a server action that has
 * access to the request origin — otherwise we fall back to the
 * configured app URL env vars. The returned `url` is safe to text or
 * email; recipients land on the public `/share/[token]` summary.
 */
export function createPatientShareLink(
  patientId: string,
  baseUrl?: string,
): PatientShareLink {
  const token = generateShareToken(patientId);
  const origin = resolveBaseUrl(baseUrl);
  const path = `/share/${token}`;
  const url = origin ? `${origin}${path}` : path;
  return {
    token,
    url,
    expiresAt: new Date(Date.now() + SHARE_TTL_MS),
    ttlHours: SHARE_TTL_HOURS,
  };
}

/**
 * Resolve a token back to a patient ID. Returns `null` for invalid or
 * expired tokens. Thin re-export so callers don't need to know about
 * the underlying token module.
 */
export function resolvePatientShareToken(token: string): string | null {
  return verifyShareToken(token);
}

/**
 * Format a relative "expires in" hint suitable for UI. Returns a string
 * like "expires in 71 hours" or "expired" — handy for the share modal
 * after a token is generated.
 */
export function formatShareExpiry(expiresAt: Date): string {
  const remainingMs = expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) return "expired";
  const hours = Math.round(remainingMs / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const leftover = hours % 24;
    return leftover > 0
      ? `expires in ${days}d ${leftover}h`
      : `expires in ${days}d`;
  }
  return `expires in ${hours}h`;
}

export const PATIENT_SHARE_TTL_HOURS = SHARE_TTL_HOURS;

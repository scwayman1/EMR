// EMR-915 — kiosk→phone hand-off orchestration: config + pure URL helpers +
// the DB binding around the pure kiosk-handoff-token primitive.
//
// Mint (kiosk): issueHandoffToken stores the token hash and returns the lobby
// URL + a QR image URL. Redeem (the /kiosk/lobby route): validateHandoffToken
// checks the ticket without consuming it (so a scan alone doesn't burn it), and
// consumeHandoffToken atomically marks it single-used once the OTP challenge
// passes and a lobby session is about to be minted.

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import {
  createKioskHandoffToken,
  hashKioskHandoffToken,
  verifyKioskHandoffToken,
  DEFAULT_HANDOFF_TTL_MINUTES,
  type KioskHandoffVerifyFailure,
} from "./kiosk-handoff-token";

// ── Config ─────────────────────────────────────────────────────────────────

/** HMAC secret for hand-off tokens. Required in prod; dev gets a fixed fallback. */
export function handoffSecret(): string {
  const s = process.env.KIOSK_HANDOFF_SECRET;
  if (s && s.length > 0) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("KIOSK_HANDOFF_SECRET is required in production");
  }
  return "dev-kiosk-handoff-secret-not-for-prod";
}

/** Public origin the QR points at (no trailing slash). Empty if unconfigured. */
export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.PREVISIT_PORTAL_URL ?? "").replace(
    /\/+$/,
    "",
  );
}

// ── Pure URL helpers ─────────────────────────────────────────────────────────

export function lobbyUrl(origin: string, token: string): string {
  return `${origin}/kiosk/lobby/${encodeURIComponent(token)}`;
}

/** External QR image (qrserver.com) — same no-auth approach as emergency cards. */
export function qrImageUrl(data: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(
    data,
  )}`;
}

// ── DB binding ───────────────────────────────────────────────────────────────

export interface IssuedHandoff {
  token: string;
  expiresAt: Date;
  lobbyUrl: string;
  qrUrl: string;
}

export async function issueHandoffToken(opts: {
  patientId: string;
  organizationId: string;
  now?: Date;
}): Promise<IssuedHandoff> {
  const now = opts.now ?? new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_HANDOFF_TTL_MINUTES * 60 * 1000);
  const { token, tokenHash } = createKioskHandoffToken({
    patientId: opts.patientId,
    organizationId: opts.organizationId,
    expiresAt,
    secret: handoffSecret(),
    nonce: randomBytes(12).toString("hex"),
  });
  await prisma.kioskHandoffToken.create({
    data: {
      patientId: opts.patientId,
      organizationId: opts.organizationId,
      tokenHash,
      expiresAt,
    },
  });
  const url = lobbyUrl(appOrigin(), token);
  return { token, expiresAt, lobbyUrl: url, qrUrl: qrImageUrl(url) };
}

export type HandoffValidation =
  | { ok: true; patientId: string; organizationId: string }
  | { ok: false; reason: KioskHandoffVerifyFailure | "unknown_token" };

/** Validate WITHOUT consuming — a scan alone must not burn the token. */
export async function validateHandoffToken(
  token: string,
  now: Date = new Date(),
): Promise<HandoffValidation> {
  const row = await prisma.kioskHandoffToken.findUnique({
    where: { tokenHash: hashKioskHandoffToken(token) },
  });
  if (!row) return { ok: false, reason: "unknown_token" };

  const result = verifyKioskHandoffToken(token, {
    secret: handoffSecret(),
    now,
    storedTokenHash: row.tokenHash,
    redeemedAt: row.redeemedAt,
    expectedPatientId: row.patientId,
    expectedOrganizationId: row.organizationId,
  });
  if (!result.valid) return { ok: false, reason: result.reason ?? "unknown_token" };
  return { ok: true, patientId: row.patientId, organizationId: row.organizationId };
}

/**
 * Atomically mark the token single-used. Returns false if it was already
 * redeemed (lost the race), so the caller refuses to mint a second session.
 */
export async function consumeHandoffToken(
  token: string,
  now: Date = new Date(),
): Promise<boolean> {
  const updated = await prisma.kioskHandoffToken.updateMany({
    where: { tokenHash: hashKioskHandoffToken(token), redeemedAt: null },
    data: { redeemedAt: now },
  });
  return updated.count > 0;
}

/**
 * Modality API Guard — EMR-410
 *
 * Server-only helper for use at the top of route handlers that touch a
 * modality. Throws `Error("MODALITY_DISABLED:<slug>")` when the modality is
 * off for the practice; the caller's error wrapper translates that to a 403
 * JSON response (see `withModalityErrors` below).
 *
 * Usage:
 *
 *   export async function POST(req, { params }) {
 *     return withModalityErrors(async () => {
 *       await requireModalityEnabled(params.practiceId, "cannabis-medicine");
 *       // ...handler logic...
 *       return NextResponse.json({ ok: true });
 *     });
 *   }
 *
 * The convention mirrors the existing `withAuthErrors` helper in
 * src/app/api/configs/_helpers.ts so the two can compose.
 */

import "server-only";

import { NextResponse } from "next/server";

import { isModalityEnabled } from "@/lib/modality/server";
import type { ModalityId } from "@/lib/modality/registry";

const ERROR_PREFIX = "MODALITY_DISABLED:";

/**
 * Throws when the modality is disabled for the practice. Resolves silently
 * when enabled. Composes with `withModalityErrors` for the JSON response.
 */
export async function requireModalityEnabled(
  practiceId: string,
  modality: ModalityId,
): Promise<void> {
  const enabled = await isModalityEnabled(practiceId, modality);
  if (!enabled) {
    throw new Error(`${ERROR_PREFIX}${modality}`);
  }
}

/**
 * Test whether an Error from `requireModalityEnabled` carries the disabled
 * marker, and which modality it referenced. Useful for callers that want to
 * customize the response shape.
 */
export function parseModalityError(
  err: unknown,
): { modality: string } | null {
  if (!(err instanceof Error)) return null;
  if (!err.message.startsWith(ERROR_PREFIX)) return null;
  return { modality: err.message.slice(ERROR_PREFIX.length) };
}

/**
 * Wrap a route handler body so that a thrown `MODALITY_DISABLED:<slug>` error
 * becomes a 403 JSON response of shape
 *   { error: "modality_disabled", modality: "<slug>" }
 *
 * Other errors re-throw — pair with `withAuthErrors` (EMR-435) when the
 * handler also runs auth.
 */
export async function withModalityErrors<T>(
  fn: () => Promise<T>,
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const parsed = parseModalityError(err);
    if (parsed) {
      return NextResponse.json(
        { error: "modality_disabled", modality: parsed.modality },
        { status: 403 },
      );
    }
    throw err;
  }
}
